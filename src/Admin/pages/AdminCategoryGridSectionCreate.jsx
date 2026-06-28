import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";
import { flattenCategories } from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const defaultForm = {
  title: "",
  subtitle: "",
  displayOrder: 0,
  isActive: true,
};

const normalizeSection = (payload) => {
  const root = payload?.data ?? payload;
  if (!root || typeof root !== "object") return null;
  return root.section ?? root;
};

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const getCategoryLabel = (category) => {
  const label = String(category?._uiPathLabel || category?.categoryPathLabel || "").trim();
  const name = String(category?.name || category?.title || category?.label || "").trim();
  const id = getCategoryId(category);
  if (label) return label;
  if (name) return name;
  return id || "Unnamed category";
};

const AdminCategoryGridSectionCreate = () => {
  const navigate = useNavigate();
  const { sectionId: editRouteSectionId = "" } = useParams();
  const sectionId = String(editRouteSectionId || "").trim();
  const isEdit = Boolean(sectionId);

  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [form, setForm] = useState(defaultForm);
  const [section, setSection] = useState(null);
  const [loadingSection, setLoadingSection] = useState(isEdit);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [markedForRemoval, setMarkedForRemoval] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categorySearchInput, setCategorySearchInput] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const existingCategoryIds = useMemo(
    () => (Array.isArray(section?.categoryIds) ? section.categoryIds.map((id) => String(id)) : []),
    [section],
  );
  const existingCategorySet = useMemo(() => new Set(existingCategoryIds), [existingCategoryIds]);
  const activeCategoryIds = useMemo(
    () => existingCategoryIds.filter((id) => !markedForRemoval.includes(id)),
    [existingCategoryIds, markedForRemoval],
  );
  const availableOptions = useMemo(
    () => categoryOptions.filter((category) => !existingCategorySet.has(getCategoryId(category))),
    [categoryOptions, existingCategorySet],
  );

  const loadSection = useCallback(async () => {
    if (!sectionId) return;
    setLoadingSection(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get(`/admin/sections/${encodeURIComponent(sectionId)}`);
      const fetched = normalizeSection(data);
      if (!fetched) {
        setSection(null);
        setFeedback({ type: "error", message: "No section data found." });
        return;
      }
      if (fetched.type !== "category_grid") {
        setSection(null);
        setFeedback({ type: "error", message: "This section is not a category_grid section." });
        return;
      }
      setSection(fetched);
      setForm({
        title: fetched?.title || "",
        subtitle: fetched?.subtitle || "",
        displayOrder: fetched?.displayOrder ?? 0,
        isActive: Boolean(fetched?.isActive),
      });
      setSelectedCategories([]);
      setMarkedForRemoval([]);
    } catch (error) {
      setSection(null);
      setFeedback({ type: "error", message: getApiErrorMessage(error, "Failed to load section.") });
    } finally {
      setLoadingSection(false);
    }
  }, [sectionId]);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (isEdit) {
      loadSection();
    } else {
      setForm(defaultForm);
      setSection(null);
      setSelectedCategories([]);
      setMarkedForRemoval([]);
      setLoadingSection(false);
    }
  }, [isAdminAllowed, sectionId, isEdit, loadSection]);

  useEffect(() => {
    if (!isAdminAllowed) return;
    const controller = new AbortController();
    const run = async () => {
      setLoadingCategories(true);
      try {
        const search = categorySearchInput.trim();
        const endpoint = search
          ? `/admin/categories?search=${encodeURIComponent(search)}`
          : "/admin/categories";
        const { data } = await client.get(endpoint, { signal: controller.signal });
        setCategoryOptions(flattenCategories(data));
      } catch (error) {
        if (error?.name === "CanceledError" || error?.name === "AbortError") return;
        setCategoryOptions([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    const timer = setTimeout(run, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isAdminAllowed, categorySearchInput]);

  const getExistingCategoryLabel = (id) => {
    const match = categoryOptions.find((item) => getCategoryId(item) === id);
    return match ? getCategoryLabel(match) : `Category ${id}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setFeedback({ type: "error", message: "Title is required." });
      return;
    }

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      if (isEdit) {
        const idsToAdd = Array.from(
          new Set(selectedCategories.map((item) => getCategoryId(item)).filter((id) => id && !existingCategorySet.has(id))),
        );
        const idsToRemove = Array.from(new Set(markedForRemoval.map((id) => String(id).trim()).filter(Boolean)));

        await client.put(`/admin/sections/${encodeURIComponent(sectionId)}`, {
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          displayOrder: Number(form.displayOrder) || 0,
          isActive: Boolean(form.isActive),
        });

        if (idsToAdd.length) {
          await client.post(`/admin/sections/${encodeURIComponent(sectionId)}/categories`, { ids: idsToAdd });
        }

        if (idsToRemove.length) {
          await Promise.all(
            idsToRemove.map((id) =>
              client.delete(`/admin/sections/${encodeURIComponent(sectionId)}/categories/${encodeURIComponent(id)}`),
            ),
          );
        }

        setFeedback({
          type: "success",
          message: `Section updated. Added ${idsToAdd.length} category(s), removed ${idsToRemove.length} category(s).`,
        });
        await loadSection();
      } else {
        const ids = Array.from(new Set(selectedCategories.map((item) => getCategoryId(item)).filter(Boolean)));
        if (!ids.length) {
          setFeedback({ type: "error", message: "Select at least one category." });
          setSaving(false);
          return;
        }

        const { data } = await client.post("/admin/sections", {
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || undefined,
          type: "category_grid",
          displayOrder: Number(form.displayOrder) || 0,
          isActive: Boolean(form.isActive),
        });
        const created = data?.data?.section ?? data?.section ?? data?.data ?? data;
        const createdId = created?._id ?? created?.id ?? "";
        if (!createdId) {
          throw new Error("Section created but id not found.");
        }
        await client.post(`/admin/sections/${encodeURIComponent(String(createdId))}/categories`, { ids });
        navigate(`/admin/homepage-cms/category-grid-sections/${encodeURIComponent(String(createdId))}`);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, isEdit ? "Failed to update section." : "Failed to create category grid section."),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
          Back
        </Button>
      </Box>
    );
  }

  const listPath = "/admin/homepage-cms/category-grid-sections";
  const pageTitle = isEdit ? "Edit Category Grid Section" : "Create Category Grid Section";
  const breadcrumbLabel = isEdit ? "Edit" : "Create";

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Category Grid Sections", to: listPath },
            { label: breadcrumbLabel },
          ]}
        />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 2 }}
        >
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            {pageTitle}
          </Typography>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        {isEdit && loadingSection ? (
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, display: "flex", justifyContent: "center" }}
          >
            <CircularProgress size={28} sx={{ color: accent }} />
          </Paper>
        ) : isEdit && !section ? (
          <Alert severity="error">Unable to load section for editing.</Alert>
        ) : (
          <Paper
            component="form"
            onSubmit={handleSubmit}
            elevation={0}
            sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}
          >
            <Stack spacing={1.25}>
              <TextField
                label="Title"
                size="small"
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <TextField
                label="Subtitle"
                size="small"
                value={form.subtitle}
                onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
              />
              <TextField
                label="Display Order"
                type="number"
                size="small"
                value={form.displayOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
              />
              <TextField
                select
                label="Status"
                size="small"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}
              >
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="inactive">inactive</MenuItem>
              </TextField>

              <Autocomplete
                multiple
                options={isEdit ? availableOptions : categoryOptions}
                loading={loadingCategories}
                value={selectedCategories}
                onChange={(_, newValue) => {
                  setSelectedCategories(newValue);
                  if (isEdit) {
                    const selectedIds = newValue.map((item) => getCategoryId(item));
                    setMarkedForRemoval((prev) => prev.filter((id) => !selectedIds.includes(id)));
                  }
                }}
                inputValue={categorySearchInput}
                onInputChange={(_, newInputValue) => setCategorySearchInput(newInputValue)}
                isOptionEqualToValue={(option, value) => getCategoryId(option) === getCategoryId(value)}
                getOptionLabel={(option) => getCategoryLabel(option)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={`${getCategoryId(option)}-${index}`}
                      label={getCategoryLabel(option)}
                      size="small"
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={isEdit ? "Search and select categories to add" : "Search and select categories"}
                    size="small"
                    required={!isEdit}
                    helperText={
                      isEdit
                        ? "New categories are staged until you save. Existing categories are listed below."
                        : "Select at least one category for this section."
                    }
                  />
                )}
              />

              {isEdit ? (
                <>
                  <Typography sx={{ fontWeight: 700, color: "#1f2a24", mt: 0.75 }}>Current categories</Typography>
                  <Stack spacing={0.8}>
                    {activeCategoryIds.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                        No categories in this section.
                      </Typography>
                    ) : (
                      activeCategoryIds.map((id) => (
                        <Stack
                          key={id}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ border: `1px solid ${alpha("#0f3828", 0.1)}`, borderRadius: 1.2, px: 1.25, py: 0.8 }}
                        >
                          <Typography variant="body2" sx={{ color: "#1f2a24", pr: 1 }}>
                            {getExistingCategoryLabel(id)}
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            sx={{ textTransform: "none", fontWeight: 700 }}
                            onClick={() => setMarkedForRemoval((prev) => (prev.includes(id) ? prev : [...prev, id]))}
                          >
                            Remove
                          </Button>
                        </Stack>
                      ))
                    )}
                  </Stack>
                  {markedForRemoval.length > 0 ? (
                    <Typography variant="body2" sx={{ color: "#a13a3a" }}>
                      {markedForRemoval.length} category(s) marked for removal. They will be deleted when you save.
                    </Typography>
                  ) : null}
                </>
              ) : null}

              <Stack direction="row" gap={2} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  type="button"
                  onClick={() => navigate(listPath)}
                  sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha("#0f3828", 0.25), color: "#1f2a24" }}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                >
                  {saving
                    ? isEdit
                      ? "Saving..."
                      : "Creating..."
                    : isEdit
                      ? "Save Section"
                      : "Create Section"}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default AdminCategoryGridSectionCreate;

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const normalizeSection = (payload) => {
  const root = payload?.data ?? payload;
  if (!root || typeof root !== "object") return null;
  return root.section ?? root;
};

const getCategoryId = (category) => String(category?._id || category?.id || "").trim();
const getCategoryName = (category) => String(category?.name || category?.title || category?.label || "").trim();

const flattenCategoryTree = (nodes, parentLabel = "") => {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((node) => {
    const id = getCategoryId(node);
    const name = getCategoryName(node);
    const currentPath = [parentLabel, name].filter(Boolean).join(" > ");
    const normalizedNode = {
      ...node,
      categoryPathLabel: currentPath || name || id || "Unnamed category",
    };
    const children = flattenCategoryTree(node?.children || node?.subcategories || [], currentPath || name);
    return [normalizedNode, ...children];
  });
};

const normalizeCategories = (payload) => {
  const root = payload?.data ?? payload;
  if (!root) return [];
  const list = root.categories ?? root.items ?? root.data ?? root;
  const flattened = flattenCategoryTree(Array.isArray(list) ? list : []);
  const byId = new Map();
  flattened.forEach((category) => {
    const id = getCategoryId(category);
    if (!id) return;
    byId.set(id, category);
  });
  return Array.from(byId.values());
};

const getCategoryLabel = (category) => {
  const id = getCategoryId(category);
  const label = String(category?.categoryPathLabel || "").trim();
  const name = getCategoryName(category);
  if (label) return label;
  if (name) return name;
  return id || "Unnamed category";
};

const AdminCategoryGridSectionEdit = () => {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [section, setSection] = useState(null);
  const [updateForm, setUpdateForm] = useState({ title: "", subtitle: "", displayOrder: 0, isActive: true });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [markedForRemoval, setMarkedForRemoval] = useState([]);
  const [categorySearchInput, setCategorySearchInput] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [busy, setBusy] = useState({ update: false, deleteSection: false });

  const loadSection = async () => {
    if (!sectionId.trim()) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
      const fetched = normalizeSection(data);
      setSection(fetched);
      if (fetched) {
        setUpdateForm({
          title: fetched?.title || "",
          subtitle: fetched?.subtitle || "",
          displayOrder: fetched?.displayOrder ?? 0,
          isActive: Boolean(fetched?.isActive),
        });
        setSelectedCategories([]);
        setMarkedForRemoval([]);
      }
    } catch (error) {
      setFeedback({ type: "error", message: error?.response?.data?.message || error?.message || "Failed to load section." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) loadSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAllowed, sectionId]);

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
        setCategoryOptions(normalizeCategories(data));
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

  const withBusy = async (key, fn) => {
    setBusy((prev) => ({ ...prev, [key]: true }));
    setFeedback({ type: "", message: "" });
    try {
      await fn();
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleUpdate = async () => {
    await withBusy("update", async () => {
      try {
        const existingCategoryIds = (Array.isArray(section?.categoryIds) ? section.categoryIds : []).map((id) => String(id));
        const existingSet = new Set(existingCategoryIds);
        const idsToAdd = Array.from(
          new Set(selectedCategories.map((item) => getCategoryId(item)).filter((id) => id && !existingSet.has(id)))
        );
        const idsToRemove = Array.from(new Set(markedForRemoval.map((id) => String(id).trim()).filter(Boolean)));

        await client.put(`/admin/sections/${encodeURIComponent(sectionId.trim())}`, {
          title: updateForm.title.trim(),
          subtitle: updateForm.subtitle.trim(),
          displayOrder: Number(updateForm.displayOrder) || 0,
          isActive: Boolean(updateForm.isActive),
        });

        if (idsToAdd.length) {
          await client.post(`/admin/sections/${encodeURIComponent(sectionId.trim())}/categories`, { ids: idsToAdd });
        }

        if (idsToRemove.length) {
          await Promise.all(
            idsToRemove.map((id) =>
              client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}/categories/${encodeURIComponent(id)}`)
            )
          );
        }

        setFeedback({
          type: "success",
          message: `Section updated. Added ${idsToAdd.length} category(s), removed ${idsToRemove.length} category(s).`,
        });
        await loadSection();
      } catch (error) {
        setFeedback({ type: "error", message: error?.response?.data?.message || error?.message || "Failed to update section." });
      }
    });
  };

  const handleSoftDelete = async () => {
    if (!window.confirm("Soft delete this section?")) return;
    await withBusy("deleteSection", async () => {
      try {
        await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
        navigate("/admin/homepage-cms/category-grid-sections");
      } catch (error) {
        setFeedback({ type: "error", message: error?.response?.data?.message || error?.message || "Failed to delete section." });
      }
    });
  };

  const existingCategoryIds = useMemo(() => (Array.isArray(section?.categoryIds) ? section.categoryIds.map((id) => String(id)) : []), [section]);
  const existingCategorySet = useMemo(() => new Set(existingCategoryIds), [existingCategoryIds]);

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
      </Box>
    );
  }

  const isCorrectType = section?.type === "category_grid";
  const activeCategoryIds = existingCategoryIds.filter((id) => !markedForRemoval.includes(id));
  const availableOptions = categoryOptions.filter((category) => !existingCategorySet.has(getCategoryId(category)));

  const getExistingCategoryLabel = (id) => {
    const match = categoryOptions.find((item) => getCategoryId(item) === id);
    return match ? getCategoryLabel(match) : `Category ${id}`;
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Category Grid Sections", to: "/admin/homepage-cms/category-grid-sections" },
            { label: "Edit" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>Edit Category Grid Section</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate(`/admin/homepage-cms/category-grid-sections/${encodeURIComponent(sectionId)}`)}>Back to details</Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadSection}>Refresh</Button>
            <Button variant="outlined" color="error" disabled={busy.deleteSection} sx={{ textTransform: "none", fontWeight: 700 }} onClick={handleSoftDelete}>{busy.deleteSection ? "Deleting..." : "Soft Delete"}</Button>
          </Stack>
        </Stack>

        {feedback.message ? <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>{feedback.message}</Alert> : null}

        {loading ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}><Typography color="text.secondary">Loading section...</Typography></Paper>
        ) : !section ? (
          <Alert severity="error">No section data found.</Alert>
        ) : !isCorrectType ? (
          <Alert severity="error">This section is not a category_grid section.</Alert>
        ) : (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
            <Stack spacing={1.25}>
              <TextField label="Title" size="small" value={updateForm.title} onChange={(event) => setUpdateForm((prev) => ({ ...prev, title: event.target.value }))} />
              <TextField label="Subtitle" size="small" value={updateForm.subtitle} onChange={(event) => setUpdateForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
              <TextField label="Display Order" type="number" size="small" value={updateForm.displayOrder} onChange={(event) => setUpdateForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
              <TextField select label="Status" size="small" value={updateForm.isActive ? "active" : "inactive"} onChange={(event) => setUpdateForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}>
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="inactive">inactive</MenuItem>
              </TextField>

              <Autocomplete
                multiple
                options={availableOptions}
                loading={loadingCategories}
                value={selectedCategories}
                onChange={(_, newValue) => {
                  setSelectedCategories(newValue);
                  const selectedIds = newValue.map((item) => getCategoryId(item));
                  setMarkedForRemoval((prev) => prev.filter((id) => !selectedIds.includes(id)));
                }}
                inputValue={categorySearchInput}
                onInputChange={(_, newInputValue) => setCategorySearchInput(newInputValue)}
                isOptionEqualToValue={(option, value) => getCategoryId(option) === getCategoryId(value)}
                getOptionLabel={(option) => getCategoryLabel(option)}
                renderTags={(value, getTagProps) => value.map((option, index) => <Chip {...getTagProps({ index })} key={`${getCategoryId(option)}-${index}`} label={getCategoryLabel(option)} size="small" />)}
                renderInput={(params) => <TextField {...params} label="Search and select categories to add" size="small" helperText="This is staged. API runs only on Update Section." />}
              />

              <Typography sx={{ fontWeight: 700, color: "#1f2a24", mt: 0.75 }}>Current categories</Typography>
              <Stack spacing={0.8}>
                {activeCategoryIds.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "#6f7f77" }}>No categories in this section.</Typography>
                ) : (
                  activeCategoryIds.map((id) => (
                    <Stack key={id} direction="row" justifyContent="space-between" alignItems="center" sx={{ border: `1px solid ${alpha("#0f3828", 0.1)}`, borderRadius: 1.2, px: 1.25, py: 0.8 }}>
                      <Typography variant="body2" sx={{ color: "#1f2a24", pr: 1 }}>{getExistingCategoryLabel(id)}</Typography>
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
                  {markedForRemoval.length} category(s) marked for removal. They will be deleted when you click Update Section.
                </Typography>
              ) : null}

              <Button variant="contained" onClick={handleUpdate} disabled={busy.update} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
                {busy.update ? "Updating..." : "Update Section"}
              </Button>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default AdminCategoryGridSectionEdit;

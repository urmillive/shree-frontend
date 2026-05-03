import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

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

const AdminCategoryGridSectionCreate = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [createForm, setCreateForm] = useState({ title: "", subtitle: "", displayOrder: 0, isActive: true });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categorySearchInput, setCategorySearchInput] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

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

  const handleCreateSection = async () => {
    const ids = Array.from(new Set(selectedCategories.map((item) => getCategoryId(item)).filter(Boolean)));
    if (!createForm.title.trim()) {
      setFeedback({ type: "error", message: "Title is required." });
      return;
    }
    if (!ids.length) {
      setFeedback({ type: "error", message: "Select at least one category." });
      return;
    }
    setCreating(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.post("/admin/sections", {
        title: createForm.title.trim(),
        subtitle: createForm.subtitle.trim() || undefined,
        type: "category_grid",
        displayOrder: Number(createForm.displayOrder) || 0,
        isActive: Boolean(createForm.isActive),
      });
      const created = data?.data?.section ?? data?.section ?? data?.data ?? data;
      const sectionId = created?._id ?? created?.id ?? "";
      if (!sectionId) {
        throw new Error("Section created but id not found.");
      }
      await client.post(`/admin/sections/${encodeURIComponent(String(sectionId))}/categories`, { ids });
      navigate(`/admin/homepage-cms/category-grid-sections/${encodeURIComponent(String(sectionId))}`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Failed to create category grid section.",
      });
    } finally {
      setCreating(false);
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

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Category Grid Sections", to: "/admin/homepage-cms/category-grid-sections" },
            { label: "Create" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Create Category Grid Section
          </Typography>
          <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms/category-grid-sections")}>
            Back to list
          </Button>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
          <Stack spacing={1.25}>
            <TextField label="Title" size="small" required value={createForm.title} onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))} />
            <TextField label="Subtitle" size="small" value={createForm.subtitle} onChange={(event) => setCreateForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
            <TextField
              label="Display Order"
              type="number"
              size="small"
              value={createForm.displayOrder}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
            />
            <TextField
              select
              label="Status"
              size="small"
              value={createForm.isActive ? "active" : "inactive"}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}
            >
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="inactive">inactive</MenuItem>
            </TextField>
            <Autocomplete
              multiple
              options={categoryOptions}
              loading={loadingCategories}
              value={selectedCategories}
              onChange={(_, newValue) => setSelectedCategories(newValue)}
              inputValue={categorySearchInput}
              onInputChange={(_, newInputValue) => setCategorySearchInput(newInputValue)}
              isOptionEqualToValue={(option, value) => getCategoryId(option) === getCategoryId(value)}
              getOptionLabel={(option) => getCategoryLabel(option)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={`${getCategoryId(option)}-${index}`} label={getCategoryLabel(option)} size="small" />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Search and select categories" size="small" helperText="Uses /admin/categories for list and search." />}
            />
            <Button variant="contained" onClick={handleCreateSection} disabled={creating} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminCategoryGridSectionCreate;

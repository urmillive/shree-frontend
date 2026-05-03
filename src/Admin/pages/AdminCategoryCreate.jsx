import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import { createAdminCategory, fetchAdminCategories, flattenCategories } from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const defaultCreateForm = {
  name: "",
  description: "",
  parent: "",
  displayOrder: 0,
  isActive: true,
  metaTitle: "",
  metaDescription: "",
};

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const AdminCategoryCreate = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [categoriesFlat, setCategoriesFlat] = useState([]);

  const loadParentOptions = async () => {
    try {
      const { data } = await fetchAdminCategories();
      setCategoriesFlat(flattenCategories(data));
    } catch {
      setCategoriesFlat([]);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) loadParentOptions();
  }, [isAdminAllowed]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (!createForm.name.trim()) {
      setFeedback({ type: "error", message: "Category name is required." });
      return;
    }
    setCreating(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        parent: createForm.parent || undefined,
        displayOrder: Number(createForm.displayOrder) || 0,
        isActive: Boolean(createForm.isActive),
      };
      const metaTitle = createForm.metaTitle.trim();
      const metaDescription = createForm.metaDescription.trim();
      if (metaTitle || metaDescription) {
        payload.seo = {};
        if (metaTitle) payload.seo.metaTitle = metaTitle;
        if (metaDescription) payload.seo.metaDescription = metaDescription;
      }
      const { data } = await createAdminCategory(payload);
      const created = data?.data?.category ?? data?.category ?? data?.data ?? data;
      const id = getCategoryId(created);
      if (id) {
        navigate(`/admin/categories/${encodeURIComponent(id)}`);
      } else {
        navigate("/admin/categories");
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Failed to create category.",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
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
            { label: "Categories", to: "/admin/categories" },
            { label: "Create" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Create Category
          </Typography>
          <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/categories")}>
            Back to list
          </Button>
        </Stack>

        {feedback.message ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Paper component="form" onSubmit={handleCreateCategory} elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
          <Stack spacing={1.25}>
            <TextField label="Name" size="small" required value={createForm.name} onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))} />
            <TextField label="Description" size="small" value={createForm.description} onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))} />
            <TextField select label="Parent (optional)" size="small" value={createForm.parent} onChange={(event) => setCreateForm((prev) => ({ ...prev, parent: event.target.value }))}>
              <MenuItem value="">Root category</MenuItem>
              {categoriesFlat.map((category) => {
                const id = getCategoryId(category);
                return (
                  <MenuItem key={`parent-${id}`} value={id}>
                    {category?._uiPathLabel || category?.name || id}
                  </MenuItem>
                );
              })}
            </TextField>
            <TextField label="Display Order" type="number" size="small" value={createForm.displayOrder} onChange={(event) => setCreateForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
            <TextField select label="Status" size="small" value={createForm.isActive ? "active" : "inactive"} onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}>
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="inactive">inactive</MenuItem>
            </TextField>
            <TextField label="SEO Meta Title" size="small" value={createForm.metaTitle} onChange={(event) => setCreateForm((prev) => ({ ...prev, metaTitle: event.target.value }))} />
            <TextField label="SEO Meta Description" size="small" value={createForm.metaDescription} onChange={(event) => setCreateForm((prev) => ({ ...prev, metaDescription: event.target.value }))} />
            <Button type="submit" variant="contained" disabled={creating} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
              {creating ? "Creating..." : "Create Category"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminCategoryCreate;

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import { getApiErrorMessage } from "../../utils/apiError";
import { fetchAdminCategories, fetchAdminCategoryById, flattenCategories, normalizeCategoryPayload, updateAdminCategory } from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";
const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const defaultEditForm = {
  name: "",
  description: "",
  parent: "",
  displayOrder: 0,
  metaTitle: "",
  metaDescription: "",
};

const AdminCategoryEdit = () => {
  const navigate = useNavigate();
  const { categoryId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [editForm, setEditForm] = useState(defaultEditForm);

  const loadData = async () => {
    if (!categoryId.trim()) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const [{ data: categoryData }, { data: listData }] = await Promise.all([fetchAdminCategoryById(categoryId.trim()), fetchAdminCategories()]);
      const fetched = normalizeCategoryPayload(categoryData);
      setCategory(fetched);
      setAllCategories(flattenCategories(listData));
      setEditForm({
        name: fetched?.name || "",
        description: fetched?.description || "",
        parent: fetched?.parent || "",
        displayOrder: fetched?.displayOrder ?? 0,
        metaTitle: fetched?.seo?.metaTitle || "",
        metaDescription: fetched?.seo?.metaDescription || "",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load category."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) loadData();
  }, [isAdminAllowed, categoryId]);

  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      setFeedback({ type: "error", message: "Category name is required." });
      return;
    }
    setUpdating(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        displayOrder: Number(editForm.displayOrder) || 0,
        parent: editForm.parent || null,
      };
      const metaTitle = editForm.metaTitle.trim();
      const metaDescription = editForm.metaDescription.trim();
      if (metaTitle || metaDescription) {
        payload.seo = {};
        if (metaTitle) payload.seo.metaTitle = metaTitle;
        if (metaDescription) payload.seo.metaDescription = metaDescription;
      }
      await updateAdminCategory(categoryId.trim(), payload);
      navigate(`/admin/categories/${encodeURIComponent(categoryId.trim())}`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to update category."),
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
      </Box>
    );
  }

  const currentId = getCategoryId(category);
  const parentOptions = allCategories.filter((item) => getCategoryId(item) && getCategoryId(item) !== currentId);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Categories", to: "/admin/categories" },
            { label: "Category Detail", to: `/admin/categories/${encodeURIComponent(categoryId.trim())}` },
            { label: "Edit" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Edit Category
          </Typography>
          <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate(`/admin/categories/${encodeURIComponent(categoryId.trim())}`)}>
            Back to detail
          </Button>
        </Stack>

        {feedback.message ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        {loading ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
            <Typography color="text.secondary">Loading category...</Typography>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
            <Stack spacing={1.25}>
              <TextField label="Name" size="small" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
              <TextField label="Description" size="small" value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} />
              <TextField select label="Parent" size="small" value={editForm.parent || ""} onChange={(event) => setEditForm((prev) => ({ ...prev, parent: event.target.value }))}>
                <MenuItem value="">Root category</MenuItem>
                {parentOptions.map((item) => (
                  <MenuItem key={`parent-${getCategoryId(item)}`} value={getCategoryId(item)}>
                    {item?._uiPathLabel || item?.name || getCategoryId(item)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Display Order" type="number" size="small" value={editForm.displayOrder} onChange={(event) => setEditForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
              <TextField label="SEO Meta Title" size="small" value={editForm.metaTitle} onChange={(event) => setEditForm((prev) => ({ ...prev, metaTitle: event.target.value }))} />
              <TextField label="SEO Meta Description" size="small" value={editForm.metaDescription} onChange={(event) => setEditForm((prev) => ({ ...prev, metaDescription: event.target.value }))} />
              <Button variant="contained" onClick={handleUpdate} disabled={updating} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
                {updating ? "Updating..." : "Save Changes"}
              </Button>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default AdminCategoryEdit;

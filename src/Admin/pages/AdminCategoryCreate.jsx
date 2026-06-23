import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  canBeParentCategory,
  createAdminCategory,
  fetchAdminCategories,
  flattenCategories,
  getCategoryLevel,
  MAX_CATEGORY_DEPTH,
  uploadAdminCategoryImageFromFile,
} from "../services/adminCategoriesService";

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
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const categoryImageInputRef = useRef(null);

  const parentOptions = useMemo(() => categoriesFlat.filter(canBeParentCategory), [categoriesFlat]);

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

  const clearCategoryImage = () => {
    setCategoryImageFile(null);
    if (categoryImageInputRef.current) {
      categoryImageInputRef.current.value = "";
    }
  };

  const onPickCategoryImage = (event) => {
    const file = Array.from(event.target.files || []).find((f) => f && String(f.type || "").startsWith("image/"));
    if (!file) return;
    setCategoryImageFile(file);
    setFeedback({ type: "", message: "" });
    if (categoryImageInputRef.current) {
      categoryImageInputRef.current.value = "";
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (!createForm.name.trim()) {
      setFeedback({ type: "error", message: "Category name is required." });
      return;
    }
    if (createForm.parent) {
      const parent = categoriesFlat.find((category) => getCategoryId(category) === createForm.parent);
      if (parent && !canBeParentCategory(parent)) {
        setFeedback({
          type: "error",
          message: `Only ${MAX_CATEGORY_DEPTH} category levels are allowed (Level 1 → Level 2 → Level 3). Choose a Level 1 or Level 2 parent.`,
        });
        return;
      }
    }
    setCreating(true);
    setFeedback({ type: "", message: "" });
    const imageSnapshot = categoryImageFile;
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
      if (id && imageSnapshot) {
        try {
          await uploadAdminCategoryImageFromFile(id, imageSnapshot);
          clearCategoryImage();
        } catch (imgErr) {
          const msg = getApiErrorMessage(imgErr, "Image upload failed.");
          navigate(`/admin/categories/${encodeURIComponent(id)}`, {
            state: {
              imageUploadNotice: `Category was created, but the image could not be uploaded: ${msg} You can try again below.`,
            },
          });
          return;
        }
      }
      if (id) {
        navigate(`/admin/categories/${encodeURIComponent(id)}`);
      } else {
        navigate("/admin/categories");
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to create category."),
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
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Paper component="form" onSubmit={handleCreateCategory} elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
          <Stack spacing={1.25}>
            <TextField label="Name" size="small" required value={createForm.name} onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))} />
            <TextField label="Description" size="small" value={createForm.description} onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))} />
            <TextField select label="Parent (optional)" size="small" value={createForm.parent} onChange={(event) => setCreateForm((prev) => ({ ...prev, parent: event.target.value }))}>
              <MenuItem value="">Level 1 — root category</MenuItem>
              {parentOptions.map((category) => {
                const id = getCategoryId(category);
                const level = getCategoryLevel(category);
                return (
                  <MenuItem key={`parent-${id}`} value={id}>
                    Level {level + 1} — {category?._uiPathLabel || category?.name || id}
                  </MenuItem>
                );
              })}
            </TextField>
            <Typography variant="caption" sx={{ color: "#4e5a54", mt: -0.5 }}>
              Up to {MAX_CATEGORY_DEPTH} levels: Level 1 (root), Level 2, and Level 3. Level 3 categories cannot have children.
            </Typography>
            <TextField label="Display Order" type="number" size="small" value={createForm.displayOrder} onChange={(event) => setCreateForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
            <TextField select label="Status" size="small" value={createForm.isActive ? "active" : "inactive"} onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}>
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="inactive">inactive</MenuItem>
            </TextField>
            <TextField label="SEO Meta Title" size="small" value={createForm.metaTitle} onChange={(event) => setCreateForm((prev) => ({ ...prev, metaTitle: event.target.value }))} />
            <TextField label="SEO Meta Description" size="small" value={createForm.metaDescription} onChange={(event) => setCreateForm((prev) => ({ ...prev, metaDescription: event.target.value }))} />
            <Stack spacing={0.75}>
              <Typography variant="body2" sx={{ color: "#4e5a54", fontWeight: 700 }}>
                Category image (optional)
              </Typography>
              <Typography variant="caption" sx={{ color: "#4e5a54" }}>
                After the category is created, the image uploads automatically (same presigned upload + confirm as products).
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <Button variant="outlined" component="label" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                  Choose image
                  <input ref={categoryImageInputRef} hidden type="file" accept="image/*" onChange={onPickCategoryImage} />
                </Button>
                {categoryImageFile ? (
                  <Button variant="text" onClick={clearCategoryImage} sx={{ textTransform: "none", fontWeight: 700 }}>
                    Clear
                  </Button>
                ) : null}
              </Stack>
              {categoryImageFile ? (
                <Typography variant="caption" sx={{ color: "#4e5a54", wordBreak: "break-all" }}>
                  Selected: {categoryImageFile.name}
                </Typography>
              ) : null}
            </Stack>
            <Stack direction="row" gap={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha("#0f3828", 0.25), color: "#1f2a24" }}
              disabled={creating}
            >
              Discard
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
            >
                {creating ? (categoryImageFile ? "Creating & uploading image..." : "Creating...") : "Create Category"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminCategoryCreate;

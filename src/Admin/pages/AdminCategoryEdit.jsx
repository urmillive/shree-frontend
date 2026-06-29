import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  canBeParentCategory,
  fetchAdminCategories,
  fetchAdminCategoryById,
  flattenCategories,
  getCategoryLevel,
  getCategoryParentId,
  MAX_CATEGORY_DEPTH,
  normalizeCategoryPayload,
  updateAdminCategory,
  uploadAdminCategoryImageFromFile,
} from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";
const SECTIONS = ["Basic Info", "SEO", "Image"];

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const defaultEditForm = {
  name: "",
  description: "",
  parent: "",
  displayOrder: 0,
  isActive: true,
  metaTitle: "",
  metaDescription: "",
};

function mapCategoryToForm(category) {
  if (!category) return defaultEditForm;
  return {
    name: String(category?.name || "").trim(),
    description: String(category?.description || ""),
    parent: getCategoryParentId(category),
    displayOrder: category?.displayOrder ?? 0,
    isActive: category?.isActive !== false,
    metaTitle: String(category?.seo?.metaTitle || "").trim(),
    metaDescription: String(category?.seo?.metaDescription || "").trim(),
  };
}

function normalizeCategoryImage(category) {
  const url = String(category?.imageUrl || category?.image?.url || "").trim();
  const key = String(category?.imageKey || category?.image?.key || "").trim();
  if (!url && !key) return null;
  return { url, key };
}

const AdminCategoryEdit = () => {
  const navigate = useNavigate();
  const { categoryId: editRouteCategoryId = "" } = useParams();
  const categoryId = String(editRouteCategoryId || "").trim();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [form, setForm] = useState(defaultEditForm);
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageSuccess, setImageSuccess] = useState("");
  const [stagingFile, setStagingFile] = useState(null);
  const imageInputRef = useRef(null);
  const originalFormRef = useRef(null);

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadCategoryForEdit = useCallback(async () => {
    if (!categoryId) return;
    setLoadingCategory(true);
    setError("");
    setImageError("");
    setImageSuccess("");
    try {
      const [{ data: categoryData }, { data: listData }] = await Promise.all([
        fetchAdminCategoryById(categoryId),
        fetchAdminCategories(),
      ]);
      const fetched = normalizeCategoryPayload(categoryData);
      if (!fetched) {
        setError("Category not found.");
        setCategory(null);
        return;
      }
      setCategory(fetched);
      setAllCategories(flattenCategories(listData));
      const mappedForm = mapCategoryToForm(fetched);
      setForm(mappedForm);
      originalFormRef.current = mappedForm;
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load category."));
    } finally {
      setLoadingCategory(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (isAdminAllowed) loadCategoryForEdit();
  }, [isAdminAllowed, loadCategoryForEdit]);

  const onPickImage = (event) => {
    const file = Array.from(event.target.files || []).find((f) => f && String(f.type || "").startsWith("image/"));
    if (!file) return;
    setStagingFile(file);
    setImageError("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const clearStagingFile = () => {
    setStagingFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleUploadQueuedImage = async () => {
    if (!categoryId) {
      setImageError("Category id missing. Reload the page.");
      return;
    }
    if (!stagingFile) {
      setImageError("Add an image to the queue before uploading.");
      return;
    }

    setImageError("");
    setImageSuccess("");
    setUploadingImage(true);
    const fileSnapshot = stagingFile;

    try {
      const updated = await uploadAdminCategoryImageFromFile(categoryId, fileSnapshot);
      if (updated) {
        setCategory(updated);
      } else {
        await loadCategoryForEdit();
      }
      clearStagingFile();
      setImageSuccess("Image uploaded and confirmed.");
    } catch (err) {
      setImageError(getApiErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setImageError("");
    setImageSuccess("");

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }
    if (form.parent) {
      const parent = allCategories.find((item) => getCategoryId(item) === form.parent);
      if (parent && !canBeParentCategory(parent)) {
        setError(
          `Only ${MAX_CATEGORY_DEPTH} category levels are allowed (Level 1 → Level 2 → Level 3). Choose a Level 1 or Level 2 parent.`,
        );
        return;
      }
    }

    const stagingSnapshot = stagingFile;
    const orig = originalFormRef.current;

    const newName = form.name.trim();
    const newDesc = form.description.trim();
    const newParent = form.parent || null;
    const newOrder = Number(form.displayOrder) || 0;
    const newActive = Boolean(form.isActive);
    const newMetaTitle = form.metaTitle.trim();
    const newMetaDescription = form.metaDescription.trim();

    const payload = {};
    if (!orig || newName !== (orig.name || "").trim()) payload.name = newName;
    if (!orig || newDesc !== (orig.description || "").trim()) payload.description = newDesc || undefined;
    if (!orig || newParent !== (orig.parent || null)) payload.parent = newParent;
    if (!orig || newOrder !== (Number(orig.displayOrder) || 0)) payload.displayOrder = newOrder;
    if (!orig || newActive !== Boolean(orig.isActive)) payload.isActive = newActive;

    const origMetaTitle = (orig?.metaTitle || "").trim();
    const origMetaDescription = (orig?.metaDescription || "").trim();
    if (newMetaTitle !== origMetaTitle || newMetaDescription !== origMetaDescription) {
      payload.seo = {};
      if (newMetaTitle) payload.seo.metaTitle = newMetaTitle;
      if (newMetaDescription) payload.seo.metaDescription = newMetaDescription;
    }

    if (Object.keys(payload).length === 0 && !stagingSnapshot) {
      navigate(`/admin/categories/${encodeURIComponent(categoryId)}`);
      return;
    }

    setSaving(true);
    let imageUploadError = "";

    try {
      let mergedCategory = category;
      if (Object.keys(payload).length > 0) {
        const { data } = await updateAdminCategory(categoryId, payload);
        mergedCategory = normalizeCategoryPayload(data) ?? category;
      }

      if (categoryId && stagingSnapshot) {
        setUploadingImage(true);
        try {
          const withImage = await uploadAdminCategoryImageFromFile(categoryId, stagingSnapshot);
          if (withImage) mergedCategory = withImage;
          clearStagingFile();
        } catch (imgErr) {
          imageUploadError = getApiErrorMessage(imgErr, "Category saved but image upload failed.");
        } finally {
          setUploadingImage(false);
        }
      }

      if (mergedCategory) {
        setCategory(mergedCategory);
        setForm(mapCategoryToForm(mergedCategory));
      }

      if (imageUploadError) {
        setImageError(imageUploadError);
        return;
      }

      navigate(`/admin/categories/${encodeURIComponent(categoryId)}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update category."));
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

  const currentId = getCategoryId(category);
  const parentOptions = allCategories.filter(
    (item) => getCategoryId(item) && getCategoryId(item) !== currentId && canBeParentCategory(item),
  );
  const currentImage = normalizeCategoryImage(category);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Categories", to: "/admin/categories" },
            { label: "Category", to: `/admin/categories/${encodeURIComponent(categoryId)}` },
            { label: "Edit" },
          ]}
        />

        <Paper
          component="form"
          onSubmit={handleSave}
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: `1px solid ${alpha("#0f3828", 0.1)}`,
            boxShadow: "0 12px 30px rgba(20, 55, 42, 0.08)",
          }}
        >
          <Stack spacing={1.1} sx={{ mb: 2.2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1f2a24" }}>
              Edit Category
            </Typography>
            <Typography variant="body2" sx={{ color: "#5a6761" }}>
              Update catalog fields and replace the category image in one form.
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 0.4 }}>
              {SECTIONS.map((section, index) => (
                <Chip
                  key={section}
                  label={`${index + 1}. ${section}`}
                  size="small"
                  sx={{
                    bgcolor: alpha(accent, 0.1),
                    color: "#2a4135",
                    fontWeight: 700,
                    border: `1px solid ${alpha(accent, 0.2)}`,
                  }}
                />
              ))}
            </Stack>
          </Stack>

          {loadingCategory ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} sx={{ color: accent }} />
            </Box>
          ) : (
            <>
              <Stack spacing={1.75}>
                <TextField
                  label="Name"
                  fullWidth
                  size="small"
                  required
                  value={form.name}
                  onChange={(e) => onFormChange("name", e.target.value)}
                />
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  minRows={3}
                  size="small"
                  value={form.description}
                  onChange={(e) => onFormChange("description", e.target.value)}
                />
                <TextField
                  select
                  label="Parent (optional)"
                  fullWidth
                  size="small"
                  value={form.parent}
                  onChange={(e) => onFormChange("parent", e.target.value)}
                >
                  <MenuItem value="">Level 1 — root category</MenuItem>
                  {parentOptions.map((item) => {
                    const id = getCategoryId(item);
                    const level = getCategoryLevel(item);
                    return (
                      <MenuItem key={`parent-${id}`} value={id}>
                        Level {level + 1} — {item?._uiPathLabel || item?.name || id}
                      </MenuItem>
                    );
                  })}
                </TextField>
                <Typography variant="caption" sx={{ color: "#5a6761", mt: -1 }}>
                  Up to {MAX_CATEGORY_DEPTH} levels: Level 1 (root), Level 2, and Level 3. Level 3 categories cannot have
                  children.
                </Typography>
                <TextField
                  label="Display Order"
                  type="number"
                  fullWidth
                  size="small"
                  value={form.displayOrder}
                  onChange={(e) => onFormChange("displayOrder", e.target.value)}
                />
                <TextField
                  select
                  label="Status"
                  fullWidth
                  size="small"
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(e) => onFormChange("isActive", e.target.value === "active")}
                >
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="inactive">inactive</MenuItem>
                </TextField>
                <TextField
                  label="SEO Meta Title"
                  fullWidth
                  size="small"
                  value={form.metaTitle}
                  onChange={(e) => onFormChange("metaTitle", e.target.value)}
                />
                <TextField
                  label="SEO Meta Description"
                  fullWidth
                  size="small"
                  value={form.metaDescription}
                  onChange={(e) => onFormChange("metaDescription", e.target.value)}
                />
              </Stack>

              {categoryId ? (
                <Box sx={{ mt: 2.5 }}>
                  <Typography sx={{ mb: 1.1, fontWeight: 800, color: "#1f2a24" }}>Category image</Typography>
                  <Typography variant="body2" sx={{ mb: 1.2, color: "#5a6761" }}>
                    Queue a new image to replace the current one. It uploads when you save, or use Upload queued image to
                    upload without saving other fields.
                  </Typography>
                  <Stack spacing={1.2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="outlined"
                        component="label"
                        sx={{ textTransform: "none", borderColor: alpha("#0f3828", 0.2), color: "#1f2a24" }}
                      >
                        Choose image
                        <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={onPickImage} />
                      </Button>
                      <Button
                        type="button"
                        variant="contained"
                        onClick={handleUploadQueuedImage}
                        disabled={uploadingImage || saving || !stagingFile}
                        sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, boxShadow: "none", "&:hover": { bgcolor: "#8f723c" } }}
                      >
                        {uploadingImage ? "Uploading…" : "Upload queued image"}
                      </Button>
                      {stagingFile ? (
                        <Button type="button" variant="text" onClick={clearStagingFile} sx={{ textTransform: "none", fontWeight: 700 }}>
                          Clear queue
                        </Button>
                      ) : null}
                    </Stack>
                    {stagingFile ? (
                      <Paper
                        elevation={0}
                        sx={{ p: 1.1, borderRadius: 2, border: `1px dashed ${alpha(accent, 0.45)}`, bgcolor: alpha(accent, 0.04) }}
                      >
                        <Typography variant="body2" sx={{ color: "#2a4135", wordBreak: "break-all" }}>
                          Queued: {stagingFile.name}
                        </Typography>
                      </Paper>
                    ) : null}
                    {currentImage ? (
                      <Paper
                        elevation={0}
                        sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, bgcolor: "#fcfcfc" }}
                      >
                        <Stack spacing={1}>
                          <Typography variant="caption" sx={{ color: "#5a6761", fontWeight: 700 }}>
                            On server
                          </Typography>
                          {currentImage.key ? (
                            <Typography variant="caption" sx={{ color: "#5a6761", wordBreak: "break-all" }}>
                              {currentImage.key}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            {currentImage.url ? (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  component="a"
                                  href={currentImage.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  sx={{ textTransform: "none" }}
                                >
                                  Open
                                </Button>
                                <Box
                                  component="img"
                                  src={currentImage.url}
                                  alt={category?.name || "Category"}
                                  sx={{
                                    maxWidth: 120,
                                    maxHeight: 80,
                                    objectFit: "contain",
                                    borderRadius: 1,
                                    border: `1px solid ${alpha("#0f3828", 0.12)}`,
                                  }}
                                />
                              </>
                            ) : null}
                          </Stack>
                        </Stack>
                      </Paper>
                    ) : (
                      <Typography variant="body2" sx={{ color: "#5a6761" }}>
                        No image on server yet.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ) : null}
            </>
          )}

          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : null}
          {imageError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {imageError}
            </Alert>
          ) : null}
          {imageSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              {imageSuccess}
            </Alert>
          ) : null}

          <Stack direction="row" gap={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/admin/categories/${encodeURIComponent(categoryId)}`)}
              sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha("#0f3828", 0.25), color: "#1f2a24" }}
            >
              Discard changes
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || loadingCategory || uploadingImage}
              sx={{
                textTransform: "none",
                fontWeight: 800,
                bgcolor: accent,
                boxShadow: "none",
                "&:hover": { bgcolor: "#8f723c", boxShadow: "0 6px 18px rgba(171, 138, 72, 0.35)" },
              }}
            >
              {saving
                ? stagingFile
                  ? "Saving & uploading image..."
                  : "Saving..."
                : "Save changes"}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminCategoryEdit;

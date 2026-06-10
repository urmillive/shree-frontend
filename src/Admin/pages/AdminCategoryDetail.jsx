import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import {
  deleteAdminCategory,
  fetchAdminCategoryById,
  normalizeCategoryPayload,
  toggleAdminCategoryStatus,
  uploadAdminCategoryImageFromFile,
} from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const AdminCategoryDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { categoryId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const imageInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [category, setCategory] = useState(null);
  const [pickedFile, setPickedFile] = useState(null);
  const [busy, setBusy] = useState({ toggle: false, upload: false, remove: false });

  const withBusy = async (key, fn) => {
    setBusy((prev) => ({ ...prev, [key]: true }));
    setFeedback({ type: "", message: "" });
    try {
      await fn();
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const loadCategory = async () => {
    if (!categoryId.trim()) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data: categoryData } = await fetchAdminCategoryById(categoryId.trim());
      const fetched = normalizeCategoryPayload(categoryData);
      setCategory(fetched);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Failed to load category.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) {
      loadCategory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAllowed, categoryId]);

  useEffect(() => {
    const notice = location.state?.imageUploadNotice;
    if (!notice || !categoryId.trim()) return;
    setFeedback({ type: "error", message: String(notice) });
    navigate(`/admin/categories/${encodeURIComponent(categoryId.trim())}`, { replace: true, state: {} });
  }, [categoryId, location.state, navigate]);

  const handleToggleStatus = async () => {
    await withBusy("toggle", async () => {
      try {
        await toggleAdminCategoryStatus(categoryId.trim());
        setFeedback({ type: "success", message: "Category status changed." });
        await loadCategory();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error?.response?.data?.message || error?.message || "Failed to toggle category status.",
        });
      }
    });
  };

  const onPickImage = (event) => {
    const file = Array.from(event.target.files || []).find((f) => f && String(f.type || "").startsWith("image/"));
    if (!file) return;
    setPickedFile(file);
    setFeedback({ type: "", message: "" });
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const clearPickedFile = () => {
    setPickedFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleUploadAndConfirm = async () => {
    if (!pickedFile) {
      setFeedback({ type: "error", message: "Choose an image file first." });
      return;
    }
    await withBusy("upload", async () => {
      try {
        const updated = await uploadAdminCategoryImageFromFile(categoryId.trim(), pickedFile);
        if (updated) {
          setCategory(updated);
        } else {
          await loadCategory();
        }
        clearPickedFile();
        setFeedback({ type: "success", message: "Image uploaded and confirmed." });
      } catch (error) {
        setFeedback({
          type: "error",
          message: error?.response?.data?.message || error?.message || "Image upload or confirm failed.",
        });
      }
    });
  };

  const handleDelete = async () => {
    if (!window.confirm("Soft-delete this category? It must not have active children.")) return;
    await withBusy("remove", async () => {
      try {
        await deleteAdminCategory(categoryId.trim());
        navigate("/admin/categories");
      } catch (error) {
        setFeedback({
          type: "error",
          message: error?.response?.data?.message || error?.message || "Failed to delete category.",
        });
      }
    });
  };

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
      </Box>
    );
  }

  const imageUrl = category?.imageUrl || category?.image?.url || "";
  const imageKey = category?.imageKey || category?.image?.key || "";

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Categories", to: "/admin/categories" },
            { label: "Category Detail" },
          ]}
        />

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Category Detail
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/categories")}>
              Back to list
            </Button>
            <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate(`/admin/categories/${encodeURIComponent(categoryId.trim())}/edit`)}>
              Edit
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadCategory}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        {loading ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
            <Typography color="text.secondary">Loading category...</Typography>
          </Paper>
        ) : !category ? (
          <Alert severity="error">No category found.</Alert>
        ) : (
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontWeight: 700, color: "#1f2a24" }}>Category Information</Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>ID: {getCategoryId(category) || "-"}</Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>Name: {category?.name || "-"}</Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>Description: {category?.description || "-"}</Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>Level: {category?.level ?? 0}</Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>Display Order: {category?.displayOrder ?? 0}</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="outlined" onClick={handleToggleStatus} disabled={busy.toggle} sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                    {busy.toggle ? "Updating..." : `Toggle Status (${category?.isActive ? "currently active" : "currently inactive"})`}
                  </Button>
                  <Button variant="outlined" color="error" onClick={handleDelete} disabled={busy.remove} sx={{ textTransform: "none", fontWeight: 700 }}>
                    {busy.remove ? "Deleting..." : "Soft Delete"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontWeight: 700, color: "#1f2a24" }}>Category image</Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                  Pick an image, then upload. The app requests a presigned URL, uploads your file, then confirms with the server (same flow as product images).
                </Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                  Current key: {imageKey || "—"}
                </Typography>
                {imageUrl ? (
                  <Box
                    component="img"
                    src={imageUrl}
                    alt=""
                    sx={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 1, border: `1px solid ${alpha("#0f3828", 0.12)}` }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                    No image URL yet.
                  </Typography>
                )}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" component="label" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                    Choose image
                    <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={onPickImage} />
                  </Button>
                  <Button variant="contained" onClick={handleUploadAndConfirm} disabled={busy.upload || !pickedFile} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
                    {busy.upload ? "Uploading…" : "Upload and confirm"}
                  </Button>
                  {pickedFile ? (
                    <Button variant="text" onClick={clearPickedFile} sx={{ textTransform: "none", fontWeight: 700 }}>
                      Clear selection
                    </Button>
                  ) : null}
                </Stack>
                {pickedFile ? (
                  <Typography variant="caption" sx={{ color: "#4e5a54", wordBreak: "break-all" }}>
                    Selected: {pickedFile.name}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AdminCategoryDetail;

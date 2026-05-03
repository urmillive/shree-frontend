import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import {
  confirmAdminCategoryImage,
  deleteAdminCategory,
  fetchAdminCategoryById,
  getAdminCategoryUploadUrl,
  normalizeCategoryPayload,
  toggleAdminCategoryStatus,
} from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const AdminCategoryDetail = () => {
  const navigate = useNavigate();
  const { categoryId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [category, setCategory] = useState(null);
  const [uploadForm, setUploadForm] = useState({ contentType: "image/jpeg", fileName: "" });
  const [uploadData, setUploadData] = useState({ uploadUrl: "", key: "" });
  const [confirmKey, setConfirmKey] = useState("");
  const [busy, setBusy] = useState({ toggle: false, generate: false, confirm: false, remove: false });

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
      setConfirmKey(fetched?.imageKey || fetched?.image?.key || "");
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
  }, [isAdminAllowed, categoryId]);

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

  const handleGenerateUploadUrl = async () => {
    const fileName = uploadForm.fileName.trim();
    if (!fileName) {
      setFeedback({ type: "error", message: "File name is required for upload URL generation." });
      return;
    }
    await withBusy("generate", async () => {
      try {
        const { data } = await getAdminCategoryUploadUrl(categoryId.trim(), {
          contentType: uploadForm.contentType.trim() || "image/jpeg",
          fileName,
        });
        const payload = data?.data ?? data;
        const uploadUrl = payload?.uploadUrl || "";
        const key = payload?.key || "";
        setUploadData({ uploadUrl, key });
        if (key) setConfirmKey(key);
        setFeedback({ type: "success", message: "Upload URL generated. Upload your file to S3, then confirm key." });
      } catch (error) {
        setFeedback({
          type: "error",
          message: error?.response?.data?.message || error?.message || "Failed to generate upload URL.",
        });
      }
    });
  };

  const handleConfirmImage = async () => {
    if (!confirmKey.trim()) {
      setFeedback({ type: "error", message: "Provide the S3 key before confirmation." });
      return;
    }
    await withBusy("confirm", async () => {
      try {
        await confirmAdminCategoryImage(categoryId.trim(), { key: confirmKey.trim() });
        setFeedback({ type: "success", message: "Image confirmed successfully." });
        await loadCategory();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error?.response?.data?.message || error?.message || "Failed to confirm image.",
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
                <Typography sx={{ fontWeight: 700, color: "#1f2a24" }}>Category Image (S3 Presigned Flow)</Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                  Current image key: {imageKey || "-"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                  Current image URL: {imageUrl || "-"}
                </Typography>
                <TextField label="Content Type" size="small" value={uploadForm.contentType} onChange={(event) => setUploadForm((prev) => ({ ...prev, contentType: event.target.value }))} />
                <TextField label="File Name" size="small" placeholder="men-banner.jpg" value={uploadForm.fileName} onChange={(event) => setUploadForm((prev) => ({ ...prev, fileName: event.target.value }))} />
                <Button variant="outlined" onClick={handleGenerateUploadUrl} disabled={busy.generate} sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                  {busy.generate ? "Generating..." : "Generate Upload URL"}
                </Button>
                <TextField label="Upload URL (use for S3 PUT)" size="small" multiline minRows={2} value={uploadData.uploadUrl} InputProps={{ readOnly: true }} />
                <TextField label="S3 Key (from upload-url response or manual)" size="small" value={confirmKey} onChange={(event) => setConfirmKey(event.target.value)} />
                <Button variant="contained" onClick={handleConfirmImage} disabled={busy.confirm} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
                  {busy.confirm ? "Confirming..." : "Confirm Image"}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AdminCategoryDetail;

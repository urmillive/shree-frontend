import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Grid, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const normalizeBannerPayload = (payload) => {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.banner ?? root;
  }
  return null;
};

const getUploadPayload = (payload) => payload?.data ?? payload;

const extractUploadKey = (payload) => payload?.key || payload?.imageKey || payload?.upload?.key || "";

const ImageCard = ({ title, imageUrl, imageKey, selectedFile, onSelectFile, loading, onUpload }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: 2,
      border: `1px solid ${alpha("#0f3828", 0.1)}`,
      boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
      height: "100%",
    }}
  >
    <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1 }}>{title}</Typography>
    <Stack spacing={1.25}>
      <Typography variant="body2" sx={{ color: "#4e5a54", wordBreak: "break-word" }}>
        Key: {imageKey || "-"}
      </Typography>
      <Box
        sx={{
          height: 220,
          borderRadius: 1.5,
          border: `1px dashed ${alpha("#0f3828", 0.2)}`,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          bgcolor: alpha("#0f3828", 0.02),
          p: 1,
        }}
      >
        {imageUrl ? (
          <Box component="img" src={imageUrl} alt={title} sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 1 }} />
        ) : (
          <Typography variant="body2" sx={{ color: "#6f7f77" }}>
            No image uploaded yet
          </Typography>
        )}
      </Box>
      <Button component="label" variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
        {selectedFile ? "Change selected file" : imageUrl ? "Replace image" : "Choose image"}
        <Box component="input" type="file" sx={{ display: "none" }} accept="image/*" onChange={onSelectFile} />
      </Button>
      <Typography variant="caption" sx={{ color: "#6f7f77", minHeight: 18 }}>
        {selectedFile ? `Selected: ${selectedFile.name}` : "Select an image to upload."}
      </Typography>
      <Button
        variant="contained"
        disabled={loading || !selectedFile}
        onClick={onUpload}
        sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
      >
        {loading ? "Uploading..." : imageUrl ? "Replace & Save" : "Upload & Save"}
      </Button>
    </Stack>
  </Paper>
);

const AdminBannerImages = () => {
  const navigate = useNavigate();
  const { bannerId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [loadingDesktopUpload, setLoadingDesktopUpload] = useState(false);
  const [loadingMobileUpload, setLoadingMobileUpload] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [banner, setBanner] = useState(null);
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);

  const loadBanner = async () => {
    if (!bannerId.trim()) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get(`/admin/banners/${encodeURIComponent(bannerId.trim())}`);
      const fetchedBanner = normalizeBannerPayload(data);
      setBanner(fetchedBanner);
      if (!fetchedBanner || typeof fetchedBanner !== "object") {
        setFeedback({ type: "error", message: "Unexpected response from server." });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Failed to load banner.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) {
      loadBanner();
    }
  }, [isAdminAllowed, bannerId]);

  const uploadAndConfirm = async ({ file, isMobile }) => {
    if (!file) {
      setFeedback({ type: "error", message: "Please choose an image file first." });
      return;
    }
    const setLoadingUpload = isMobile ? setLoadingMobileUpload : setLoadingDesktopUpload;
    setLoadingUpload(true);
    setFeedback({ type: "", message: "" });
    try {
      const fileName = file.name || `banner-${Date.now()}.jpg`;
      const contentType = file.type || "image/jpeg";
      const uploadResponse = await client.post(`/admin/banners/${encodeURIComponent(bannerId.trim())}/upload-url`, {
        contentType,
        fileName,
        isMobile: Boolean(isMobile),
      });

      const uploadPayload = getUploadPayload(uploadResponse.data);
      const key = extractUploadKey(uploadPayload);
      if (!key) {
        throw new Error("Upload response is missing image key.");
      }

      await client.post(`/admin/banners/${encodeURIComponent(bannerId.trim())}/image-confirm`, {
        key: String(key).trim(),
        isMobile: Boolean(isMobile),
      });

      if (isMobile) setMobileFile(null);
      else setDesktopFile(null);
      setFeedback({ type: "success", message: `${isMobile ? "Mobile" : "Desktop"} image updated successfully.` });
      await loadBanner();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Failed to upload and confirm image.",
      });
    } finally {
      setLoadingUpload(false);
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

  const desktopImageKey = banner?.desktopImageKey || banner?.imageKey || banner?.image?.key || "";
  const mobileImageKey = banner?.mobileImageKey || banner?.mobileImage?.key || "";
  const desktopImageUrl = banner?.desktopImageUrl || banner?.imageUrl || banner?.image?.url || "";
  const mobileImageUrl = banner?.mobileImageUrl || banner?.mobileImage?.url || "";

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Banner Section", to: "/admin/homepage-cms/banners" },
            { label: "Banner Detail", to: `/admin/homepage-cms/${encodeURIComponent(bannerId.trim())}` },
            { label: "Manage Images" },
          ]}
        />

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Manage Banner Images
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate(`/admin/homepage-cms/${encodeURIComponent(bannerId.trim())}`)}>
              Back to detail
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadBanner}>
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
          <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, display: "grid", placeItems: "center" }}>
            <CircularProgress size={30} sx={{ color: accent }} />
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImageCard
                title="Desktop Banner Image"
                imageUrl={desktopImageUrl}
                imageKey={desktopImageKey}
                selectedFile={desktopFile}
                onSelectFile={(event) => setDesktopFile(event.target.files?.[0] || null)}
                loading={loadingDesktopUpload}
                onUpload={() => uploadAndConfirm({ file: desktopFile, isMobile: false })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImageCard
                title="Mobile Banner Image"
                imageUrl={mobileImageUrl}
                imageKey={mobileImageKey}
                selectedFile={mobileFile}
                onSelectFile={(event) => setMobileFile(event.target.files?.[0] || null)}
                loading={loadingMobileUpload}
                onUpload={() => uploadAndConfirm({ file: mobileFile, isMobile: true })}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default AdminBannerImages;

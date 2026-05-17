import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
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

const AdminBannerDetail = () => {
  const navigate = useNavigate();
  const { bannerId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [banner, setBanner] = useState(null);

  const setError = (message) => setFeedback({ type: "error", message: message || "Something went wrong." });
  const openImageInNewTab = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const loadBanner = async () => {
    if (!bannerId.trim()) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get(`/admin/banners/${encodeURIComponent(bannerId.trim())}`);
      const fetchedBanner = normalizeBannerPayload(data);
      setBanner(fetchedBanner);
      if (!fetchedBanner || typeof fetchedBanner !== "object") {
        setError("Unexpected response from server.");
      }
    } catch (error) {
      setError(error?.response?.data?.message || error?.message || "Failed to load banner.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) {
      loadBanner();
    }
  }, [isAdminAllowed, bannerId]);

  const handleSoftDelete = async () => {
    if (!window.confirm("Soft delete this banner?")) return;
    setLoadingDelete(true);
    setFeedback({ type: "", message: "" });
    try {
      await client.delete(`/admin/banners/${encodeURIComponent(bannerId.trim())}`);
      navigate("/admin/homepage-cms/banners");
    } catch (error) {
      setError(error?.response?.data?.message || error?.message || "Failed to delete banner.");
    } finally {
      setLoadingDelete(false);
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

  const desktopImageKey = banner?.desktopImageKey || banner?.imageKey || "";
  const mobileImageKey = banner?.mobileImageKey || banner?.mobileImage?.key || "";
  const desktopImageUrl = banner?.desktopImageUrl || banner?.imageUrl || banner?.image?.url || "";
  const mobileImageUrl = banner?.mobileImageUrl || banner?.mobileImage?.url || "";
  const bannerFields = [
    { label: "ID", value: banner?.id || banner?._id || "-" },
    { label: "Title", value: banner?.title || "-" },
    { label: "Subtitle", value: banner?.subtitle || "-" },
    { label: "CTA Text", value: banner?.ctaText || "-" },
    { label: "CTA URL", value: banner?.ctaUrl || "-" },
    { label: "Placement", value: banner?.placement || "-" },
    { label: "Display Order", value: banner?.displayOrder ?? "-" },
    { label: "Is Active", value: banner?.isActive ? "Yes" : "No" },
    { label: "Created By", value: banner?.createdBy || "-" },
    { label: "Created At", value: banner?.createdAt ? new Date(banner.createdAt).toLocaleString() : "-" },
    { label: "Updated At", value: banner?.updatedAt ? new Date(banner.updatedAt).toLocaleString() : "-" },
  ];
  const mid = Math.ceil(bannerFields.length / 2);
  const leftEntries = bannerFields.slice(0, mid);
  const rightEntries = bannerFields.slice(mid);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Banner Section", to: "/admin/homepage-cms/banners" },
            { label: "Banner Detail" },
          ]}
        />

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Banner Detail
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms/banners")}>
              Back to list
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.5) }} onClick={loadBanner}>
              Refresh
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={loadingDelete}
              sx={{ textTransform: "none", fontWeight: 700 }}
              onClick={handleSoftDelete}
            >
              {loadingDelete ? "Deleting..." : "Soft Delete"}
            </Button>
            <Button
              variant="contained"
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
              onClick={() => navigate(`/admin/homepage-cms/${encodeURIComponent(bannerId.trim())}/images`)}
            >
              Manage Images
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
            <Typography color="text.secondary">Loading banner...</Typography>
          </Paper>
        ) : banner ? (
          <Grid container spacing={2.5} display={"flex"} flexDirection={"column"} alignItems={"center"} justifyContent={"center"} >
            <Grid size={{ xs: 12 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 2,
                  border: `1px solid ${alpha("#0f3828", 0.1)}`,
                  boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
                }}
              >
                <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                  Banner
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", mb: 2, wordBreak: "break-word" }}>
                  {String(banner?.title || "Banner Detail")}
                </Typography>
                <Typography sx={{ color: "#6f7f77", fontWeight: 600 }}>
                  Status: {banner?.isActive ? "Active" : "Inactive"} | Placement: {String(banner?.placement || "-")}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      {leftEntries.map((field) => (
                        <Box key={field.label}>
                          <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                            {field.label}
                          </Typography>
                          <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                            {String(field.value ?? "-")}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      {rightEntries.map((field) => (
                        <Box key={field.label}>
                          <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                            {field.label}
                          </Typography>
                          <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                            {String(field.value ?? "-")}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
                      <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Desktop Image</Typography>
                      <Stack spacing={1}>
                        {/* <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                          Key: {desktopImageKey || banner?.image?.key || "-"}
                        </Typography> */}
                        <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                          URL:{" "}
                          {desktopImageUrl ? (  
                            <Box
                              component="span"
                              title={desktopImageUrl}
                              onClick={() => openImageInNewTab(desktopImageUrl)}
                              sx={{ color: accent, cursor: "pointer", textDecoration: "underline", wordBreak: "break-all" }}
                            >
                              {desktopImageUrl}
                            </Box>
                          ) : (
                            "-"
                          )}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }} sx={{ mt: 2 }}>  
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
                      <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Mobile Image</Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                          URL :{" "}
                          {mobileImageUrl ? (  
                            <Box
                              component="span"
                              title={mobileImageUrl}
                              onClick={() => openImageInNewTab(mobileImageUrl)}
                              sx={{ color: accent, cursor: "pointer", textDecoration: "underline", wordBreak: "break-all" }}
                            >
                              {mobileImageUrl}
                            </Box>
                          ) : (
                            "-"
                          )}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
              </Paper>

            </Grid>

          </Grid>
        ) : (
          <Alert severity="error">No banner data found.</Alert>
        )}

       
      </Box>
    </Box>
  );
};

export default AdminBannerDetail;

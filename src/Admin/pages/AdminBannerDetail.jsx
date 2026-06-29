import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";
const forest = "#0f3828";

const DETAIL_SKIP_KEYS = new Set([
  "desktopImageKey",
  "mobileImageKey",
  "desktopImageUrl",
  "mobileImageUrl",
  "imageKey",
  "imageUrl",
  "image",
  "mobileImage",
  "__v",
]);

const FIELD_LABEL_OVERRIDES = {
  _id: "ID",
  ctaText: "CTA Text",
  ctaUrl: "CTA URL",
  displayOrder: "Display Order",
  isActive: "Is Active",
  createdAt: "Created",
  updatedAt: "Updated",
  startsAt: "Starts At",
  endsAt: "Ends At",
  createdBy: "Created By",
};

function pickBannerId(banner) {
  if (!banner) return "";
  return String(banner._id ?? banner.id ?? "").trim();
}

function normalizeBannerPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.banner ?? root;
  }
  return root;
}

function normalizeBannerImages(banner) {
  if (!banner || typeof banner !== "object") return [];
  const images = [];
  const desktopUrl = String(banner.desktopImageUrl || banner.imageUrl || banner.image?.url || "").trim();
  const desktopKey = String(banner.desktopImageKey || banner.imageKey || banner.image?.key || "").trim();
  const mobileUrl = String(banner.mobileImageUrl || banner.mobileImage?.url || "").trim();
  const mobileKey = String(banner.mobileImageKey || banner.mobileImage?.key || "").trim();

  if (desktopUrl || desktopKey) {
    images.push({ label: "Desktop", key: desktopKey, url: desktopUrl });
  }
  if (mobileUrl || mobileKey) {
    images.push({ label: "Mobile", key: mobileKey, url: mobileUrl });
  }
  return images;
}

function formatFieldLabel(key) {
  if (FIELD_LABEL_OVERRIDES[key]) return FIELD_LABEL_OVERRIDES[key];
  return key.replace(/([A-Z])/g, " $1").trim();
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatFieldValue(key, v) {
  if (key === "createdAt" || key === "updatedAt" || key === "startsAt" || key === "endsAt") {
    return formatDateTime(v);
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

const AdminBannerDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bannerId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (!bannerId.trim()) {
      setLoading(false);
      setError("Missing banner id.");
      return;
    }

    let cancelled = false;

    const loadBanner = async () => {
      setLoading(true);
      setError("");
      setBanner(null);
      try {
        const { data } = await client.get(`/admin/banners/${encodeURIComponent(bannerId.trim())}`);
        if (cancelled) return;
        const normalized = normalizeBannerPayload(data);
        if (!normalized || typeof normalized !== "object") {
          setError("Unexpected response from server.");
          return;
        }
        setBanner(normalized);
      } catch (e) {
        if (cancelled) return;
        setError(getApiErrorMessage(e, "Failed to load banner."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBanner();
    return () => {
      cancelled = true;
    };
  }, [isAdminAllowed, bannerId]);

  useEffect(() => {
    setActiveTab(0);
  }, [bannerId]);

  useEffect(() => {
    const notice = location.state?.imageUploadNotice;
    if (!notice || !bannerId.trim()) return;
    setFeedback({ type: "error", message: String(notice) });
    navigate(`/admin/homepage-cms/${encodeURIComponent(bannerId.trim())}`, { replace: true, state: {} });
  }, [bannerId, location.state, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Soft-delete this banner?")) return;
    setDeleting(true);
    setFeedback({ type: "", message: "" });
    try {
      await client.delete(`/admin/banners/${encodeURIComponent(bannerId.trim())}`);
      navigate("/admin/homepage-cms/banners");
    } catch (e) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(e, "Failed to delete banner."),
      });
    } finally {
      setDeleting(false);
    }
  };

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(banner || {}).filter(([k]) => !DETAIL_SKIP_KEYS.has(k));
    const mid = Math.ceil(entries.length / 2);
    return {
      leftEntries: entries.slice(0, mid),
      rightEntries: entries.slice(mid),
    };
  }, [banner]);

  const images = useMemo(() => normalizeBannerImages(banner), [banner]);
  const hasImages = images.length > 0;

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

  const id = pickBannerId(banner);
  const displayName = String(banner?.title || "Banner");
  const statusLabel = banner?.isActive ? "Active" : "Inactive";
  const placementLabel = banner?.placement ? String(banner.placement) : "—";

  const cardSx = {
    p: { xs: 2, sm: 3 },
    borderRadius: 2,
    border: `1px solid ${alpha(forest, 0.1)}`,
    boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Banner Section", to: "/admin/homepage-cms/banners" },
            { label: loading ? "Banner" : displayName },
          ]}
        />

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: accent }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : banner ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Banner
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
              {displayName}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1.5}
              sx={{ mt: 0.5 }}
            >
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, fontSize: 13 }}>
                Status: {statusLabel} | Placement: {placementLabel}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => id && navigate(`/admin/homepage-cms/${encodeURIComponent(id)}/images`)}
                  disabled={!id}
                  sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}
                >
                  Manage Images
                </Button>
                <Button
                  variant="contained"
                  onClick={() => id && navigate(`/admin/homepage-cms/${encodeURIComponent(id)}/edit`)}
                  disabled={!id}
                  sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                >
                  Edit Banner
                </Button>
              </Stack>
            </Stack>

            <Tabs
              value={activeTab}
              onChange={(_, next) => setActiveTab(next)}
              sx={{
                mt: 2,
                mb: 0,
                minHeight: 44,
                borderBottom: `1px solid ${alpha(forest, 0.1)}`,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  minHeight: 44,
                  color: "#6f7f77",
                },
                "& .Mui-selected": { color: "#19271f" },
                "& .MuiTabs-indicator": { bgcolor: accent, height: 3, borderRadius: "3px 3px 0 0" },
              }}
            >
              <Tab label="Details" />
              <Tab label={hasImages ? `Images (${images.length})` : "Images (none)"} />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {activeTab === 0 ? (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.25}>
                    {leftEntries.map(([k, v]) => (
                      <Box key={k}>
                        <Typography
                          variant="caption"
                          sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                        >
                          {formatFieldLabel(k)}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                          {formatFieldValue(k, v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.25}>
                    {rightEntries.map(([k, v]) => (
                      <Box key={k}>
                        <Typography
                          variant="caption"
                          sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                        >
                          {formatFieldLabel(k)}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                          {formatFieldValue(k, v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            ) : (
              <Box>
                {hasImages ? (
                  <Stack spacing={2}>
                    {images.map((img) => (
                      <Box
                        key={img.label}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${alpha(forest, 0.1)}`,
                          bgcolor: alpha(forest, 0.02),
                        }}
                      >
                        <Typography variant="body2" sx={{ color: "#6f7f77", fontWeight: 600, mb: 0.5 }}>
                          {img.label}
                          {img.key ? ` · Key: ${img.key}` : ""}
                        </Typography>
                        {img.url ? (
                          <>
                            <Link
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="body2"
                              sx={{ color: accent, fontWeight: 600, wordBreak: "break-all", display: "block", mb: 1.5 }}
                            >
                              {img.url}
                            </Link>
                            <Box
                              component="a"
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: "inline-block", maxWidth: "100%", cursor: "pointer" }}
                            >
                              <Box
                                component="img"
                                src={img.url}
                                alt={`${displayName} ${img.label}`}
                                sx={{
                                  maxWidth: "100%",
                                  maxHeight: 280,
                                  objectFit: "contain",
                                  borderRadius: 2,
                                  border: `1px solid ${alpha(forest, 0.12)}`,
                                  display: "block",
                                  boxShadow: "0 6px 16px rgba(20, 55, 42, 0.08)",
                                }}
                              />
                            </Box>
                          </>
                        ) : (
                          <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                            No preview URL — use Edit Banner to upload.
                          </Typography>
                        )}
                      </Box>
                    ))}
                    <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                      Click a URL or image to open in a new tab. To replace images, use Edit Banner.
                    </Typography>
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No images yet</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77", mb: 2 }}>
                      Upload desktop and mobile banner images from Manage Images.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => id && navigate(`/admin/homepage-cms/${encodeURIComponent(id)}/images`)}
                      disabled={!id}
                      sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                    >
                      Manage Images
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ mt: 3, mb: 2 }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
              <Typography variant="caption" sx={{ color: "#8a9690", fontWeight: 600 }}>
                ID: {id || "—"}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={deleting}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {deleting ? "Deleting…" : "Soft Delete"}
              </Button>
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminBannerDetail;

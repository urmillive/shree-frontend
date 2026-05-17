import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";

const PLACEMENT_OPTIONS = [
  { value: "hero", label: "Hero" },
  { value: "promo_strip", label: "Promo strip" },
];

const SECTIONS = ["Details", "Schedule", "Images"];

const initialForm = {
  title: "",
  subtitle: "",
  ctaText: "",
  ctaUrl: "",
  placement: "hero",
  displayOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

const getInitialFormByPlacement = (placement) => ({
  ...initialForm,
  placement: placement === "promo_strip" ? "promo_strip" : "hero",
});

const formatForDateTimeInput = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoOrEmpty = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};

const normalizeBannerPayload = (payload) => {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.banner ?? root;
  }
  return root;
};

const pickBannerId = (banner) => {
  if (!banner) return "";
  return String(banner._id ?? banner.id ?? "").trim();
};

const mapBannerToForm = (banner) => ({
  title: String(banner?.title || ""),
  subtitle: String(banner?.subtitle || ""),
  ctaText: String(banner?.ctaText || ""),
  ctaUrl: String(banner?.ctaUrl || ""),
  placement: PLACEMENT_OPTIONS.some((o) => o.value === banner?.placement) ? banner.placement : "hero",
  displayOrder: Number(banner?.displayOrder) || 0,
  isActive: banner?.isActive !== false,
  startsAt: banner?.startsAt ? formatForDateTimeInput(banner.startsAt) : "",
  endsAt: banner?.endsAt ? formatForDateTimeInput(banner.endsAt) : "",
});

const getBannerDesktopUrl = (banner) =>
  String(banner?.desktopImageUrl || banner?.imageUrl || banner?.image?.url || "").trim();

const getBannerMobileUrl = (banner) =>
  String(banner?.mobileImageUrl || banner?.mobileImage?.url || "").trim();

const getUploadPayload = (payload) => payload?.data ?? payload;

const extractUploadKey = (payload) => payload?.key || payload?.imageKey || payload?.upload?.key || "";

async function uploadBannerImageFromFile(bannerId, file, { isMobile }) {
  const fileName = file.name || `banner-${Date.now()}.jpg`;
  const contentType = file.type || "image/jpeg";
  const uploadResponse = await client.post(`/admin/banners/${encodeURIComponent(bannerId)}/upload-url`, {
    contentType,
    fileName,
    isMobile: Boolean(isMobile),
  });

  const uploadPayload = getUploadPayload(uploadResponse.data);
  const key = extractUploadKey(uploadPayload);
  if (!key) {
    throw new Error("Upload response is missing image key.");
  }

  await client.post(`/admin/banners/${encodeURIComponent(bannerId)}/image-confirm`, {
    key: String(key).trim(),
    isMobile: Boolean(isMobile),
  });
}

const BannerImagePicker = ({ title, hint, file, previewUrl, existingUrl, onPick, onClear }) => {
  const displayUrl = previewUrl || existingUrl || "";
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${alpha("#0f3828", 0.12)}`,
        bgcolor: "#fcfcfc",
        height: "100%",
      }}
    >
      <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 0.5 }}>{title}</Typography>
      <Typography variant="caption" sx={{ color: "#5a6761", display: "block", mb: 1 }}>
        {hint}
      </Typography>
      <Box
        sx={{
          height: 160,
          borderRadius: 1.5,
          border: `1px dashed ${alpha("#0f3828", 0.2)}`,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          bgcolor: alpha("#0f3828", 0.02),
          mb: 1,
        }}
      >
        {displayUrl ? (
          <Box component="img" src={displayUrl} alt={title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Typography variant="body2" sx={{ color: "#6f7f77", px: 1, textAlign: "center" }}>
            No image selected
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" component="label" size="small" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
          {file ? "Change image" : displayUrl ? "Replace image" : "Choose image"}
          <Box component="input" type="file" sx={{ display: "none" }} accept="image/*" onChange={onPick} />
        </Button>
        {file ? (
          <Button size="small" variant="text" onClick={onClear} sx={{ textTransform: "none", fontWeight: 700 }}>
            Clear
          </Button>
        ) : null}
      </Stack>
      {file ? (
        <Typography variant="caption" sx={{ color: "#4e5a54", display: "block", mt: 0.75, wordBreak: "break-all" }}>
          Selected: {file.name}
        </Typography>
      ) : existingUrl && !file ? (
        <Typography variant="caption" sx={{ color: "#6f7f77", display: "block", mt: 0.75 }}>
          Current image shown above. Choose a file to replace it.
        </Typography>
      ) : null}
    </Paper>
  );
};

const AdminBanners = () => {
  const navigate = useNavigate();
  const { bannerId: routeBannerId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const roleGate = localStorage.getItem("role");
  const placementFromQuery = searchParams.get("placement");

  const isEditMode = Boolean(routeBannerId.trim());
  const editBannerId = routeBannerId.trim();

  const [bannerForm, setBannerForm] = useState(getInitialFormByPlacement(placementFromQuery));
  const [saving, setSaving] = useState(false);
  const [loadingBanner, setLoadingBanner] = useState(isEditMode);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobilePreview, setMobilePreview] = useState("");
  const [existingDesktopUrl, setExistingDesktopUrl] = useState("");
  const [existingMobileUrl, setExistingMobileUrl] = useState("");

  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  useEffect(() => {
    if (isEditMode) return;
    if (!placementFromQuery) return;
    if (!PLACEMENT_OPTIONS.some((option) => option.value === placementFromQuery)) return;
    setBannerForm(getInitialFormByPlacement(placementFromQuery));
  }, [placementFromQuery, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !isAdminAllowed || !editBannerId) return;

    let cancelled = false;

    const load = async () => {
      setLoadingBanner(true);
      setLoadError("");
      setError("");
      setDesktopFile(null);
      setMobileFile(null);
      try {
        const { data } = await client.get(`/admin/banners/${encodeURIComponent(editBannerId)}`);
        if (cancelled) return;
        const banner = normalizeBannerPayload(data);
        if (!banner || typeof banner !== "object") {
          setLoadError("Unexpected response from server.");
          return;
        }
        setBannerForm(mapBannerToForm(banner));
        setExistingDesktopUrl(getBannerDesktopUrl(banner));
        setExistingMobileUrl(getBannerMobileUrl(banner));
      } catch (e) {
        if (cancelled) return;
        setLoadError(getApiErrorMessage(e, "Failed to load banner."));
      } finally {
        if (!cancelled) setLoadingBanner(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, isAdminAllowed, editBannerId]);

  useEffect(() => {
    if (!desktopFile) {
      setDesktopPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(desktopFile);
    setDesktopPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [desktopFile]);

  useEffect(() => {
    if (!mobileFile) {
      setMobilePreview("");
      return undefined;
    }
    const url = URL.createObjectURL(mobileFile);
    setMobilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mobileFile]);

  const clearDesktopImage = () => setDesktopFile(null);

  const clearMobileImage = () => setMobileFile(null);

  const onPickDesktopImage = (event) => {
    const file = Array.from(event.target.files || []).find((f) => f && String(f.type || "").startsWith("image/"));
    if (!file) return;
    setDesktopFile(file);
    setError("");
  };

  const onPickMobileImage = (event) => {
    const file = Array.from(event.target.files || []).find((f) => f && String(f.type || "").startsWith("image/"));
    if (!file) return;
    setMobileFile(file);
    setError("");
  };

  const onFormChange = (key, value) => {
    setBannerForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildFieldsPayload = (forEdit) => {
    const startsAtIso = toIsoOrEmpty(bannerForm.startsAt);
    const endsAtIso = toIsoOrEmpty(bannerForm.endsAt);

    return {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim() || undefined,
      ctaText: bannerForm.ctaText.trim() || undefined,
      ctaUrl: bannerForm.ctaUrl.trim() || undefined,
      placement: bannerForm.placement,
      displayOrder: Number(bannerForm.displayOrder) || 0,
      isActive: Boolean(bannerForm.isActive),
      startsAt: startsAtIso || (forEdit ? null : undefined),
      endsAt: endsAtIso || (forEdit ? null : undefined),
    };
  };

  const uploadQueuedImages = async (bannerId, desktopSnapshot, mobileSnapshot) => {
    if (!desktopSnapshot && !mobileSnapshot) return "";
    try {
      if (desktopSnapshot) {
        await uploadBannerImageFromFile(bannerId, desktopSnapshot, { isMobile: false });
      }
      if (mobileSnapshot) {
        await uploadBannerImageFromFile(bannerId, mobileSnapshot, { isMobile: true });
      }
    } catch (imgErr) {
      return getApiErrorMessage(imgErr, "Banner was saved, but one or more images could not be uploaded.");
    }
    return "";
  };

  const handleCreateBanner = async (event) => {
    event.preventDefault();
    setError("");

    if (!bannerForm.title.trim()) {
      setError("Banner title is required.");
      return;
    }

    const desktopSnapshot = desktopFile;
    const mobileSnapshot = mobileFile;
    const payload = buildFieldsPayload(false);

    setSaving(true);
    let imageUploadError = "";

    try {
      const { data } = await client.post("/admin/banners", payload);
      if (data?.error) {
        setError(data.error);
        return;
      }

      const created = normalizeBannerPayload(data);
      const bannerId = pickBannerId(created);
      if (!bannerId) {
        setError("Banner created, but banner id was not found in response.");
        return;
      }

      imageUploadError = await uploadQueuedImages(bannerId, desktopSnapshot, mobileSnapshot);

      if (imageUploadError) {
        navigate(`/admin/homepage-cms/${encodeURIComponent(bannerId)}`, {
          state: { imageUploadNotice: imageUploadError },
        });
        return;
      }

      navigate(`/admin/homepage-cms/${encodeURIComponent(bannerId)}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create banner."));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBanner = async (event) => {
    event.preventDefault();
    setError("");

    if (!bannerForm.title.trim()) {
      setError("Banner title is required.");
      return;
    }

    const desktopSnapshot = desktopFile;
    const mobileSnapshot = mobileFile;
    const payload = buildFieldsPayload(true);

    setSaving(true);
    let imageUploadError = "";

    try {
      const { data } = await client.put(`/admin/banners/${encodeURIComponent(editBannerId)}`, payload);
      if (data?.error) {
        setError(data.error);
        return;
      }

      imageUploadError = await uploadQueuedImages(editBannerId, desktopSnapshot, mobileSnapshot);

      if (imageUploadError) {
        navigate(`/admin/homepage-cms/${encodeURIComponent(editBannerId)}`, {
          state: { imageUploadNotice: imageUploadError },
        });
        return;
      }

      navigate(`/admin/homepage-cms/${encodeURIComponent(editBannerId)}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update banner."));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = isEditMode ? handleUpdateBanner : handleCreateBanner;

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

  const pageTitle = isEditMode ? "Edit Banner" : "Create Banner";
  const breadcrumbLabel = isEditMode ? (loadingBanner ? "Edit Banner" : bannerForm.title.trim() || "Edit Banner") : "Create Banner";
  const detailPath = editBannerId ? `/admin/homepage-cms/${encodeURIComponent(editBannerId)}` : "/admin/homepage-cms/banners";

  const breadcrumbItems = [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Homepage CMS", to: "/admin/homepage-cms" },
    { label: "Banner Section", to: "/admin/homepage-cms/banners" },
  ];
  if (isEditMode) {
    breadcrumbItems.push({ label: bannerForm.title.trim() || "Banner", to: detailPath });
    breadcrumbItems.push({ label: "Edit" });
  } else {
    breadcrumbItems.push({ label: breadcrumbLabel });
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={breadcrumbItems} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 2 }}
        >
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            {pageTitle}
          </Typography>
          <Button
            variant="text"
            sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }}
            onClick={() => navigate(isEditMode ? detailPath : "/admin/homepage-cms/banners")}
          >
            {isEditMode ? "Back to banner" : "Back to banner list"}
          </Button>
        </Stack>

        {loadingBanner ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: accent }} />
          </Box>
        ) : loadError ? (
          <Alert severity="error">{loadError}</Alert>
        ) : (
          <Paper
            component="form"
            onSubmit={handleSubmit}
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
                Banner details
              </Typography>
              <Typography variant="body2" sx={{ color: "#5a6761" }}>
                {isEditMode
                  ? "Update content, schedule, and optionally replace desktop or mobile images."
                  : "Fill in content, schedule, and optional desktop/mobile images. Images upload automatically after the banner is created."}
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

            <Stack spacing={1.75}>
              <TextField
                label="Title"
                required
                fullWidth
                size="small"
                value={bannerForm.title}
                onChange={(event) => onFormChange("title", event.target.value)}
              />
              <TextField
                label="Subtitle"
                fullWidth
                size="small"
                value={bannerForm.subtitle}
                onChange={(event) => onFormChange("subtitle", event.target.value)}
              />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="CTA Button Text"
                    fullWidth
                    size="small"
                    value={bannerForm.ctaText}
                    onChange={(event) => onFormChange("ctaText", event.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="CTA URL"
                    fullWidth
                    size="small"
                    value={bannerForm.ctaUrl}
                    onChange={(event) => onFormChange("ctaUrl", event.target.value)}
                  />
                </Grid>
              </Grid>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="banner-placement-label">Placement</InputLabel>
                    <Select
                      labelId="banner-placement-label"
                      label="Placement"
                      value={bannerForm.placement}
                      onChange={(event) => onFormChange("placement", event.target.value)}
                    >
                      {PLACEMENT_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Display order"
                    type="number"
                    fullWidth
                    size="small"
                    value={bannerForm.displayOrder}
                    onChange={(event) => onFormChange("displayOrder", event.target.value)}
                  />
                </Grid>
              </Grid>
              <FormControl fullWidth size="small">
                <InputLabel id="banner-status-label">Status</InputLabel>
                <Select
                  labelId="banner-status-label"
                  label="Status"
                  value={bannerForm.isActive ? "active" : "inactive"}
                  onChange={(event) => onFormChange("isActive", event.target.value === "active")}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Start"
                    type="datetime-local"
                    fullWidth
                    size="small"
                    value={bannerForm.startsAt}
                    onChange={(event) => onFormChange("startsAt", event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="End"
                    type="datetime-local"
                    fullWidth
                    size="small"
                    value={bannerForm.endsAt}
                    onChange={(event) => onFormChange("endsAt", event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ mb: 0.75, fontWeight: 800, color: "#1f2a24" }}>Banner images</Typography>
              <Typography variant="body2" sx={{ mb: 1.5, color: "#5a6761" }}>
                {isEditMode
                  ? "Optional: choose new files to replace desktop or mobile images (presigned URL + confirm)."
                  : "Optional desktop and mobile images. They upload right after you create the banner (presigned URL + confirm)."}
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <BannerImagePicker
                    title="Desktop image"
                    hint="Shown on larger screens."
                    file={desktopFile}
                    previewUrl={desktopPreview}
                    existingUrl={existingDesktopUrl}
                    onPick={onPickDesktopImage}
                    onClear={clearDesktopImage}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <BannerImagePicker
                    title="Mobile image"
                    hint="Shown on phones and narrow viewports."
                    file={mobileFile}
                    previewUrl={mobilePreview}
                    existingUrl={existingMobileUrl}
                    onPick={onPickMobileImage}
                    onClear={clearMobileImage}
                  />
                </Grid>
              </Grid>
            </Box>

            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}
            <Stack direction="row" gap={2} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                type="button"
                onClick={() => navigate(isEditMode ? detailPath : "/admin/homepage-cms/banners")}
                disabled={saving}
                sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha("#0f3828", 0.25), color: "#1f2a24" }}
              >
                Discard
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  bgcolor: accent,
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#8f723c", boxShadow: "0 6px 18px rgba(171, 138, 72, 0.35)" },
                }}
              >
                {saving ? (isEditMode ? "Updating…" : "Creating…") : isEditMode ? "Update Banner" : "Create Banner"}
              </Button>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default AdminBanners;

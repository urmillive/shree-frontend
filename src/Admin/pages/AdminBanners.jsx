import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const getInitialFormByPlacement = (placement) => ({ ...initialForm, placement: placement === "promo_strip" ? "promo_strip" : "hero" });

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

const extractCreatedBanner = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const levelOne = payload.data ?? payload;
  if (!levelOne || typeof levelOne !== "object") return null;
  return levelOne.banner ?? levelOne;
};

const AdminBanners = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleGate = localStorage.getItem("role");
  const placementFromQuery = searchParams.get("placement");

  const [bannerForm, setBannerForm] = useState(getInitialFormByPlacement(placementFromQuery));
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [apiResult, setApiResult] = useState(null);

  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

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

  const setError = (message) => {
    setFeedback({ type: "error", message: message || "Something went wrong." });
  };

  const setSuccess = (message) => {
    setFeedback({ type: "success", message });
  };

  useEffect(() => {
    if (!placementFromQuery) return;
    if (!PLACEMENT_OPTIONS.some((option) => option.value === placementFromQuery)) return;
    setBannerForm(getInitialFormByPlacement(placementFromQuery));
  }, [placementFromQuery]);

  const handleCreateBanner = async (event) => {
    event.preventDefault();
    setLoadingCreate(true);
    setFeedback({ type: "", message: "" });

    try {
      const payload = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || undefined,
        ctaText: bannerForm.ctaText.trim() || undefined,
        ctaUrl: bannerForm.ctaUrl.trim() || undefined,
        placement: bannerForm.placement,
        displayOrder: Number(bannerForm.displayOrder) || 0,
        isActive: true,
        startsAt: toIsoOrEmpty(bannerForm.startsAt) || undefined,
        endsAt: toIsoOrEmpty(bannerForm.endsAt) || undefined,
      };

      const { data } = await client.post("/admin/banners", payload);
      const created = extractCreatedBanner(data);
      const id = created?._id ?? created?.id ?? "";
      setApiResult(data);
      if (data?.error) {
        setError(data?.error);
        return;
      } else {
        setSuccess("Banner created. Redirecting to details...");
        if (id) {
          navigate(`/admin/homepage-cms/${encodeURIComponent(String(id))}`);
        } else {
          setError("Banner created, but banner id was not found in response.");
        }
      }
    } catch (error) {
      setError(getApiErrorMessage(error, "Failed to create banner."));
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Homepage CMS", to: "/admin/homepage-cms" }, { label: "Banner Section", to: "/admin/homepage-cms/banners" }, { label: "Create Banner" }]} />
        <Button variant="text" sx={{ px: 0, mb: 1, color: "#2a4135", textTransform: "none", fontWeight: 600 }} onClick={() => navigate("/admin/homepage-cms/banners")}>
          Back to banner list
        </Button>
        <Typography variant="h5" sx={{ mb: 2, color: "#19271f", fontWeight: 800 }}>
          Homepage CMS - Banner Creation
        </Typography>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              component="form"
              onSubmit={handleCreateBanner}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: `1px solid ${alpha("#0f3828", 0.1)}`,
                boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
              }}
            >
              <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Create banner</Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Title"
                  required
                  value={bannerForm.title}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, title: event.target.value }))}
                  size="small"
                />
                <TextField
                  label="Subtitle"
                  value={bannerForm.subtitle}
                  onChange={(event) => setBannerForm((prev) => ({ ...prev, subtitle: event.target.value }))}
                  size="small"
                />
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="CTA Button Text"
                      value={bannerForm.ctaText}
                      onChange={(event) => setBannerForm((prev) => ({ ...prev, ctaText: event.target.value }))}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="CTA URL"
                      value={bannerForm.ctaUrl}
                      onChange={(event) => setBannerForm((prev) => ({ ...prev, ctaUrl: event.target.value }))}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      label="Placement"
                      value={bannerForm.placement}
                      onChange={(event) => setBannerForm((prev) => ({ ...prev, placement: event.target.value }))}
                      size="small"
                      fullWidth
                    >
                      {PLACEMENT_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Display order"
                      type="number"
                      size="small"
                      value={bannerForm.displayOrder}
                      onChange={(event) => setBannerForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Start"
                      type="datetime-local"
                      size="small"
                      value={formatForDateTimeInput(bannerForm.startsAt)}
                      onChange={(event) => setBannerForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="End"
                      type="datetime-local"
                      size="small"
                      value={formatForDateTimeInput(bannerForm.endsAt)}
                      onChange={(event) => setBannerForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Button type="submit" variant="contained" disabled={loadingCreate} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
                  {loadingCreate ? "Creating..." : "Create Banner"}
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper
          elevation={0}
          sx={{
            mt: 2.5,
            p: 2.5,
            borderRadius: 2,
            border: `1px solid ${alpha("#0f3828", 0.1)}`,
            boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
            overflowX: "auto",
          }}
        >
          <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1 }}>Latest API response</Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: alpha("#0f3828", 0.04),
              color: "#1f2a24",
              fontSize: 12,
              lineHeight: 1.45,
              maxHeight: 260,
              overflow: "auto",
            }}
          >
            {JSON.stringify(apiResult, null, 2) || "No response yet."}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminBanners;

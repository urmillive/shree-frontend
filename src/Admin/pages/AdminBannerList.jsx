import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatText = (value) => {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
};

const AdminBannerList = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [banners, setBanners] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [placementFilter, setPlacementFilter] = useState("");

  const loadBanners = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get("/admin/banners");
      const list = data?.data?.banners ?? data?.data?.items ?? data?.data ?? data?.items ?? data?.banners ?? [];
      setBanners(Array.isArray(list) ? list : []);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load banners."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) {
      loadBanners();
    }
  }, [isAdminAllowed]);

  const filteredRows = useMemo(() => {
    const search = searchInput.trim().toLowerCase();
    return banners.filter((banner) => {
      if (placementFilter && banner?.placement !== placementFilter) return false;
      if (!search) return true;
      const id = String(banner?._id || banner?.id || "").toLowerCase();
      const title = String(banner?.title || "").toLowerCase();
      const subtitle = String(banner?.subtitle || "").toLowerCase();
      const ctaText = String(banner?.ctaText || "").toLowerCase();
      return id.includes(search) || title.includes(search) || subtitle.includes(search) || ctaText.includes(search);
    });
  }, [banners, searchInput, placementFilter]);

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

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Banner Section" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Banner Section
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms")}>
              Back to CMS
            </Button>
            <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate("/admin/homepage-cms/create?placement=hero")}>
              Create Hero Banner
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={() => navigate("/admin/homepage-cms/create?placement=promo_strip")}>
              Create Stripe Banner
            </Button>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={loadBanners}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <TextField label="Search by ID, title, subtitle, CTA" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} size="small" fullWidth sx={{ maxWidth: { sm: 380 } }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="placement-filter-label">Placement</InputLabel>
            <Select labelId="placement-filter-label" label="Placement" value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="hero">hero</MenuItem>
              <MenuItem value="promo_strip">promo_strip</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Placement</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Display Order</TableCell>
                {/* <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Image Key</TableCell> */}
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: accent }} />
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#6f7f77" }}>
                    No banners found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((banner, index) => {
                  const bannerId = banner?._id || banner?.id || "";
                  return (
                    <TableRow key={bannerId || `banner-${index}`} hover sx={{ cursor: bannerId ? "pointer" : "default" }} onClick={() => bannerId && navigate(`/admin/homepage-cms/${encodeURIComponent(String(bannerId))}`)}>
                      <TableCell sx={{ color: "#1f2a24", minWidth: 180 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatText(banner?.title)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{formatDate(banner?.createdAt)}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{formatText(banner?.placement)}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{banner?.displayOrder ?? 0}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{banner?.isActive ? "Active" : "Inactive"}</TableCell>
                      {/* <TableCell sx={{ color: "#1f2a24", maxWidth: 280 }}>
                        <Typography variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {formatText(banner?.image?.key)}
                        </Typography>
                      </TableCell> */}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AdminBannerList;

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
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
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const normalizeSections = (payload) => {
  const levelOne = payload?.data ?? payload;
  if (!levelOne) return [];
  const list = levelOne.sections ?? levelOne.items ?? levelOne.data ?? levelOne;
  return Array.isArray(list) ? list : [];
};

const AdminProductListSections = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [sections, setSections] = useState([]);
  const [searchInput, setSearchInput] = useState("");

  const loadSections = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get("/admin/sections");
      const allSections = normalizeSections(data);
      setSections(allSections.filter((section) => section?.type === "product_list"));
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error?.message || "Failed to load product list sections.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) {
      loadSections();
    }
  }, [isAdminAllowed]);

  const filteredRows = useMemo(() => {
    const search = searchInput.trim().toLowerCase();
    if (!search) return sections;
    return sections.filter((section) => {
      const id = String(section?._id || section?.id || "").toLowerCase();
      const title = String(section?.title || "").toLowerCase();
      const subtitle = String(section?.subtitle || "").toLowerCase();
      return id.includes(search) || title.includes(search) || subtitle.includes(search);
    });
  }, [sections, searchInput]);

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
            { label: "Product List Sections" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Product List Sections
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms")}>
              Back to CMS
            </Button>
            <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate("/admin/homepage-cms/product-list-sections/create")}>
              Create Product List Section
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadSections}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <TextField label="Search by ID, title, subtitle" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} size="small" fullWidth sx={{ maxWidth: 380, mb: 2 }} />

        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Display Order</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Products</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: accent }} />
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: "#6f7f77" }}>
                    No product list sections found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((section, index) => {
                  const sectionId = section?._id || section?.id || "";
                  const productIds = Array.isArray(section?.productIds) ? section.productIds : [];
                  return (
                    <TableRow key={sectionId || `section-${index}`} hover sx={{ cursor: sectionId ? "pointer" : "default" }} onClick={() => sectionId && navigate(`/admin/homepage-cms/product-list-sections/${encodeURIComponent(String(sectionId))}`)}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1f2a24" }}>
                          {section?.title || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{section?.isActive ? "Active" : "Inactive"}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{section?.displayOrder ?? 0}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{productIds.length}</TableCell>
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

export default AdminProductListSections;

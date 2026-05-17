import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import { getApiErrorMessage } from "../../utils/apiError";
import { fetchAdminCategories, flattenCategories, normalizeCategoryListPayload } from "../services/adminCategoriesService";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const getCategoryTimestamp = (category, field) =>
  category?.[field] ?? category?.[field === "createdAt" ? "created_at" : "updated_at"];

const AdminCategories = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [searchInput, setSearchInput] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await fetchAdminCategories();
      setCategoriesTree(normalizeCategoryListPayload(data));
      setCategoriesFlat(flattenCategories(data));
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load categories."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAllowed) {
      loadCategories();
    }
  }, [isAdminAllowed]);

  const filteredRows = useMemo(() => {
    const search = searchInput.trim().toLowerCase();
    if (!search) return categoriesFlat;
    return categoriesFlat.filter((category) => {
      const id = getCategoryId(category).toLowerCase();
      const name = String(category?.name || "").toLowerCase();
      const pathLabel = String(category?._uiPathLabel || "").toLowerCase();
      return id.includes(search) || name.includes(search) || pathLabel.includes(search);
    });
  }, [categoriesFlat, searchInput]);

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
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Categories" }]} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Categories
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate("/admin/categories/create")}>
              Create Category
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadCategories}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <TextField label="Search categories by id/name/path" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} size="small" fullWidth sx={{ maxWidth: 380, mb: 2 }} />

        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Path</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Level</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Display Order</TableCell>
                {/* <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Updated At</TableCell> */}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: accent }} />
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#6f7f77" }}>
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((category, index) => {
                  const id = getCategoryId(category);
                  return (
                    <TableRow key={id || `category-${index}`} hover sx={{ cursor: id ? "pointer" : "default" }} onClick={() => id && navigate(`/admin/categories/${encodeURIComponent(id)}`)}>
                      <TableCell sx={{ color: "#1f2a24", fontWeight: 600 }}>{category?.name || "-"}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{category?._uiPathLabel || "-"}</TableCell>
                      <TableCell sx={{ color: "#1f2a24", whiteSpace: "nowrap" }}>{formatDate(getCategoryTimestamp(category, "createdAt"))}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{category?.level ?? 0}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>
                        <Chip label={category?.isActive ? "active" : "inactive"} size="small" color={category?.isActive ? "success" : "default"} />
                      </TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{category?.displayOrder ?? 0}</TableCell>
                      {/* <TableCell sx={{ color: "#1f2a24", whiteSpace: "nowrap" }}>{formatDate(getCategoryTimestamp(category, "updatedAt"))}</TableCell> */}
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

export default AdminCategories;

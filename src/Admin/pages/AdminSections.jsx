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

const normalizeSections = (payload) => {
  const levelOne = payload?.data ?? payload;
  if (!levelOne) return [];
  const list = levelOne.sections ?? levelOne.items ?? levelOne.data ?? levelOne;
  return Array.isArray(list) ? list : [];
};

const defaultCreateForm = {
  title: "",
  subtitle: "",
  type: "product_list",
  displayOrder: 0,
  isActive: true,
};

const AdminSections = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [sections, setSections] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createForm, setCreateForm] = useState(defaultCreateForm);

  const loadSections = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get("/admin/sections");
      setSections(normalizeSections(data));
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load sections."),
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
    return sections.filter((section) => {
      if (typeFilter && section?.type !== typeFilter) return false;
      if (!search) return true;
      const id = String(section?._id || section?.id || "").toLowerCase();
      const title = String(section?.title || "").toLowerCase();
      const subtitle = String(section?.subtitle || "").toLowerCase();
      return id.includes(search) || title.includes(search) || subtitle.includes(search);
    });
  }, [sections, searchInput, typeFilter]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        title: createForm.title.trim(),
        subtitle: createForm.subtitle.trim() || undefined,
        type: createForm.type,
        displayOrder: Number(createForm.displayOrder) || 0,
        isActive: Boolean(createForm.isActive),
      };
      const { data } = await client.post("/admin/sections", payload);
      const created = data?.data?.section ?? data?.section ?? data?.data ?? data;
      const id = created?._id ?? created?.id ?? "";
      setFeedback({ type: "success", message: "Section created successfully." });
      setCreateForm(defaultCreateForm);
      await loadSections();
      if (id) navigate(`/admin/homepage-cms/sections/${encodeURIComponent(String(id))}`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to create section."),
      });
    } finally {
      setCreating(false);
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

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Sections" },
          ]}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Homepage Sections
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms")}>
              Back to CMS
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

        <Paper
          component="form"
          onSubmit={handleCreate}
          elevation={0}
          sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)" }}
        >
          <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Create new section</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField label="Title" size="small" required value={createForm.title} onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))} fullWidth />
            <TextField label="Subtitle" size="small" value={createForm.subtitle} onChange={(event) => setCreateForm((prev) => ({ ...prev, subtitle: event.target.value }))} fullWidth />
            <TextField select label="Type" size="small" value={createForm.type} onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value }))} sx={{ minWidth: 170 }}>
              <MenuItem value="product_list">product_list</MenuItem>
              <MenuItem value="category_grid">category_grid</MenuItem>
            </TextField>
            <TextField
              label="Display Order"
              type="number"
              size="small"
              value={createForm.displayOrder}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
              sx={{ minWidth: 130 }}
            />
            <Button type="submit" variant="contained" disabled={creating} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </Stack>
        </Paper>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <TextField label="Search by ID, title, subtitle" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} size="small" fullWidth sx={{ maxWidth: { sm: 380 } }} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="type-filter-label">Type</InputLabel>
            <Select labelId="type-filter-label" label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="product_list">product_list</MenuItem>
              <MenuItem value="category_grid">category_grid</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Display Order</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Products</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Categories</TableCell>
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
                    No sections found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((section, index) => {
                  const sectionId = section?._id || section?.id || "";
                  const productIds = Array.isArray(section?.productIds) ? section.productIds : [];
                  const categoryIds = Array.isArray(section?.categoryIds) ? section.categoryIds : [];
                  return (
                    <TableRow key={sectionId || `section-${index}`} hover sx={{ cursor: sectionId ? "pointer" : "default" }} onClick={() => sectionId && navigate(`/admin/homepage-cms/sections/${encodeURIComponent(String(sectionId))}`)}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1f2a24" }}>
                          {section?.title || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{section?.type || "-"}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{section?.isActive ? "Active" : "Inactive"}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{section?.displayOrder ?? 0}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{productIds.length}</TableCell>
                      <TableCell sx={{ color: "#1f2a24" }}>{categoryIds.length}</TableCell>
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

export default AdminSections;

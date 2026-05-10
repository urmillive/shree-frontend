import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FiChevronDown } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function pickProductId(product) {
  if (!product) return null;
  return product._id ?? product.id ?? product.productId ?? null;
}

function normalizeProductPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.product ?? root;
  }
  return root;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function displayCategory(category) {
  if (category == null) return "—";
  if (typeof category === "object") return String(category.name ?? category._id ?? category.id ?? "—");
  return String(category);
}

const AdminProductDetail = () => {
  const navigate = useNavigate();
  const { productId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusNotice, setStatusNotice] = useState({ type: "", message: "" });

  const loadProduct = useCallback(async () => {
    const id = productId.trim();
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get(`/admin/products/${encodeURIComponent(id)}`);
      setProduct(normalizeProductPayload(data));
    } catch (e) {
      setProduct(null);
      setError(e?.response?.data?.message || e?.message || "Failed to load product.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isAdminAllowed) loadProduct();
  }, [isAdminAllowed, loadProduct]);

  const handleStatusMenuOpen = (event) => {
    setStatusNotice({ type: "", message: "" });
    setStatusMenuAnchor(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
  };

  const handleStatusChange = async (nextStatus) => {
    const id = productId.trim();
    if (!id || !product) return;
    if (String(nextStatus).toLowerCase() === String(product.status ?? "").toLowerCase()) {
      handleStatusMenuClose();
      return;
    }
    setStatusSaving(true);
    setStatusNotice({ type: "", message: "" });
    try {
      const { data } = await client.put(`/admin/products/${encodeURIComponent(id)}`, { status: nextStatus });
      const updated = normalizeProductPayload(data);
      if (updated && typeof updated === "object") {
        setProduct((prev) => ({ ...prev, ...updated, status: updated.status ?? nextStatus }));
      } else {
        setProduct((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
      setStatusNotice({ type: "success", message: `Status set to ${nextStatus}.` });
      handleStatusMenuClose();
    } catch (e) {
      setStatusNotice({
        type: "error",
        message: e?.response?.data?.message || e?.message || "Could not update status.",
      });
    } finally {
      setStatusSaving(false);
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

  const id = pickProductId(product);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const images = Array.isArray(product?.images) ? product.images : [];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Products", to: "/admin/products" },
            { label: product?.name ? String(product.name) : "Product detail" },
          ]}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Product detail
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Button
              variant="text"
              sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }}
              onClick={() => navigate("/admin/products")}
            >
              Back to list
            </Button>
            <Button
              variant="outlined"
              sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}
              onClick={loadProduct}
              disabled={loading}
            >
              Refresh
            </Button>
            {id && product ? (
              <>
                <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                  <Button
                    id="product-status-button"
                    aria-controls={statusMenuAnchor ? "product-status-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={statusMenuAnchor ? "true" : undefined}
                    variant="outlined"
                    size="small"
                    onClick={handleStatusMenuOpen}
                    disabled={statusSaving}
                    endIcon={<FiChevronDown size={18} />}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      color: "#1f2a24",
                      borderColor: alpha("#0f3828", 0.22),
                      minWidth: 148,
                      "&:hover": { borderColor: alpha(accent, 0.55), bgcolor: alpha(accent, 0.06) },
                    }}
                  >
                    {statusSaving ? "Updating…" : product.status ? String(product.status) : "Status"}
                  </Button>
                  <Menu
                    id="product-status-menu"
                    anchorEl={statusMenuAnchor}
                    open={Boolean(statusMenuAnchor)}
                    onClose={handleStatusMenuClose}
                    slotProps={{ paper: { sx: { minWidth: 200, borderRadius: 2 } } }}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <MenuItem
                        key={opt.value}
                        selected={String(product.status || "").toLowerCase() === opt.value}
                        disabled={statusSaving}
                        onClick={() => handleStatusChange(opt.value)}
                        sx={{ textTransform: "capitalize", fontWeight: 600 }}
                      >
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
                <Button
                  variant="contained"
                  sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                  onClick={() => navigate(`/admin/products/${encodeURIComponent(String(id))}/edit`)}
                >
                  Edit
                </Button>
              </>
            ) : null}
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {statusNotice.message ? (
          <Alert
            severity={statusNotice.type === "success" ? "success" : "error"}
            sx={{ mb: 2 }}
            onClose={() => setStatusNotice({ type: "", message: "" })}
          >
            {statusNotice.message}
          </Alert>
        ) : null}

        {loading ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              borderRadius: 2,
              border: `1px solid ${alpha("#0f3828", 0.1)}`,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={32} sx={{ color: accent }} />
          </Paper>
        ) : !product ? (
          <Alert severity="warning">No product data.</Alert>
        ) : (
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 800, color: "#1f2a24", mb: 1.5 }}>Overview</Typography>
              <Stack spacing={1}>
                {[
                  ["ID", id ? String(id) : "—"],
                  ["Name", product.name ?? "—"],
                  ["Slug", product.slug ?? "—"],
                  ["Brand", product.brand ?? "—"],
                  ["Status", product.status ?? "—"],
                  ["Category", displayCategory(product.category)],
                  ["Fabric", product.fabric ?? "—"],
                  ["Regular price", product.regularPrice != null ? String(product.regularPrice) : "—"],
                  ["Discount price", product.discountPrice != null ? String(product.discountPrice) : "—"],
                  ["Tax %", product.taxPercent != null ? String(product.taxPercent) : "—"],
                  ["Created", formatDateTime(product.createdAt)],
                  ["Updated", formatDateTime(product.updatedAt)],
                ].map(([label, value]) => (
                  <Typography key={label} variant="body2" sx={{ color: "#4e5a54" }}>
                    <Box component="span" sx={{ fontWeight: 700, color: "#2a4135", mr: 1 }}>
                      {label}:
                    </Box>
                    {value}
                  </Typography>
                ))}
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 800, color: "#1f2a24", mb: 1 }}>Description</Typography>
              <Typography variant="body2" sx={{ color: "#4e5a54", whiteSpace: "pre-wrap" }}>
                {product.description?.trim() ? product.description : "—"}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 800, color: "#1f2a24", mb: 1 }}>SEO</Typography>
              <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                Meta title: {product.seo?.metaTitle || product.metaTitle || "—"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#4e5a54", mt: 0.5 }}>
                Meta description: {product.seo?.metaDescription || product.metaDescription || "—"}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 800, color: "#1f2a24", mb: 1.5 }}>Tags</Typography>
              <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                {Array.isArray(product.tags) ? product.tags.join(", ") : product.tags || "—"}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, overflow: "auto" }}>
              <Typography sx={{ fontWeight: 800, color: "#1f2a24", mb: 1.5 }}>Variants</Typography>
              {variants.length === 0 ? (
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                  No variants.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Color</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Hex</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variants.map((v, i) => (
                      <TableRow key={v?._id || v?.id || `v-${i}`}>
                        <TableCell>{v?.color?.name ?? v?.colorName ?? "—"}</TableCell>
                        <TableCell>{v?.color?.hexCode ?? v?.colorHexCode ?? "—"}</TableCell>
                        <TableCell>{v?.size ?? "—"}</TableCell>
                        <TableCell>{v?.stock != null ? String(v.stock) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 800, color: "#1f2a24", mb: 1.5 }}>Images</Typography>
              {images.length === 0 ? (
                <Typography variant="body2" sx={{ color: "#4e5a54" }}>
                  No images.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {images.map((img, i) => (
                    <Typography key={img?.key || i} variant="body2" sx={{ color: "#4e5a54", wordBreak: "break-all" }}>
                      Order {img?.displayOrder ?? i}: {img?.key || img?.url || "—"}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AdminProductDetail;

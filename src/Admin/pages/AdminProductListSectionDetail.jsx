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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";
const forest = "#0f3828";

const DETAIL_SKIP_KEYS = new Set(["productIds", "categoryIds", "__v"]);

const FIELD_LABEL_OVERRIDES = {
  _id: "ID",
  displayOrder: "Display Order",
  isActive: "Is Active",
  createdAt: "Created",
  updatedAt: "Updated",
};

function pickSectionId(section) {
  if (!section) return "";
  return String(section._id ?? section.id ?? "").trim();
}

function normalizeSectionPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.section ?? root;
  }
  return root;
}

function normalizeProductPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.product ?? root;
  }
  return root;
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
  if (key === "createdAt" || key === "updatedAt") return formatDateTime(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

function getProductId(product) {
  return String(product?._id ?? product?.id ?? "").trim();
}

function getProductDisplayName(product) {
  const name = String(product?.name || product?.title || "").trim();
  const sku = String(product?.sku || "").trim();
  if (name && sku) return `${name} (${sku})`;
  if (name) return name;
  if (sku) return `SKU: ${sku}`;
  return getProductId(product) || "—";
}

const AdminProductListSectionDetail = () => {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [section, setSection] = useState(null);
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (!sectionId.trim()) {
      setLoading(false);
      setError("Missing section id.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setFeedback({ type: "", message: "" });
      setSection(null);
      setLinkedProducts([]);
      try {
        const { data } = await client.get(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
        if (cancelled) return;
        const fetched = normalizeSectionPayload(data);
        if (!fetched || typeof fetched !== "object") {
          setSection(null);
          setError("Unexpected response from server.");
          return;
        }
        if (fetched.type !== "product_list") {
          setSection(null);
          setError("This section is not a product_list section.");
          return;
        }
        setSection(fetched);
      } catch (e) {
        if (cancelled) return;
        setSection(null);
        setError(getApiErrorMessage(e, "Failed to load section."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdminAllowed, sectionId]);

  useEffect(() => {
    setActiveTab(0);
  }, [sectionId]);

  const productIds = useMemo(
    () => (Array.isArray(section?.productIds) ? section.productIds.map((id) => String(id).trim()).filter(Boolean) : []),
    [section],
  );

  useEffect(() => {
    if (!productIds.length) {
      setLinkedProducts([]);
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const results = await Promise.all(
          productIds.map(async (id) => {
            try {
              const { data } = await client.get(`/admin/products/${encodeURIComponent(id)}`);
              return normalizeProductPayload(data);
            } catch {
              return { _id: id, id };
            }
          }),
        );
        if (!cancelled) {
          setLinkedProducts(results.filter((item) => item && typeof item === "object"));
        }
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [productIds]);

  const handleDelete = async () => {
    if (!window.confirm("Soft-delete this section?")) return;
    setDeleting(true);
    setFeedback({ type: "", message: "" });
    try {
      await client.delete(`/admin/sections/${encodeURIComponent(sectionId.trim())}`);
      navigate("/admin/homepage-cms/product-list-sections");
    } catch (e) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(e, "Failed to delete section."),
      });
    } finally {
      setDeleting(false);
    }
  };

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(section || {}).filter(([k]) => !DETAIL_SKIP_KEYS.has(k));
    const mid = Math.ceil(entries.length / 2);
    return {
      leftEntries: entries.slice(0, mid),
      rightEntries: entries.slice(mid),
    };
  }, [section]);

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

  const id = pickSectionId(section);
  const displayTitle = String(section?.title || "Product List Section");
  const statusLabel = section?.isActive ? "Active" : "Inactive";
  const typeLabel = section?.type ? String(section.type) : "—";
  const productCount = productIds.length;

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
            { label: "Product List Sections", to: "/admin/homepage-cms/product-list-sections" },
            { label: loading ? "Section" : displayTitle },
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
        ) : section ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Product List Section
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
              {displayTitle}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1.5}
              sx={{ mt: 0.5 }}
            >
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, fontSize: 13 }}>
                Status: {statusLabel} | Type: {typeLabel} | Products: {productCount}
              </Typography>
              <Button
                variant="contained"
                onClick={() =>
                  id && navigate(`/admin/homepage-cms/product-list-sections/${encodeURIComponent(id)}/edit`)
                }
                disabled={!id}
                sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
              >
                Edit Section
              </Button>
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
              <Tab label={productCount ? `Products (${productCount})` : "Products (none)"} />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {activeTab === 0 ? (
              <>
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

                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(forest, 0.03),
                    border: `1px solid ${alpha(forest, 0.1)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}
                  >
                    Subtitle
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                    {section.subtitle?.trim() ? String(section.subtitle) : "—"}
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ overflow: "auto" }}>
                {loadingProducts ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={28} sx={{ color: accent }} />
                  </Box>
                ) : productCount === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No products</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77", mb: 2 }}>
                      Add products to this section from Edit Section.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() =>
                        id && navigate(`/admin/homepage-cms/product-list-sections/${encodeURIComponent(id)}/edit`)
                      }
                      disabled={!id}
                      sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                    >
                      Edit Section
                    </Button>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(accent, 0.08) }}>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productIds.map((pid, index) => {
                        const product = linkedProducts.find((item) => getProductId(item) === pid);
                        const productId = getProductId(product) || pid;
                        const hasDetails = Boolean(product?.name || product?.sku || product?.status);
                        return (
                          <TableRow key={pid}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell sx={{ maxWidth: 280, wordBreak: "break-word" }}>
                              {hasDetails ? getProductDisplayName(product) : pid}
                            </TableCell>
                            <TableCell>{product?.sku ? String(product.sku) : "—"}</TableCell>
                            <TableCell>{product?.status ? String(product.status) : "—"}</TableCell>
                            <TableCell align="right">
                              {productId ? (
                                <Link
                                  component="button"
                                  type="button"
                                  variant="body2"
                                  onClick={() => navigate(`/admin/products/${encodeURIComponent(productId)}`)}
                                  sx={{ color: accent, fontWeight: 700, textTransform: "none" }}
                                >
                                  View product
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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

export default AdminProductListSectionDetail;

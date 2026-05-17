import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
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

const PRODUCT_FLAG_FIELDS = [
  { key: "isTrending", label: "Trending" },
  { key: "isFeatured", label: "Featured" },
  { key: "isNewArrival", label: "New arrival" },
  { key: "isBestSeller", label: "Best seller" },
  { key: "isOnSale", label: "On sale" },
];

const PRODUCT_FLAG_KEYS = new Set(PRODUCT_FLAG_FIELDS.map(({ key }) => key));

const DETAIL_SKIP_KEYS = new Set([
  "variants",
  "images",
  "seo",
  "description",
  "category",
  "flags",
  "__v",
  ...PRODUCT_FLAG_KEYS,
]);

const FIELD_LABEL_OVERRIDES = {
  _id: "ID",
  regularPrice: "Regular Price",
  discountPrice: "Discount Price",
  taxPercent: "Tax %",
  metaTitle: "SEO Meta Title",
  metaDescription: "SEO Meta Description",
  createdAt: "Created",
  updatedAt: "Updated",
};

function pickProductId(product) {
  if (!product) return "";
  return String(product._id ?? product.id ?? product.productId ?? "").trim();
}

function normalizeProductPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.product ?? root;
  }
  return root;
}

function normalizeProductImages(product) {
  if (!Array.isArray(product?.images)) return [];
  return product.images
    .map((image, index) => ({
      key: image?.key || "",
      displayOrder: Number(image?.displayOrder ?? index),
      url: String(image?.url || image?.imageUrl || "").trim(),
    }))
    .filter((image) => Boolean(image.key || image.url))
    .sort((a, b) => a.displayOrder - b.displayOrder);
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

function displayCategory(category) {
  if (category == null) return "—";
  if (typeof category === "object") return String(category.name ?? category._id ?? category.id ?? "—");
  return String(category);
}

function mapFlagsFromProduct(product) {
  const flags = product?.flags && typeof product.flags === "object" ? product.flags : {};
  return Object.fromEntries(
    PRODUCT_FLAG_FIELDS.map(({ key }) => [key, Boolean(flags[key] ?? product?.[key])]),
  );
}

function formatFieldValue(key, v) {
  if (key === "createdAt" || key === "updatedAt") return formatDateTime(v);
  if (key === "tags") {
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    return v != null && String(v).trim() ? String(v) : "—";
  }
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

const AdminProductDetail = () => {
  const navigate = useNavigate();
  const { productId = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (!productId.trim()) {
      setLoading(false);
      setError("Missing product id.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setFeedback({ type: "", message: "" });
      setProduct(null);
      try {
        const { data } = await client.get(`/admin/products/${encodeURIComponent(productId.trim())}`);
        if (cancelled) return;
        const fetched = normalizeProductPayload(data);
        setProduct(fetched && typeof fetched === "object" ? fetched : null);
        if (!fetched || typeof fetched !== "object") {
          setError("Unexpected response from server.");
        }
      } catch (e) {
        if (cancelled) return;
        setProduct(null);
        setError(getApiErrorMessage(e, "Failed to load product."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdminAllowed, productId]);

  useEffect(() => {
    setActiveTab(0);
  }, [productId]);

  const handleDelete = async () => {
    if (!window.confirm("Soft-delete this product?")) return;
    setDeleting(true);
    setFeedback({ type: "", message: "" });
    try {
      await client.delete(`/admin/products/${encodeURIComponent(productId.trim())}`);
      navigate("/admin/products");
    } catch (e) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(e, "Failed to delete product."),
      });
    } finally {
      setDeleting(false);
    }
  };

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(product || {}).filter(([k]) => !DETAIL_SKIP_KEYS.has(k));
    entries.push(
      ["category", displayCategory(product?.category)],
      ["metaTitle", product?.seo?.metaTitle?.trim() || null],
      ["metaDescription", product?.seo?.metaDescription?.trim() || null],
    );
    const mid = Math.ceil(entries.length / 2);
    return {
      leftEntries: entries.slice(0, mid),
      rightEntries: entries.slice(mid),
    };
  }, [product]);

  const variants = useMemo(() => (Array.isArray(product?.variants) ? product.variants : []), [product]);
  const images = useMemo(() => normalizeProductImages(product), [product]);
  const productFlags = useMemo(() => mapFlagsFromProduct(product), [product]);
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

  const id = pickProductId(product);
  const displayName = String(product?.name || "Product");
  const statusLabel = product?.status ? String(product.status) : "—";
  const categoryLabel = displayCategory(product?.category);
  const brandLabel = product?.brand ? String(product.brand) : "—";

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
            { label: "Products", to: "/admin/products" },
            { label: loading ? "Product" : displayName },
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
        ) : product ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Product
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
                Status: {statusLabel} | Brand: {brandLabel} | Category: {categoryLabel}
              </Typography>
              <Button
                variant="contained"
                onClick={() => id && navigate(`/admin/products/${encodeURIComponent(id)}/edit`)}
                disabled={!id}
                sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
              >
                Edit Product
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
              <Tab label={`Variants (${variants.length})`} />
              <Tab label={hasImages ? `Images (${images.length})` : "Images (none)"} />
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
                    Description
                  </Typography>
                  {product.description?.trim() ? (
                    <Box
                      sx={{
                        color: "#1f2a24",
                        lineHeight: 1.7,
                        wordBreak: "break-word",
                        "& p": { m: 0, mb: 1.25, "&:last-child": { mb: 0 } },
                        "& ul, & ol": { pl: 2.5, my: 1 },
                        "& a": { color: accent, fontWeight: 600 },
                        "& img": { maxWidth: "100%", height: "auto", borderRadius: 1 },
                        "& table": { width: "100%", borderCollapse: "collapse", my: 1 },
                        "& th, & td": { border: `1px solid ${alpha(forest, 0.15)}`, p: 1, textAlign: "left" },
                      }}
                      dangerouslySetInnerHTML={{ __html: String(product.description) }}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ color: "#1f2a24" }}>
                      —
                    </Typography>
                  )}
                </Box>

                <Box
                  sx={{
                    mt: 2,
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
                    Product flags
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={0.5} useFlexGap flexWrap="wrap">
                    {PRODUCT_FLAG_FIELDS.map(({ key, label }) => (
                      <FormControlLabel
                        key={key}
                        control={
                          <Checkbox
                            checked={Boolean(productFlags[key])}
                            disabled
                            size="small"
                            sx={{ color: alpha(accent, 0.6), "&.Mui-checked": { color: accent } }}
                          />
                        }
                        label={label}
                        sx={{
                          mr: 2,
                          "& .MuiFormControlLabel-label": { fontSize: "0.9rem", color: "#2a4135", fontWeight: 600 },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </>
            ) : activeTab === 1 ? (
              <Box sx={{ overflow: "auto" }}>
                {variants.length === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No variants</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                      Add color, size, and stock variants from Edit Product.
                    </Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(accent, 0.08) }}>
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
              </Box>
            ) : (
              <Box>
                {hasImages ? (
                  <Stack spacing={2}>
                    {images.map((img, i) => (
                      <Box
                        key={img.key || img.url || `img-${i}`}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${alpha(forest, 0.1)}`,
                          bgcolor: alpha(forest, 0.02),
                        }}
                      >
                        <Typography variant="body2" sx={{ color: "#6f7f77", fontWeight: 600, mb: 0.5 }}>
                          Order {img.displayOrder}
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
                                alt={`${displayName} ${i + 1}`}
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
                            No preview URL — use Edit Product to manage images.
                          </Typography>
                        )}
                      </Box>
                    ))}
                    <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                      Click a URL or image to open in a new tab. To replace images, use Edit Product.
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
                      Upload product images from Edit Product.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => id && navigate(`/admin/products/${encodeURIComponent(id)}/edit`)}
                      disabled={!id}
                      sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                    >
                      Edit Product
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

export default AdminProductDetail;

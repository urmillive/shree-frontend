import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Container, Divider, Grid, Paper, Skeleton, Snackbar, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../../theme/theme";
import {
  fetchPublicProductBySlug,
  resolveProductImage,
  resolveProductName,
  resolveProductPrice,
} from "../services/publicProductsService";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import { getApiErrorMessage } from "../../utils/apiError";
import RecentlyViewedSection from "../components/RecentlyViewedSection";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const toBoolLabel = (value) => (value ? "Yes" : "No");
const toDateLabel = (value) => (value ? new Date(value).toLocaleString() : "-");
const normalizeHex = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { label: "-", valid: false };
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const upper = withHash.toUpperCase();
  const valid = /^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(upper);
  return { label: upper, valid };
};

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "success" });
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addCartItem, busy: cartBusy } = useCart();
  const { addWishlistProduct, deleteWishlistProduct, isInWishlist, busy: wishlistBusy, isAuthenticated } = useWishlist();
  const { trackProductView } = useRecentlyViewed();

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      if (!slug) {
        setProduct(null);
        setLoading(false);
        setError("Invalid product slug.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetchPublicProductBySlug(slug);
        if (cancelled) return;
        const payload = response?.data?.data ?? response?.data;
        const normalizedProduct = payload?.product ?? payload;
        setProduct(normalizedProduct);
      } catch (err) {
        if (cancelled) return;
        setProduct(null);
        setError(getApiErrorMessage(err, "Unable to load product details."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!product || loading || error) return;
    const productId = product?.id || product?._id;
    if (!productId) return;
    void trackProductView(productId);
  }, [product, loading, error, trackProductView]);

  const image = useMemo(() => resolveProductImage(product), [product]);
  const name = useMemo(() => resolveProductName(product), [product]);
  const price = useMemo(() => resolveProductPrice(product), [product]);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const tags = Array.isArray(product?.tags) ? product.tags : [];
  const flags = product?.flags || {};
  const selectedVariant = useMemo(
    () => variants.find((variant) => String(variant?.id || variant?._id || variant?.sku) === selectedVariantKey) || null,
    [selectedVariantKey, variants]
  );
  const selectedVariantStock = Number(selectedVariant?.availableStock ?? selectedVariant?.stock ?? 0);
  const isSelectedVariantOutOfStock = Boolean(selectedVariant) && selectedVariantStock <= 0;

  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariantKey("");
      return;
    }
    const inStockVariant = variants.find((variant) => Number(variant?.availableStock ?? variant?.stock ?? 0) > 0);
    const fallbackVariant = inStockVariant || variants[0];
    const fallbackKey = String(fallbackVariant?.id || fallbackVariant?._id || fallbackVariant?.sku || "");
    setSelectedVariantKey((prev) => (prev && variants.some((v) => String(v?.id || v?._id || v?.sku) === prev) ? prev : fallbackKey));
  }, [variants]);

  const showFeedback = (message, severity = "success") => {
    setFeedback({ open: true, message, severity });
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!selectedVariant) {
      showFeedback("Please select a variant first.", "warning");
      return;
    }
    if (isSelectedVariantOutOfStock) {
      showFeedback("Selected variant is out of stock.", "warning");
      return;
    }

    const productId = product?.id || product?._id;
    const variantId = selectedVariant?.id || selectedVariant?._id || selectedVariant?.sku;
    if (!productId || !variantId) {
      showFeedback("Unable to add this product to cart.", "error");
      return;
    }

    try {
      await addCartItem({ productId, variantId, quantity: 1 });
      showFeedback("Added to cart.");
    } catch (err) {
      showFeedback(getApiErrorMessage(err, "Unable to add item to cart."), "error");
    }
  };

  const handleAddToWishlist = () => {
    if (!product) return Promise.resolve();
    if (!isAuthenticated) {
      showFeedback("Please sign in to use wishlist.", "warning");
      navigate("/login");
      return Promise.resolve();
    }
    const productId = product?.id || product?._id;
    if (!productId) {
      showFeedback("Unable to update wishlist for this product.", "error");
      return Promise.resolve();
    }
    return (async () => {
      try {
        if (isWishlisted) {
          await deleteWishlistProduct(productId);
          setIsWishlisted(false);
          showFeedback("Removed from wishlist.");
          return;
        }
        await addWishlistProduct(productId);
        setIsWishlisted(true);
        showFeedback("Added to wishlist.");
      } catch (err) {
        showFeedback(getApiErrorMessage(err, "Unable to update wishlist."), "error");
      }
    })();
  };

  useEffect(() => {
    const productId = product?.id || product?._id;
    if (!productId || !isAuthenticated) {
      setIsWishlisted(false);
      return;
    }
    let cancelled = false;
    setWishlistLoading(true);
    isInWishlist(productId)
      .then((exists) => {
        if (!cancelled) setIsWishlisted(Boolean(exists));
      })
      .finally(() => {
        if (!cancelled) setWishlistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product, isAuthenticated, isInWishlist]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = name || "Product";
    const shareText = `${shareTitle} - ${INR.format(price)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        showFeedback("Product shared successfully.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showFeedback("Product link copied.");
    } catch {
      showFeedback("Unable to share this product.", "error");
    }
  };

  return (
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Product Details
          </Typography>

          {loading ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Skeleton variant="rounded" height={360} />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Skeleton variant="text" height={48} />
                <Skeleton variant="text" height={32} />
                <Skeleton variant="rounded" height={220} />
              </Grid>
            </Grid>
          ) : null}

          {!loading && error ? <Alert severity="error">{error}</Alert> : null}

          {!loading && !error && product ? (
            <>
            <Grid container spacing={2.2}>
              <Grid size={{ xs: 12, md: 5 }}>
                {image ? (
                  <Box
                    component="img"
                    src={image}
                    alt={name}
                    sx={{ width: "100%",

                    }}
                  />
                ) : (
                  <Paper
                    variant="solid"
                    sx={{
                      minHeight: 320,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Typography sx={{ color: alpha(colors.text, 0.5), fontWeight: 700 }}>No image available</Typography>
                  </Paper>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 7 }}>
                <Paper variant="solid" >
                  <Stack spacing={1.2}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {name}
                    </Typography>
                    <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 800 }}>
                      {INR.format(price)}
                    </Typography>
                    {product?.brand && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 800 }}>
                          Brand:
                        </Typography>
                        <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 800 }}>
                          {product.brand}
                        </Typography>
                      </Stack>
                    )}
                                   
                    {product?.regularPrice > 0 &&
                      <Typography variant="body2">
                        Regular Price: {INR.format(Number(product?.regularPrice ?? product?.price ?? 0))}
                      </Typography>
                    }
                    {product?.discountPrice > 0 &&
                      <Typography variant="body2">
                        Discount Price: {INR.format(Number(product?.discountPrice ?? 0))}
                      </Typography>
                    }
                    <Typography variant="body2">Tax Percent: {product?.taxPercent ?? 0}%</Typography>

                    {selectedVariant ? (
                      <Stack spacing={0.4}>
                        <Typography variant="body2" sx={{ color: isSelectedVariantOutOfStock ? "#D32F2F" : "#2E7D32", fontWeight: 700 }}>
                          {isSelectedVariantOutOfStock ? "Out of stock for selected variant" : `In stock: ${selectedVariantStock}`}
                        </Typography>
                        <Typography variant="body2" sx={{ color: alpha(colors.text, 0.82), fontWeight: 600 }}>
                          Selected Size: {selectedVariant?.size || "-"}
                        </Typography>
                      </Stack>
                    ) : null}

                    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                      <Chip label={`Fabric: ${product?.fabric || "-"}`} size="small" variant="outlined" />
                    </Stack>
                    <Stack spacing={0.6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Colors
                      </Typography>
                      {variants.length === 0 ? (
                        <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                          No color variants available.
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {variants.map((variant) => (
                            <Tooltip
                              key={variant?.id || variant?._id || variant?.sku}
                              title={`${variant?.color?.name || "Unknown color"}${variant?.size ? ` - Size ${variant.size}` : ""}`}
                              placement="top"
                              arrow
                            >
                              <Box
                                component="button"
                                type="button"
                                onClick={() => setSelectedVariantKey(String(variant?.id || variant?._id || variant?.sku))}
                                sx={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: "50%",
                                  cursor: "pointer",
                                  bgcolor: normalizeHex(variant?.color?.hexCode).valid ? normalizeHex(variant?.color?.hexCode).label : "#E0E0E0",
                                }}
                              />
                            </Tooltip>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => void handleAddToCart()}
                        disabled={!selectedVariant || isSelectedVariantOutOfStock || cartBusy}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        Add to cart
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => void handleAddToWishlist()}
                        disabled={wishlistBusy || wishlistLoading}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        {isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      </Button>
                      <Button variant="outlined" onClick={handleShare} sx={{ textTransform: "none", fontWeight: 700 }}>
                        Share
                      </Button>
                    </Stack>

                    <Divider />
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Paper variant="solid" >
                 
                  {product?.description ? (
                    <Box
                      sx={{
                        color: alpha(colors.text, 0.82),
                        lineHeight: 1.7,
                        "& img": { maxWidth: "100%", height: "auto" },
                        "& table": { width: "100%" },
                      }}
                      dangerouslySetInnerHTML={{ __html: String(product.description) }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75), lineHeight: 1.7 }}>
                      No description provided.
                    </Typography>
                  )}
                </Paper>
              </Grid>

            </Grid>
            <RecentlyViewedSection
              excludeProductId={product?.id || product?._id}
              title="Recently viewed"
              dense
            />
            </>
          ) : null}
        </Stack>
      </Container>
      <Snackbar
        open={feedback.open}
        autoHideDuration={2200}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={feedback.severity} onClose={() => setFeedback((prev) => ({ ...prev, open: false }))} sx={{ width: "100%" }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

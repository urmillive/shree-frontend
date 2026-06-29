import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiHeart, FiMinus, FiPlus, FiShare2 } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { colors, fonts } from "../../theme/theme";
import {
  fetchPublicProductBySlug,
  resolveProductImage,
  resolveProductName,
  resolveProductPrice,
} from "../services/publicProductsService";
import { useCart } from "../context/useCart";
import { useWishlist } from "../context/useWishlist";
import { useRecentlyViewed } from "../context/useRecentlyViewed";
import RecentlyViewedSection from "../components/RecentlyViewedSection";
import GoogleReviewsSection from "../components/GoogleReviewsSection";

const fmtINR = (amount) =>
  `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(amount) || 0
  )}`;

const normalizeHex = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { label: "-", valid: false };
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const upper = withHash.toUpperCase();
  const valid = /^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(upper);
  return { label: upper, valid };
};

const collectImages = (product) => {
  if (!product) return [];
  const images = Array.isArray(product?.images) ? product.images : [];
  const urls = images
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter((u) => typeof u === "string" && u.trim() !== "");
  const fallback = resolveProductImage(product);
  if (urls.length === 0 && fallback) urls.push(fallback);
  return urls;
};

const accordionSummarySx = {
  px: 0,
  py: 0,
  minHeight: "48px !important",
  "& .MuiAccordionSummary-content": { my: "14px !important" },
  "& .MuiAccordionSummary-expandIconWrapper": {
    transform: "none !important",
    color: colors.ink,
  },
};

const accordionSx = {
  bgcolor: "transparent",
  boxShadow: "none",
  borderTop: `1px solid ${colors.line}`,
  "&:before": { display: "none" },
  "&.Mui-expanded": { mt: 0 },
};

function AccordionSection({ id, label, expanded, onChange, children }) {
  const isOpen = expanded === id;
  return (
    <Accordion
      expanded={isOpen}
      onChange={(_, open) => onChange(open ? id : false)}
      disableGutters
      elevation={0}
      sx={accordionSx}
    >
      <AccordionSummary
        expandIcon={isOpen ? <FiMinus size={13} /> : <FiPlus size={13} />}
        sx={accordionSummarySx}
      >
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.03em",
            color: colors.ink,
          }}
        >
          {label}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

const bodyTextSx = {
  fontFamily: fonts.body,
  fontSize: 13,
  color: colors.muted,
  lineHeight: 1.85,
};

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expandedAccordion, setExpandedAccordion] = useState("description");
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const { addCartItem, busy: cartBusy } = useCart();
  const {
    addWishlistProduct,
    deleteWishlistProduct,
    isInWishlist,
    busy: wishlistBusy,
    isAuthenticated,
  } = useWishlist();
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
        setActiveImageIdx(0);
      } catch (err) {
        if (cancelled) return;
        setProduct(null);
        setError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "Unable to load product details."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadProduct();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!product || loading || error) return;
    const productId = product?.id || product?._id;
    if (!productId) return;
    void trackProductView(productId);
  }, [product, loading, error, trackProductView]);

  const name = useMemo(() => resolveProductName(product), [product]);
  const price = useMemo(() => resolveProductPrice(product), [product]);
  const images = useMemo(() => collectImages(product), [product]);
  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product?.variants]
  );
  const selectedVariant = useMemo(
    () =>
      variants.find(
        (v) => String(v?.id || v?._id || v?.sku) === selectedVariantKey
      ) || null,
    [selectedVariantKey, variants]
  );
  const selectedVariantStock = Number(
    selectedVariant?.availableStock ?? selectedVariant?.stock ?? 0
  );
  const isSelectedVariantOutOfStock =
    Boolean(selectedVariant) && selectedVariantStock <= 0;

  useEffect(() => {
    if (variants.length === 0) { setSelectedVariantKey(""); return; }
    const inStockVariant = variants.find(
      (v) => Number(v?.availableStock ?? v?.stock ?? 0) > 0
    );
    const fallback = inStockVariant || variants[0];
    const fallbackKey = String(fallback?.id || fallback?._id || fallback?.sku || "");
    setSelectedVariantKey((prev) =>
      prev && variants.some((v) => String(v?.id || v?._id || v?.sku) === prev)
        ? prev
        : fallbackKey
    );
  }, [variants]);

  const category =
    product?.category?.name ||
    product?.categoryName ||
    product?.category ||
    "";

  const isJewellery = useMemo(
    () => /jewel/i.test(category),
    [category]
  );

  const estimatedDelivery = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  const colorVariants = useMemo(() => {
    const seen = new Map();
    variants.forEach((v) => {
      const hex = normalizeHex(v?.color?.hexCode);
      const key = v?.color?.name || hex.label;
      if (!seen.has(key)) seen.set(key, { ...v, _hex: hex });
    });
    return Array.from(seen.values());
  }, [variants]);

  const sizeVariants = useMemo(() => {
    if (!selectedVariant) return [];
    const baseColor = selectedVariant?.color?.name;
    return baseColor
      ? variants.filter((v) => v?.color?.name === baseColor)
      : variants;
  }, [selectedVariant, variants]);

  const showFeedback = (message, severity = "success") =>
    setFeedback({ open: true, message, severity });

  const buildCartPayload = () => {
    const productId = product?.id || product?._id;
    const variantId = selectedVariant
      ? selectedVariant?.id || selectedVariant?._id || selectedVariant?.sku
      : undefined;
    return { productId, variantId };
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isJewellery && variants.length > 0 && !selectedVariant) {
      showFeedback("Please select a variant first.", "warning");
      return;
    }
    if (selectedVariant && isSelectedVariantOutOfStock) {
      showFeedback("Selected variant is out of stock.", "warning");
      return;
    }
    const { productId, variantId } = buildCartPayload();
    if (!productId) { showFeedback("Unable to add this product to cart.", "error"); return; }
    try {
      await addCartItem(variantId ? { productId, variantId, quantity } : { productId, quantity });
      showFeedback("Added to cart.");
    } catch (err) {
      showFeedback(
        err?.response?.data?.error?.message || err?.response?.data?.message || "Unable to add item to cart.",
        "error"
      );
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!isJewellery && variants.length > 0 && !selectedVariant) {
      showFeedback("Please select a variant first.", "warning");
      return;
    }
    if (selectedVariant && isSelectedVariantOutOfStock) {
      showFeedback("Selected variant is out of stock.", "warning");
      return;
    }
    const { productId, variantId } = buildCartPayload();
    if (!productId) { showFeedback("Unable to process.", "error"); return; }
    try {
      await addCartItem(variantId ? { productId, variantId, quantity } : { productId, quantity });
      navigate("/checkout");
    } catch (err) {
      showFeedback(
        err?.response?.data?.error?.message || err?.response?.data?.message || "Unable to process.",
        "error"
      );
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
    if (!productId) { showFeedback("Unable to update wishlist.", "error"); return Promise.resolve(); }
    return (async () => {
      try {
        if (isWishlisted) {
          await deleteWishlistProduct(productId);
          setIsWishlisted(false);
          showFeedback("Removed from wishlist.");
        } else {
          await addWishlistProduct(productId);
          setIsWishlisted(true);
          showFeedback("Added to wishlist.");
        }
      } catch (err) {
        showFeedback(
          err?.response?.data?.error?.message || err?.response?.data?.message || "Unable to update wishlist.",
          "error"
        );
      }
    })();
  };

  useEffect(() => {
    const productId = product?.id || product?._id;
    if (!productId || !isAuthenticated) { setIsWishlisted(false); return; }
    let cancelled = false;
    setWishlistLoading(true);
    isInWishlist(productId)
      .then((exists) => { if (!cancelled) setIsWishlisted(Boolean(exists)); })
      .finally(() => { if (!cancelled) setWishlistLoading(false); });
    return () => { cancelled = true; };
  }, [product, isAuthenticated, isInWishlist]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = name || "Product";
    const shareText = `${shareTitle} - ${fmtINR(price)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        showFeedback("Product shared.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showFeedback("Product link copied.");
    } catch {
      showFeedback("Unable to share this product.", "error");
    }
  };

  const isCtaDisabled =
    (!isJewellery && variants.length > 0 && !selectedVariant) ||
    isSelectedVariantOutOfStock ||
    cartBusy;

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, sm: 6 } }}
      >
        {/* ── Loading skeleton ── */}
        {loading ? (
          <Grid container spacing={{ xs: 3, md: 6 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" sx={{ aspectRatio: "3/4", bgcolor: colors.stone }} />
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} variant="rectangular" sx={{ width: 110, height: 135, bgcolor: colors.stone }} />
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                <Skeleton sx={{ bgcolor: colors.stone }} height={40} width="85%" />
                <Skeleton sx={{ bgcolor: colors.stone }} height={30} width="40%" />
                <Skeleton sx={{ bgcolor: colors.stone }} height={20} width="50%" />
                <Skeleton variant="rectangular" sx={{ bgcolor: colors.stone, mt: 2 }} height={44} />
                <Skeleton variant="rectangular" sx={{ bgcolor: colors.stone }} height={120} />
              </Stack>
            </Grid>
          </Grid>
        ) : null}

        {/* ── Error ── */}
        {!loading && error ? (
          <Alert severity="error" sx={{ borderRadius: 0, border: `1px solid ${colors.danger}` }}>
            {error}
          </Alert>
        ) : null}

        {/* ── Product detail ── */}
        {!loading && !error && product ? (
          <>
            <Grid container spacing={{ xs: 4, md: 7 }}>
              {/* ─── Left: Image gallery ─── */}
              <Grid size={{ xs: 12, md: 6 }}>
                {/* Main image */}
                <Box
                  sx={{
                    aspectRatio: "3 / 4",
                    overflow: "hidden",
                    bgcolor: colors.stone,
                    position: "relative",
                  }}
                >
                  {images.length > 0 ? (
                    <Box
                      component="img"
                      src={images[activeImageIdx] || images[0]}
                      alt={name}
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <Box sx={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                      <Typography sx={{ fontFamily: fonts.display, fontSize: 64, color: colors.muted }}>
                        {name?.charAt(0) || "S"}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Thumbnails row */}
                {images.length > 1 ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ mt: 1.5, flexWrap: "wrap" }}
                  >
                    {images.map((img, idx) => (
                      <Box
                        key={img}
                        onClick={() => setActiveImageIdx(idx)}
                        sx={{
                          width: { xs: 88, sm: 108 },
                          height: { xs: 108, sm: 132 },
                          flexShrink: 0,
                          cursor: "pointer",
                          overflow: "hidden",
                          border:
                            idx === activeImageIdx
                              ? `1.5px solid ${colors.ink}`
                              : `1px solid ${colors.line}`,
                          opacity: idx === activeImageIdx ? 1 : 0.65,
                          transition: "opacity 200ms, border-color 200ms",
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        <Box
                          component="img"
                          src={img}
                          alt=""
                          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </Box>
                    ))}
                  </Stack>
                ) : null}
              </Grid>

              {/* ─── Right: Info panel ─── */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ position: { md: "sticky" }, top: { md: 100 } }}>

                  {/* Product name */}
                  <Typography
                    component="h1"
                    sx={{
                      fontFamily: fonts.display,
                      fontSize: { xs: 24, sm: 32 },
                      fontWeight: 500,
                      color: colors.ink,
                      lineHeight: 1.2,
                      letterSpacing: "-0.005em",
                      mb: 2,
                    }}
                  >
                    {name}
                  </Typography>

                  {/* Price row */}
                  <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 0.5 }}>
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 22,
                        fontWeight: 600,
                        color: colors.ink,
                      }}
                    >
                      {fmtINR(price)}
                    </Typography>
                    {Number(product?.regularPrice) > Number(price) ? (
                      <Typography
                        sx={{
                          fontFamily: fonts.body,
                          fontSize: 14,
                          color: colors.muted,
                          textDecoration: "line-through",
                        }}
                      >
                        {fmtINR(Number(product.regularPrice))}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Typography sx={{ ...bodyTextSx, fontSize: 12, mb: 3 }}>
                    Inclusive of all taxes
                  </Typography>

                  <Box sx={{ height: 1, bgcolor: colors.line, mb: 3 }} />

                  {/* ── Variant selectors — hidden for Jewellery ── */}
                  {!isJewellery && (
                    <>
                      {colorVariants.length > 0 ? (
                        <Box sx={{ mb: 2.5 }}>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 11,
                              letterSpacing: "0.22em",
                              textTransform: "uppercase",
                              fontWeight: 500,
                              color: colors.ink,
                              mb: 1.25,
                            }}
                          >
                            Colour
                            {selectedVariant?.color?.name
                              ? ` — ${selectedVariant.color.name}`
                              : ""}
                          </Typography>
                          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                            {colorVariants.map((variant) => {
                              const hex = variant._hex;
                              const isSelected =
                                selectedVariant?.color?.name === variant?.color?.name;
                              return (
                                <Tooltip
                                  key={variant?.id || variant?._id || variant?.sku}
                                  title={variant?.color?.name || "Colour"}
                                  placement="top"
                                  arrow
                                >
                                  <Box
                                    component="button"
                                    type="button"
                                    onClick={() =>
                                      setSelectedVariantKey(
                                        String(variant?.id || variant?._id || variant?.sku)
                                      )
                                    }
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      cursor: "pointer",
                                      bgcolor: hex.valid ? hex.label : "#E0E0E0",
                                      border: `1px solid ${isSelected ? colors.ink : colors.line}`,
                                      boxShadow: isSelected
                                        ? `inset 0 0 0 2px ${colors.ivory}, 0 0 0 1.5px ${colors.ink}`
                                        : "none",
                                      padding: 0,
                                      transition: "box-shadow 200ms",
                                    }}
                                  />
                                </Tooltip>
                              );
                            })}
                          </Stack>
                        </Box>
                      ) : null}

                      {sizeVariants.length > 0 ? (
                        <Box sx={{ mb: 2.5 }}>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 11,
                              letterSpacing: "0.22em",
                              textTransform: "uppercase",
                              fontWeight: 500,
                              color: colors.ink,
                              mb: 1.25,
                            }}
                          >
                            Size
                          </Typography>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {sizeVariants.map((variant) => {
                              const key = String(variant?.id || variant?._id || variant?.sku);
                              const isSelected = selectedVariantKey === key;
                              const isOOS =
                                Number(variant?.availableStock ?? variant?.stock ?? 0) <= 0;
                              return (
                                <Box
                                  key={key}
                                  component="button"
                                  type="button"
                                  onClick={() => setSelectedVariantKey(key)}
                                  disabled={isOOS}
                                  sx={{
                                    minWidth: 52,
                                    px: 1.5,
                                    py: 1,
                                    cursor: isOOS ? "not-allowed" : "pointer",
                                    border: `1px solid ${isSelected ? colors.ink : colors.line}`,
                                    bgcolor: isSelected ? colors.ink : "transparent",
                                    color: isSelected ? colors.ivory : isOOS ? colors.muted : colors.ink,
                                    fontFamily: fonts.body,
                                    fontSize: 12,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    fontWeight: 500,
                                    opacity: isOOS ? 0.42 : 1,
                                    textDecoration: isOOS ? "line-through" : "none",
                                    transition: "all 200ms",
                                  }}
                                >
                                  {variant?.size || "—"}
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      ) : null}

                      {selectedVariant ? (
                        <Typography
                          sx={{
                            fontFamily: fonts.body,
                            fontSize: 12,
                            color: isSelectedVariantOutOfStock ? colors.danger : colors.success,
                            mb: 2,
                          }}
                        >
                          {isSelectedVariantOutOfStock
                            ? "Out of stock for this size"
                            : selectedVariantStock <= 5
                            ? `Only ${selectedVariantStock} left`
                            : "In stock"}
                        </Typography>
                      ) : null}
                    </>
                  )}

                  {/* ── Quantity + CTA row ── */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ sm: "center" }}
                    sx={{ mb: 2 }}
                  >
                    {/* Quantity control */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{
                        border: `1px solid ${colors.line}`,
                        height: 44,
                        flexShrink: 0,
                        width: 120,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        sx={{ width: 40, height: 44, borderRadius: 0, color: colors.ink }}
                      >
                        <FiMinus size={12} />
                      </IconButton>
                      <Typography
                        sx={{
                          flex: 1,
                          textAlign: "center",
                          fontFamily: fonts.body,
                          fontSize: 14,
                          fontWeight: 500,
                          color: colors.ink,
                          userSelect: "none",
                        }}
                      >
                        {quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setQuantity((q) => q + 1)}
                        sx={{ width: 40, height: 44, borderRadius: 0, color: colors.ink }}
                      >
                        <FiPlus size={12} />
                      </IconButton>
                    </Stack>

                    {/* ADD TO CART */}
                    <Button
                      variant="outlined"
                      onClick={() => void handleAddToCart()}
                      disabled={isCtaDisabled}
                      sx={{
                        flex: 1,
                        height: 44,
                        borderRadius: 0,
                        borderColor: colors.ink,
                        color: colors.ink,
                        fontFamily: fonts.body,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        "&:hover": {
                          borderColor: colors.ink,
                          bgcolor: colors.ink,
                          color: colors.ivory,
                        },
                      }}
                    >
                      ADD TO CART
                    </Button>

                    {/* BUY IT NOW */}
                    <Button
                      variant="contained"
                      onClick={() => void handleBuyNow()}
                      disabled={isCtaDisabled}
                      sx={{
                        flex: 1,
                        height: 44,
                        borderRadius: 0,
                        bgcolor: colors.wine,
                        color: "#fff",
                        fontFamily: fonts.body,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        boxShadow: "none",
                        "&:hover": { bgcolor: "#4e1520", boxShadow: "none" },
                        "&.Mui-disabled": { bgcolor: colors.stone, color: colors.muted },
                      }}
                    >
                      BUY IT NOW
                    </Button>
                  </Stack>

                  {/* Estimated delivery */}
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: colors.muted,
                      mb: 2.5,
                    }}
                  >
                    Est Delivery by:{" "}
                    <Box component="span" sx={{ fontWeight: 600, color: colors.ink }}>
                      {estimatedDelivery}
                    </Box>
                  </Typography>

                  {/* Wishlist + Share */}
                  <Stack direction="row" spacing={0.5} sx={{ mb: 2.5 }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => void handleAddToWishlist()}
                      disabled={wishlistBusy || wishlistLoading}
                      startIcon={
                        <FiHeart
                          size={13}
                          fill={isWishlisted ? colors.wine : "none"}
                          color={isWishlisted ? colors.wine : colors.muted}
                        />
                      }
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 12,
                        color: colors.muted,
                        textTransform: "none",
                        letterSpacing: 0,
                        px: 1,
                        "&:hover": { bgcolor: "transparent", color: colors.ink },
                      }}
                    >
                      {isWishlisted ? "Saved" : "Save to Wishlist"}
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleShare}
                      startIcon={<FiShare2 size={13} color={colors.muted} />}
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 12,
                        color: colors.muted,
                        textTransform: "none",
                        letterSpacing: 0,
                        px: 1,
                        "&:hover": { bgcolor: "transparent", color: colors.ink },
                      }}
                    >
                      Share
                    </Button>
                  </Stack>

                  {/* ── Accordion sections ── */}
                  <AccordionSection
                    id="description"
                    label="Description"
                    expanded={expandedAccordion}
                    onChange={setExpandedAccordion}
                  >
                    {product?.description ? (
                      <Box
                        sx={{
                          ...bodyTextSx,
                          "& img": { maxWidth: "100%", height: "auto", my: 1.5 },
                          "& table": { width: "100%", borderCollapse: "collapse" },
                          "& p": { margin: "0 0 10px 0" },
                          "& ul, & ol": { paddingInlineStart: "18px" },
                          "& li": { margin: "0 0 6px 0" },
                          "& strong, & b": { color: colors.ink, fontWeight: 600 },
                        }}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(String(product.description), {
                            ALLOWED_TAGS: [
                              "p","br","strong","em","u","b","i",
                              "ul","ol","li","h1","h2","h3","h4","h5","h6",
                              "blockquote","a","img","table","thead","tbody","tr","th","td",
                              "span","div",
                            ],
                            ALLOWED_ATTR: ["href","src","alt","title","target","rel"],
                            ALLOW_DATA_ATTR: false,
                          }),
                        }}
                      />
                    ) : (
                      <Typography sx={bodyTextSx}>No description provided.</Typography>
                    )}
                  </AccordionSection>

                  <AccordionSection
                    id="returns"
                    label="Returns & Exchange"
                    expanded={expandedAccordion}
                    onChange={setExpandedAccordion}
                  >
                    <Typography sx={bodyTextSx}>
                      We accept returns and exchanges within 7 days of delivery. Items must be
                      unused, unworn, and in original packaging with all tags intact. To initiate
                      a return, please contact our support team with your order details.
                      Custom and personalised pieces are non-returnable.
                    </Typography>
                  </AccordionSection>

                  <AccordionSection
                    id="shipping"
                    label="Shipping"
                    expanded={expandedAccordion}
                    onChange={setExpandedAccordion}
                  >
                    <Typography sx={bodyTextSx}>
                      We ship across India with standard delivery in 3–7 business days and
                      express delivery in 1–3 business days. All orders are carefully packed and
                      insured during transit. Free shipping on orders above Rs.&nbsp;999.
                      International shipping is available to select countries — delivery time
                      varies by location.
                    </Typography>
                  </AccordionSection>

                  <AccordionSection
                    id="jewellery-care"
                    label="Jewellery Care"
                    expanded={expandedAccordion}
                    onChange={setExpandedAccordion}
                  >
                    <Box sx={bodyTextSx}>
                      <p style={{ margin: "0 0 8px 0" }}>
                        To keep your jewellery looking its best:
                      </p>
                      <ul style={{ paddingInlineStart: 18, margin: 0 }}>
                        <li>Store in the provided box or a soft pouch away from sunlight.</li>
                        <li>Avoid contact with water, perfume, and lotions.</li>
                        <li>Remove before sleeping, bathing, or exercising.</li>
                        <li>Wipe gently with a soft, dry cloth after each wear.</li>
                        <li>Keep individual pieces separate to prevent scratching.</li>
                      </ul>
                    </Box>
                  </AccordionSection>

                  <AccordionSection
                    id="size-guide"
                    label="Size Guide"
                    expanded={expandedAccordion}
                    onChange={setExpandedAccordion}
                  >
                    <Typography sx={bodyTextSx}>
                      Necklace lengths are measured from end to end. Most of our necklaces
                      come with an adjustable thread or extender chain for a comfortable fit.
                      Rings are available in standard Indian sizes (1–30). For bangles, measure
                      the widest part of your hand when making a fist. Please refer to the
                      product description for exact dimensions or contact us for assistance.
                    </Typography>
                  </AccordionSection>

                  {/* Bottom border close */}
                  <Box sx={{ borderBottom: `1px solid ${colors.line}` }} />
                </Box>
              </Grid>
            </Grid>

            {/* ── Recently viewed ── */}
            <RecentlyViewedSection
              excludeProductId={product?.id || product?._id}
              title="You may also like"
              dense={false}
            />

            <GoogleReviewsSection />
          </>
        ) : null}
      </Container>

      <Snackbar
        open={feedback.open}
        autoHideDuration={2400}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={feedback.severity}
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%", borderRadius: 0 }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

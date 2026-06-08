import { useEffect, useMemo, useState } from "react";
import {
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
import { FiHeart, FiShare2 } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { colors, fonts } from "../../theme/theme";
import {
  fetchPublicProductBySlug,
  resolveProductImage,
  resolveProductName,
  resolveProductPrice,
} from "../services/publicProductsService";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import RecentlyViewedSection from "../components/RecentlyViewedSection";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

const sectionLabelSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.ink,
  mb: 1.5,
};

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const name = useMemo(() => resolveProductName(product), [product]);
  const price = useMemo(() => resolveProductPrice(product), [product]);
  const images = useMemo(() => collectImages(product), [product]);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const selectedVariant = useMemo(
    () =>
      variants.find(
        (variant) =>
          String(variant?.id || variant?._id || variant?.sku) ===
          selectedVariantKey
      ) || null,
    [selectedVariantKey, variants]
  );
  const selectedVariantStock = Number(
    selectedVariant?.availableStock ?? selectedVariant?.stock ?? 0
  );
  const isSelectedVariantOutOfStock =
    Boolean(selectedVariant) && selectedVariantStock <= 0;

  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariantKey("");
      return;
    }
    const inStockVariant = variants.find(
      (variant) => Number(variant?.availableStock ?? variant?.stock ?? 0) > 0
    );
    const fallbackVariant = inStockVariant || variants[0];
    const fallbackKey = String(
      fallbackVariant?.id || fallbackVariant?._id || fallbackVariant?.sku || ""
    );
    setSelectedVariantKey((prev) =>
      prev &&
      variants.some(
        (v) => String(v?.id || v?._id || v?.sku) === prev
      )
        ? prev
        : fallbackKey
    );
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
    const variantId =
      selectedVariant?.id || selectedVariant?._id || selectedVariant?.sku;
    if (!productId || !variantId) {
      showFeedback("Unable to add this product to cart.", "error");
      return;
    }

    try {
      await addCartItem({ productId, variantId, quantity: 1 });
      showFeedback("Added to cart.");
    } catch (err) {
      showFeedback(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to add item to cart.",
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
        showFeedback(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            "Unable to update wishlist.",
          "error"
        );
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
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        showFeedback("Product shared.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showFeedback("Product link copied.");
    } catch {
      showFeedback("Unable to share this product.", "error");
    }
  };

  const category =
    product?.category?.name ||
    product?.categoryName ||
    product?.category ||
    "";

  // group variants by color for swatches
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
    const list = baseColor
      ? variants.filter((v) => v?.color?.name === baseColor)
      : variants;
    return list;
  }, [selectedVariant, variants]);

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1440, px: { xs: 3, sm: 5 }, py: { xs: 4, sm: 6 } }}
      >
        {loading ? (
          <Grid container spacing={{ xs: 3, md: 6 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Skeleton
                variant="rectangular"
                sx={{ aspectRatio: "3 / 4", borderRadius: 0, bgcolor: colors.stone }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={2}>
                <Skeleton sx={{ bgcolor: colors.stone }} width="30%" />
                <Skeleton sx={{ bgcolor: colors.stone }} height={48} width="80%" />
                <Skeleton sx={{ bgcolor: colors.stone }} width="40%" />
                <Skeleton variant="rectangular" sx={{ bgcolor: colors.stone, mt: 2 }} height={200} />
              </Stack>
            </Grid>
          </Grid>
        ) : null}

        {!loading && error ? (
          <Alert
            severity="error"
            sx={{ borderRadius: 0, border: `1px solid ${colors.danger}` }}
          >
            {error}
          </Alert>
        ) : null}

        {!loading && !error && product ? (
          <>
            <Grid container spacing={{ xs: 3, md: 6 }}>
              {/* Image gallery */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack
                  direction={{ xs: "column-reverse", sm: "row" }}
                  spacing={{ xs: 1.5, sm: 2 }}
                >
                  {images.length > 1 ? (
                    <Stack
                      direction={{ xs: "row", sm: "column" }}
                      spacing={1}
                      sx={{
                        width: { xs: "auto", sm: 80 },
                        flexShrink: 0,
                        overflowX: { xs: "auto", sm: "visible" },
                      }}
                    >
                      {images.map((img, idx) => (
                        <Box
                          key={img}
                          onClick={() => setActiveImageIdx(idx)}
                          sx={{
                            width: { xs: 60, sm: 76 },
                            height: { xs: 80, sm: 96 },
                            flexShrink: 0,
                            cursor: "pointer",
                            overflow: "hidden",
                            border:
                              idx === activeImageIdx
                                ? `1px solid ${colors.ink}`
                                : `1px solid ${colors.line}`,
                            opacity: idx === activeImageIdx ? 1 : 0.7,
                            transition: "opacity 200ms",
                            "&:hover": { opacity: 1 },
                          }}
                        >
                          <Box
                            component="img"
                            src={img}
                            alt=""
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                  <Box
                    sx={{
                      flex: 1,
                      aspectRatio: "3 / 4",
                      overflow: "hidden",
                      bgcolor: colors.stone,
                    }}
                  >
                    {images.length > 0 ? (
                      <Box
                        component="img"
                        src={images[activeImageIdx] || images[0]}
                        alt={name}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: fonts.display,
                            fontSize: 48,
                            color: colors.muted,
                          }}
                        >
                          {name?.charAt(0) || "S"}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Grid>

              {/* Info panel */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ position: { md: "sticky" }, top: { md: 120 } }}>
                  {category ? (
                    <Typography sx={{ ...eyebrowSx, mb: 1.5 }}>
                      {category}
                    </Typography>
                  ) : null}
                  <Typography
                    component="h1"
                    sx={{
                      fontFamily: fonts.display,
                      fontSize: { xs: 30, sm: 38 },
                      fontWeight: 500,
                      color: colors.ink,
                      lineHeight: 1.15,
                      letterSpacing: "-0.005em",
                      mb: 2,
                    }}
                  >
                    {name}
                  </Typography>

                  <Stack
                    direction="row"
                    alignItems="baseline"
                    spacing={1.5}
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 22,
                        fontWeight: 500,
                        color: colors.ink,
                      }}
                    >
                      {INR.format(price)}
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
                        {INR.format(Number(product.regularPrice))}
                      </Typography>
                    ) : null}
                  </Stack>
                  {Number(product?.taxPercent) > 0 ? (
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 12,
                        color: colors.muted,
                        mb: 3,
                      }}
                    >
                      Incl. {product.taxPercent}% taxes
                    </Typography>
                  ) : (
                    <Box sx={{ mb: 3 }} />
                  )}

                  <Box
                    sx={{
                      height: 1,
                      bgcolor: colors.line,
                      my: 3,
                    }}
                  />

                  {product?.brand ? (
                    <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                      <Typography sx={eyebrowSx}>Brand</Typography>
                      <Typography
                        sx={{
                          fontFamily: fonts.body,
                          fontSize: 13,
                          fontWeight: 500,
                          color: colors.ink,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {product.brand}
                      </Typography>
                    </Stack>
                  ) : null}

                  {colorVariants.length > 0 ? (
                    <Box sx={{ mb: 3 }}>
                      <Typography sx={sectionLabelSx}>
                        Colour{selectedVariant?.color?.name ? ` — ${selectedVariant.color.name}` : ""}
                      </Typography>
                      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                        {colorVariants.map((variant) => {
                          const hex = variant._hex;
                          const isSelected =
                            selectedVariant?.color?.name ===
                            variant?.color?.name;
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
                                    String(
                                      variant?.id || variant?._id || variant?.sku
                                    )
                                  )
                                }
                                sx={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: "50%",
                                  cursor: "pointer",
                                  bgcolor: hex.valid ? hex.label : "#E0E0E0",
                                  border: `1px solid ${
                                    isSelected ? colors.ink : colors.line
                                  }`,
                                  boxShadow: isSelected
                                    ? `inset 0 0 0 2px ${colors.ivory}, 0 0 0 1px ${colors.ink}`
                                    : "none",
                                  padding: 0,
                                  transition:
                                    "box-shadow 200ms cubic-bezier(0.2,0.7,0.2,1)",
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </Stack>
                    </Box>
                  ) : null}

                  {sizeVariants.length > 0 ? (
                    <Box sx={{ mb: 3 }}>
                      <Typography sx={sectionLabelSx}>Size</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {sizeVariants.map((variant) => {
                          const key = String(
                            variant?.id || variant?._id || variant?.sku
                          );
                          const isSelected = selectedVariantKey === key;
                          const isOOS =
                            Number(
                              variant?.availableStock ?? variant?.stock ?? 0
                            ) <= 0;
                          return (
                            <Box
                              key={key}
                              component="button"
                              type="button"
                              onClick={() => setSelectedVariantKey(key)}
                              disabled={isOOS}
                              sx={{
                                minWidth: 56,
                                px: 1.5,
                                py: 1.1,
                                cursor: isOOS ? "not-allowed" : "pointer",
                                border: `1px solid ${
                                  isSelected ? colors.ink : colors.line
                                }`,
                                bgcolor: isSelected
                                  ? colors.ink
                                  : "transparent",
                                color: isSelected
                                  ? colors.ivory
                                  : isOOS
                                  ? colors.muted
                                  : colors.ink,
                                fontFamily: fonts.body,
                                fontSize: 12,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                fontWeight: 500,
                                opacity: isOOS ? 0.45 : 1,
                                textDecoration: isOOS ? "line-through" : "none",
                                transition:
                                  "all 200ms cubic-bezier(0.2,0.7,0.2,1)",
                                "&:hover": isOOS
                                  ? {}
                                  : {
                                      borderColor: colors.ink,
                                    },
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
                        letterSpacing: "0.04em",
                        color: isSelectedVariantOutOfStock
                          ? colors.danger
                          : colors.success,
                        mb: 3,
                      }}
                    >
                      {isSelectedVariantOutOfStock
                        ? "Out of stock for this size"
                        : selectedVariantStock <= 5
                        ? `Only ${selectedVariantStock} left`
                        : "In stock"}
                    </Typography>
                  ) : null}

                  {/* CTAs */}
                  <Stack spacing={1.5} sx={{ mb: 3 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => void handleAddToCart()}
                      disabled={
                        !selectedVariant ||
                        isSelectedVariantOutOfStock ||
                        cartBusy
                      }
                      sx={{ py: 1.75 }}
                    >
                      {isSelectedVariantOutOfStock
                        ? "Out of stock"
                        : "Add to bag"}
                    </Button>
                    <Stack direction="row" spacing={1.5}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => void handleAddToWishlist()}
                        disabled={wishlistBusy || wishlistLoading}
                        startIcon={
                          <FiHeart
                            size={14}
                            fill={isWishlisted ? colors.wine : "none"}
                            color={isWishlisted ? colors.wine : "currentColor"}
                          />
                        }
                      >
                        {isWishlisted ? "Saved" : "Save"}
                      </Button>
                      <IconButton
                        onClick={handleShare}
                        aria-label="Share product"
                        sx={{
                          border: `1px solid ${colors.ink}`,
                          borderRadius: 0,
                          width: 48,
                          color: colors.ink,
                          "&:hover": {
                            borderColor: colors.wine,
                            color: colors.wine,
                            backgroundColor: "transparent",
                          },
                        }}
                      >
                        <FiShare2 size={16} />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {/* Spec rows */}
                  <Box
                    sx={{
                      borderTop: `1px solid ${colors.line}`,
                      pt: 2.5,
                    }}
                  >
                    {[
                      { label: "Fabric", value: product?.fabric },
                      {
                        label: "Care",
                        value: product?.care || "See product tag",
                      },
                      {
                        label: "Origin",
                        value: product?.origin || "Made in India",
                      },
                    ]
                      .filter((r) => r.value)
                      .map((row) => (
                        <Stack
                          key={row.label}
                          direction="row"
                          justifyContent="space-between"
                          sx={{ py: 1.25 }}
                        >
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 11,
                              letterSpacing: "0.22em",
                              textTransform: "uppercase",
                              color: colors.muted,
                              fontWeight: 500,
                            }}
                          >
                            {row.label}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 13,
                              color: colors.ink,
                              letterSpacing: "0.02em",
                            }}
                          >
                            {row.value}
                          </Typography>
                        </Stack>
                      ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Description block */}
            <Box sx={{ mt: { xs: 8, sm: 12 }, pt: 6, borderTop: `1px solid ${colors.line}` }}>
              <Grid container spacing={{ xs: 3, md: 6 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography sx={eyebrowSx}>The Details</Typography>
                  <Typography
                    component="h2"
                    sx={{
                      mt: 1,
                      fontFamily: fonts.display,
                      fontSize: { xs: 26, sm: 32 },
                      fontWeight: 500,
                      color: colors.ink,
                      letterSpacing: "-0.005em",
                      lineHeight: 1.15,
                    }}
                  >
                    About this piece
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  {product?.description ? (
                    <Box
                      sx={{
                        color: colors.ink2,
                        lineHeight: 1.85,
                        fontSize: 14.5,
                        fontFamily: fonts.body,
                        "& img": { maxWidth: "100%", height: "auto", my: 2 },
                        "& table": { width: "100%" },
                        "& p": { marginBlock: "0 0 16px 0" },
                        "& ul, & ol": { paddingInlineStart: "20px" },
                        "& li": { marginBlock: "0 0 8px 0" },
                        "& strong": { color: colors.ink, fontWeight: 600 },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(String(product.description), {
                          ALLOWED_TAGS: [
                            "p", "br", "strong", "em", "u", "b", "i",
                            "ul", "ol", "li",
                            "h1", "h2", "h3", "h4", "h5", "h6",
                            "blockquote", "a", "img",
                            "table", "thead", "tbody", "tr", "th", "td",
                            "span", "div",
                          ],
                          ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
                          ALLOW_DATA_ATTR: false,
                        }),
                      }}
                    />
                  ) : (
                    <Typography
                      sx={{ color: colors.muted, fontSize: 14 }}
                    >
                      No description provided.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>

            {/* Recently viewed */}
            <RecentlyViewedSection
              excludeProductId={product?.id || product?._id}
              title="You may also like"
              dense={false}
            />
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
          onClose={() =>
            setFeedback((prev) => ({ ...prev, open: false }))
          }
          sx={{ width: "100%", borderRadius: 0 }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

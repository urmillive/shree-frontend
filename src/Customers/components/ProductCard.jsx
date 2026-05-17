import { useMemo } from "react";
import { Box, Button, Card, CardActionArea, CardContent, CardMedia, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { colors } from "../../theme/theme";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  resolveProductImage,
  resolveProductName,
  resolveProductPrice,
} from "../services/publicProductsService";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const mobileChevronBounce = keyframes`
  0%, 100% { transform: translateY(0); opacity: 0.85; }
  50% { transform: translateY(-5px); opacity: 1; }
`;

const mobileBarShimmer = keyframes`
  0% { background-position: 120% 0; }
  100% { background-position: -20% 0; }
`;

function pickDefaultVariant(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return null;
  const inStock = variants.find((v) => Number(v?.availableStock ?? v?.stock ?? 0) > 0);
  return inStock || variants[0];
}

export default function ProductCard({ product, quickActions = false }) {
  const navigate = useNavigate();
  const { showSuccess, showWarning, showError } = useToast();
  const { addCartItem, busy: cartBusy } = useCart();
  const { wishlist, addWishlistProduct, deleteWishlistProduct, busy: wishlistBusy, isAuthenticated } = useWishlist();

  const name = resolveProductName(product);
  const image = resolveProductImage(product);
  const price = resolveProductPrice(product);
  const productSlug = product?.slug || product?.id || product?._id || "";
  const productId = product?.id || product?._id;
  const defaultVariant = pickDefaultVariant(product);
  const variantStock = Number(defaultVariant?.availableStock ?? defaultVariant?.stock ?? 0);
  const variantOutOfStock = Boolean(defaultVariant) && variantStock <= 0;
  const variantId = defaultVariant ? defaultVariant?.id || defaultVariant?._id || defaultVariant?.sku : null;

  const wishlistItems = wishlist.items;
  const wishlisted = useMemo(() => {
    if (!productId || !Array.isArray(wishlistItems)) return false;
    const pid = String(productId);
    return wishlistItems.some((item) => {
      const itemPid = String(item.productId || item.product?.id || item.product?._id || "");
      const itemId = String(item.id || "");
      return itemPid === pid || itemId === pid;
    });
  }, [wishlistItems, productId]);

  const canAddToCart = Boolean(productId && variantId && defaultVariant && !variantOutOfStock);

  const handleAddToCart = async () => {
    if (!canAddToCart) {
      showWarning(variantOutOfStock ? "This product is out of stock." : "Open the product page to choose options.");
      return;
    }
    try {
      await addCartItem({ productId, variantId, quantity: 1 });
      showSuccess("Added to cart.");
    } catch (err) {
      showError(getApiErrorMessage(err, "Unable to add item to cart."));
    }
  };

  const addToCartDisabled = !canAddToCart || cartBusy;
  const addToCartTooltip = cartBusy
    ? "Please wait…"
    : variantOutOfStock
      ? "Out of stock"
      : !defaultVariant
        ? "Open product to choose options"
        : !productId || !variantId
          ? "Can't add this item"
          : "";

  const handleWishlistToggle = async () => {
    if (!productId) {
      showError("Unable to update wishlist for this product.");
      return;
    }
    if (!isAuthenticated) {
      showWarning("Please sign in to use the wishlist.");
      navigate("/login");
      return;
    }
    try {
      if (wishlisted) {
        await deleteWishlistProduct(productId);
        showSuccess("Removed from wishlist.");
      } else {
        await addWishlistProduct(productId);
        showSuccess("Added to wishlist.");
      }
    } catch (err) {
      showError(getApiErrorMessage(err, "Unable to update wishlist."));
    }
  };

  const addToCartButton = (
    <Button
      fullWidth
      size="small"
      variant="contained"
      disableElevation
      disabled={addToCartDisabled}
      onClick={() => void handleAddToCart()}
      sx={{
        textTransform: "none",
        fontWeight: 700,
        fontSize: "0.75rem",
        py: 0.65,
        bgcolor: colors.buttonBackground,
        color: colors.buttonText,
        "&:hover": { bgcolor: colors.buttonBackground, filter: "brightness(0.96)" },
      }}
    >
      Add to cart
    </Button>
  );

  return (
    <Card
      className="product-card-root"
      elevation={2}
      sx={{
        height: "100%",
        borderRadius: 2.5,
        border: `1px solid ${alpha(colors.text, 0.08)}`,
        display: "flex",
        flexDirection: "column",
        transition: "transform .2s ease, box-shadow .2s ease",
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
          "&:hover .product-card-desktop-cta": {
            transform: "translateY(0)",
            opacity: 1,
          },
        },
      }}
    >
      <CardActionArea
        component={productSlug ? RouterLink : "div"}
        {...(productSlug ? { to: `/products/${productSlug}` } : {})}
        sx={{ flexShrink: 0 }}
      >
        <Box sx={{ position: "relative", height: 220, overflow: "hidden" }}>
          {image ? (
            <CardMedia component="img" image={image} alt={name} sx={{ height: 220, objectFit: "cover" }} />
          ) : (
            <Box sx={{ height: 220, bgcolor: alpha(colors.primary, 0.08), display: "grid", placeItems: "center" }}>
              <Typography sx={{ fontWeight: 700, color: alpha(colors.text, 0.45) }}>No image</Typography>
            </Box>
          )}

          {/* Desktop: hover — pill “button” only (no dim overlay); image links to detail */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              pb: 2,
              px: 1.5,
              pointerEvents: "none",
            }}
          >
            <Box
              component="span"
              className="product-card-desktop-cta"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2.25,
                py: 1,
                borderRadius: 999,
                bgcolor: colors.buttonBackground,
                color: colors.buttonText,
                fontWeight: 800,
                fontSize: "0.8rem",
                letterSpacing: 0.08,
                textTransform: "uppercase",
                boxShadow: 4,
                transform: "translateY(120%)",
                opacity: 0,
                transition: "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease",
              }}
            >
              View products
            </Box>
          </Box>

          {/* Mobile: always-visible hint + shimmer + bounce (no hover required) */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 1,
              px: 1,
              background: `linear-gradient(0deg, ${alpha(colors.text, 0.65)} 0%, ${alpha(colors.text, 0.35)} 70%, transparent 100%)`,
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background: `linear-gradient(105deg, transparent 0%, ${alpha("#fff", 0.12)} 45%, transparent 90%)`,
                backgroundSize: "200% 100%",
                animation: `${mobileBarShimmer} 2.8s ease-in-out infinite`,
                pointerEvents: "none",
              },
            }}
          >
            <Typography
              sx={{
                position: "relative",
                zIndex: 1,
                color: colors.onPrimary,
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: 0.06,
                textTransform: "uppercase",
              }}
            >
              Tap to view
            </Typography>
            <Box
              component="span"
              sx={{
                position: "relative",
                zIndex: 1,
                color: colors.onPrimary,
                fontSize: "1rem",
                lineHeight: 1,
                animation: `${mobileChevronBounce} 1.35s ease-in-out infinite`,
              }}
            >
              ↑
            </Box>
          </Box>
        </Box>
      </CardActionArea>

      <CardContent sx={{ display: "grid", gap: 1.1, flex: 1, pt: 2 }}>
        {productSlug ? (
          <Typography
            variant="subtitle1"
            component={RouterLink}
            to={`/products/${productSlug}`}
            sx={{
              fontWeight: 700,
              lineHeight: 1.25,
              color: "inherit",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {name}
          </Typography>
        ) : (
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {name}
          </Typography>
        )}
        <Typography variant="h6" sx={{ fontWeight: 800, color: colors.primary }}>
          {INR.format(price)}
        </Typography>

        {quickActions ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ pt: 0.25 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {addToCartTooltip && addToCartDisabled ? (
                <Tooltip title={addToCartTooltip}>
                  <span style={{ display: "block" }}>{addToCartButton}</span>
                </Tooltip>
              ) : (
                addToCartButton
              )}
            </Box>
            <Tooltip title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
              <IconButton
                size="small"
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                disabled={wishlistBusy}
                onClick={() => void handleWishlistToggle()}
                sx={{
                  flexShrink: 0,
                  border: `1px solid ${alpha(colors.text, 0.18)}`,
                  borderRadius: 1,
                  color: wishlisted ? colors.primary : alpha(colors.text, 0.75),
                  ...(wishlisted ? { bgcolor: alpha(colors.primary, 0.08) } : {}),
                }}
              >
                <FiHeart size={18} style={{ strokeWidth: wishlisted ? 2.5 : 2 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

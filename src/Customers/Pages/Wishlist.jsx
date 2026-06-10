import { useState } from "react";
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
  Typography,
} from "@mui/material";
import { FiMinus, FiPlus, FiX } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { colors, fonts } from "../../theme/theme";
import { useWishlist } from "../context/useWishlist";
import { useCart } from "../context/useCart";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

export default function Wishlist() {
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [quantities, setQuantities] = useState({});
  const { wishlist, loading, busy, deleteWishlistProduct, clearWholeWishlist } =
    useWishlist();
  const { addCartItem, busy: cartBusy } = useCart();

  const getQty = (productId) => {
    const current = Number(quantities[productId] ?? 1);
    return Number.isFinite(current) && current > 0 ? current : 1;
  };

  const setQty = (productId, nextValue) => {
    if (!productId) return;
    const parsed = Number(nextValue);
    const safe = Number.isFinite(parsed)
      ? Math.max(1, Math.min(99, parsed))
      : 1;
    setQuantities((prev) => ({ ...prev, [productId]: safe }));
  };

  const resolveDefaultVariant = (item) => {
    const variants = Array.isArray(item?.product?.variants)
      ? item.product.variants
      : [];
    if (variants.length === 0) return null;
    return (
      variants.find(
        (variant) =>
          Number(variant?.availableStock ?? variant?.stock ?? 0) > 0
      ) ||
      variants[0] ||
      null
    );
  };

  const errMsg = (err, fallback) =>
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    fallback;

  const handleRemove = async (productId) => {
    if (!productId) return;
    setActionError("");
    setActionSuccess("");
    try {
      await deleteWishlistProduct(productId);
    } catch (err) {
      setActionError(errMsg(err, "Unable to remove item."));
    }
  };

  const handleClear = async () => {
    setActionError("");
    setActionSuccess("");
    try {
      await clearWholeWishlist();
    } catch (err) {
      setActionError(errMsg(err, "Unable to clear wishlist."));
    }
  };

  const handleAddToCart = async (item) => {
    const productId = item?.productId || item?.id;
    if (!productId) {
      setActionError("Unable to add this item to cart.");
      return;
    }
    const variant = resolveDefaultVariant(item);
    const variantId = variant?.id || variant?._id || variant?.sku;
    if (!variantId) {
      setActionError(
        "Please select a variant on the product page before adding to cart."
      );
      return;
    }

    setActionError("");
    setActionSuccess("");
    try {
      await addCartItem({
        productId,
        variantId,
        quantity: getQty(productId),
      });
      setActionSuccess("Added to bag.");
    } catch (err) {
      setActionError(errMsg(err, "Unable to add item to cart."));
    }
  };

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "baseline" }}
          spacing={1.5}
          sx={{ mb: { xs: 4, sm: 6 } }}
        >
          <Box>
            <Typography sx={eyebrowSx}>Saved</Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: fonts.display,
                fontSize: { xs: 34, sm: 48 },
                fontWeight: 500,
                color: colors.ink,
                letterSpacing: "-0.01em",
                lineHeight: 1.05,
                mt: 1,
              }}
            >
              Wishlist ({wishlist?.total || wishlist.items?.length || 0})
            </Typography>
          </Box>
          {wishlist.items.length > 0 ? (
            <Box
              component="button"
              type="button"
              onClick={() => void handleClear()}
              disabled={busy}
              sx={{
                background: "none",
                border: "none",
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: fonts.body,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: colors.muted,
                borderBottom: `1px solid ${colors.muted}`,
                pb: 0.5,
                "&:hover": {
                  color: colors.wine,
                  borderBottomColor: colors.wine,
                },
              }}
            >
              Clear all
            </Box>
          ) : null}
        </Stack>

        {actionError ? (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 0, border: `1px solid ${colors.danger}` }}
          >
            {actionError}
          </Alert>
        ) : null}

        {loading ? (
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {[1, 2, 3, 4].map((k) => (
              <Grid key={k} size={{ xs: 6, sm: 6, md: 3 }}>
                <Skeleton
                  variant="rectangular"
                  sx={{
                    aspectRatio: "3 / 4",
                    bgcolor: colors.stone,
                    borderRadius: 0,
                  }}
                />
              </Grid>
            ))}
          </Grid>
        ) : wishlist.items.length === 0 ? (
          <Box sx={{ textAlign: "center", py: { xs: 8, sm: 12 } }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: fonts.display,
                fontSize: { xs: 26, sm: 36 },
                fontWeight: 500,
                color: colors.ink,
                mb: 1,
              }}
            >
              Your wishlist is empty.
            </Typography>
            <Typography
              sx={{
                color: colors.muted,
                fontSize: 14,
                mb: 3,
              }}
            >
              Save pieces here to revisit them later.
            </Typography>
            <Button
              component={RouterLink}
              to="/products"
              variant="contained"
            >
              Browse the shop
            </Button>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {wishlist.items.map((item) => {
              const productId = item.productId || item.id;
              return (
                <Grid key={productId} size={{ xs: 6, sm: 6, md: 3 }}>
                  <Box sx={{ position: "relative" }}>
                    <Box
                      component={RouterLink}
                      to={
                        item.slug
                          ? `/products/${encodeURIComponent(item.slug)}`
                          : "#"
                      }
                      sx={{
                        display: "block",
                        aspectRatio: "3 / 4",
                        overflow: "hidden",
                        bgcolor: colors.stone,
                        mb: 1.5,
                        "&:hover img": { transform: "scale(1.04)" },
                      }}
                    >
                      {item.imageUrl ? (
                        <Box
                          component="img"
                          src={item.imageUrl}
                          alt={item.name}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition:
                              "transform 600ms cubic-bezier(0.2,0.7,0.2,1)",
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
                              fontSize: 32,
                              color: colors.muted,
                            }}
                          >
                            {item.name?.charAt(0) || "S"}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <IconButton
                      onClick={() => void handleRemove(productId)}
                      disabled={busy || cartBusy}
                      aria-label="Remove from wishlist"
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        bgcolor: colors.ivory,
                        color: colors.ink,
                        borderRadius: 0,
                        width: 32,
                        height: 32,
                        "&:hover": {
                          bgcolor: colors.ink,
                          color: colors.ivory,
                        },
                      }}
                    >
                      <FiX size={14} />
                    </IconButton>

                    <Typography
                      sx={{
                        fontFamily: fonts.display,
                        fontSize: 16,
                        fontWeight: 500,
                        color: colors.ink,
                        lineHeight: 1.25,
                        mb: 0.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: colors.ink,
                        fontWeight: 500,
                        mb: 1.5,
                      }}
                    >
                      {INR.format(Number(item.price || 0))}
                    </Typography>

                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 1.5 }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{ border: `1px solid ${colors.line}` }}
                      >
                        <IconButton
                          size="small"
                          disabled={busy || cartBusy || getQty(productId) <= 1}
                          onClick={() =>
                            setQty(productId, getQty(productId) - 1)
                          }
                          aria-label="Decrease quantity"
                          sx={{
                            borderRadius: 0,
                            width: 30,
                            height: 30,
                            color: colors.ink,
                          }}
                        >
                          <FiMinus size={12} />
                        </IconButton>
                        <Typography
                          sx={{
                            minWidth: 28,
                            textAlign: "center",
                            fontFamily: fonts.body,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {getQty(productId)}
                        </Typography>
                        <IconButton
                          size="small"
                          disabled={busy || cartBusy}
                          onClick={() =>
                            setQty(productId, getQty(productId) + 1)
                          }
                          aria-label="Increase quantity"
                          sx={{
                            borderRadius: 0,
                            width: 30,
                            height: 30,
                            color: colors.ink,
                          }}
                        >
                          <FiPlus size={12} />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => void handleAddToCart(item)}
                      disabled={busy || cartBusy}
                    >
                      Add to bag
                    </Button>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Snackbar
          open={Boolean(actionSuccess)}
          autoHideDuration={2400}
          onClose={() => setActionSuccess("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity="success"
            onClose={() => setActionSuccess("")}
            sx={{ width: "100%", borderRadius: 0 }}
          >
            {actionSuccess}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

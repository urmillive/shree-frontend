import { useState } from "react";
import { Alert, Box, Button, Container, IconButton, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { colors } from "../../theme/theme";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function Wishlist() {
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [quantities, setQuantities] = useState({});
  const { wishlist, loading, busy, deleteWishlistProduct, clearWholeWishlist } = useWishlist();
  const { addCartItem, busy: cartBusy } = useCart();

  const getQty = (productId) => {
    const current = Number(quantities[productId] ?? 1);
    return Number.isFinite(current) && current > 0 ? current : 1;
  };

  const setQty = (productId, nextValue) => {
    if (!productId) return;
    const parsed = Number(nextValue);
    const safe = Number.isFinite(parsed) ? Math.max(1, Math.min(99, parsed)) : 1;
    setQuantities((prev) => ({ ...prev, [productId]: safe }));
  };

  const resolveDefaultVariant = (item) => {
    const variants = Array.isArray(item?.product?.variants) ? item.product.variants : [];
    if (variants.length === 0) return null;
    return (
      variants.find((variant) => Number(variant?.availableStock ?? variant?.stock ?? 0) > 0) ||
      variants[0] ||
      null
    );
  };

  const handleRemove = async (productId) => {
    if (!productId) return;
    setActionError("");
    setActionSuccess("");
    try {
      await deleteWishlistProduct(productId);
    } catch (err) {
      setActionError(err?.response?.data?.message || "Unable to remove item.");
    }
  };

  const handleClear = async () => {
    setActionError("");
    setActionSuccess("");
    try {
      await clearWholeWishlist();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Unable to clear wishlist.");
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
      setActionError("Please select product variant from product details before adding to cart.");
      return;
    }

    setActionError("");
    setActionSuccess("");
    try {
      await addCartItem({ productId, variantId, quantity: getQty(productId) });
      setActionSuccess("Item added to cart.");
    } catch (err) {
      setActionError(err?.response?.data?.message || "Unable to add item to cart.");
    }
  };

  return (
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Wishlist
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="error" onClick={() => void handleClear()} disabled={busy || wishlist.items.length === 0} sx={{ textTransform: "none", fontWeight: 700 }}>
                Clear wishlist
              </Button>
            </Stack>
          </Stack>

          {actionError ? <Alert severity="error">{actionError}</Alert> : null}
          {actionSuccess ? <Alert severity="success">{actionSuccess}</Alert> : null}

          {loading ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton variant="text" height={36} />
              <Skeleton variant="rounded" height={100} />
            </Paper>
          ) : null}

          {!loading && wishlist.items.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={1.5} alignItems="flex-start">
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Your wishlist is empty
                </Typography>
                <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                  Save products here to quickly revisit them later.
                </Typography>
                <Button component={RouterLink} to="/products" variant="contained" sx={{ textTransform: "none", fontWeight: 700 }}>
                  Browse products
                </Button>
              </Stack>
            </Paper>
          ) : null}

          {!loading && wishlist.items.length > 0 ? (
            <Stack spacing={2}>
              {wishlist.items.map((item) => (
                <Paper key={item.id || item.productId} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Box
                      component="img"
                      src={item.imageUrl || "https://placehold.co/100x100?text=Item"}
                      alt={item.name}
                      sx={{ width: 90, height: 90, objectFit: "cover", borderRadius: 1.5, border: `1px solid ${alpha(colors.text, 0.14)}` }}
                    />
                    <Stack spacing={0.7} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75) }}>
                        {INR.format(Number(item.price || 0))}
                      </Typography>
                      {item.slug ? (
                        <Button component={RouterLink} to={`/products/${encodeURIComponent(item.slug)}`} sx={{ width: "fit-content", textTransform: "none", px: 0 }} size="small">
                          View details
                        </Button>
                      ) : null}
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <IconButton
                        size="small"
                        disabled={busy || cartBusy || getQty(item.productId || item.id) <= 1}
                        onClick={() => setQty(item.productId || item.id, getQty(item.productId || item.id) - 1)}
                        aria-label="Decrease quantity"
                      >
                        <FiMinus size={16} />
                      </IconButton>
                      <Typography sx={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>
                        {getQty(item.productId || item.id)}
                      </Typography>
                      <IconButton
                        size="small"
                        disabled={busy || cartBusy}
                        onClick={() => setQty(item.productId || item.id, getQty(item.productId || item.id) + 1)}
                        aria-label="Increase quantity"
                      >
                        <FiPlus size={16} />
                      </IconButton>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ textTransform: "none", fontWeight: 700, ml: 0.5 }}
                        disabled={busy || cartBusy}
                        onClick={() => void handleAddToCart(item)}
                      >
                        Add to cart
                      </Button>
                      <IconButton size="small" color="error" disabled={busy || cartBusy} onClick={() => void handleRemove(item.productId || item.id)} aria-label="Remove item">
                        <FiTrash2 size={16} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

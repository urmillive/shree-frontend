import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { getStoredAccessToken } from "../../Setup/Axios";
import { useCart } from "../context/CartContext";
import { colors } from "../../theme/theme";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function TotalsLine({ label, value, positive = false }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75) }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, color: positive ? "#2E7D32" : colors.text }}
      >
        {INR.format(Number(value || 0))}
      </Typography>
    </Stack>
  );
}

export default function Cart() {
  const [actionError, setActionError] = useState("");
  const {
    cart,
    loading,
    busy,
    setCartItemQuantity,
    deleteCartItem,
    clearWholeCart,
  } = useCart();
  const loggedIn = Boolean(getStoredAccessToken());

  const handleUpdateQty = async (itemId, nextQty) => {
    if (!itemId || nextQty < 1) return;
    setActionError("");
    try {
      await setCartItemQuantity(itemId, nextQty);
    } catch (err) {
      setActionError(err?.response?.data?.message || "Unable to update quantity.");
    }
  };

  const handleRemove = async (itemId) => {
    if (!itemId) return;
    setActionError("");
    try {
      await deleteCartItem(itemId);
    } catch (err) {
      setActionError(err?.response?.data?.message || "Unable to remove item.");
    }
  };

  const handleClear = async () => {
    setActionError("");
    try {
      await clearWholeCart();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Unable to clear cart.");
    }
  };

  return (
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Cart
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="error" onClick={() => void handleClear()} disabled={busy || cart.items.length === 0} sx={{ textTransform: "none", fontWeight: 700 }}>
                Clear cart
              </Button>
            </Stack>
          </Stack>

          {actionError ? <Alert severity="error">{actionError}</Alert> : null}

          {loading ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton variant="text" height={36} />
              <Skeleton variant="rounded" height={100} />
            </Paper>
          ) : null}

          {!loading && cart.items.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={1.5} alignItems="flex-start">
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Your cart is empty
                </Typography>
                <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                  Add products to continue shopping.
                </Typography>
                <Button component={RouterLink} to="/products" variant="contained" sx={{ textTransform: "none", fontWeight: 700 }}>
                  Browse products
                </Button>
              </Stack>
            </Paper>
          ) : null}

          {!loading && cart.items.length > 0 ? (
            <Stack spacing={2}>
              {cart.items.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Box
                      component="img"
                      src={item.imageUrl || "https://placehold.co/100x100?text=Item"}
                      alt={item.productName}
                      sx={{ width: 90, height: 90, objectFit: "cover", borderRadius: 1.5, border: `1px solid ${alpha(colors.text, 0.14)}` }}
                    />
                    <Stack spacing={0.7} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {item.productName}
                      </Typography>
                      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                        {item.size ? <Chip size="small" label={`Size: ${item.size}`} /> : null}
                        {item.color?.name ? <Chip size="small" label={`Color: ${item.color.name}`} /> : null}
                        {item.sku ? <Chip size="small" label={`SKU: ${item.sku}`} /> : null}
                      </Stack>
                      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75) }}>
                        Unit: {INR.format(item.effectivePrice)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <IconButton
                        size="small"
                        disabled={busy || item.quantity <= 1}
                        onClick={() => void handleUpdateQty(item.id, Number(item.quantity) - 1)}
                        aria-label="Decrease quantity"
                      >
                        <FiMinus size={16} />
                      </IconButton>
                      <Typography sx={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{item.quantity}</Typography>
                      <IconButton size="small" disabled={busy} onClick={() => void handleUpdateQty(item.id, Number(item.quantity) + 1)} aria-label="Increase quantity">
                        <FiPlus size={16} />
                      </IconButton>
                      <IconButton size="small" color="error" disabled={busy} onClick={() => void handleRemove(item.id)} aria-label="Remove item">
                        <FiTrash2 size={16} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <TotalsLine label="Subtotal" value={cart.totals.subtotal} />
                  <TotalsLine label="Tax" value={cart.totals.taxTotal} />
                  <TotalsLine label="Discount" value={cart.totals.discountAmount} positive />
                  <TotalsLine label="Savings" value={cart.totals.savings} positive />
                  <Divider />
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Grand total
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {INR.format(cart.totals.grandTotal)}
                    </Typography>
                  </Stack>
                  <Button
                    component={RouterLink}
                    to={loggedIn ? "/checkout" : "/login"}
                    state={loggedIn ? undefined : { from: { pathname: "/checkout" } }}
                    variant="contained"
                    fullWidth
                    sx={{ mt: 1, textTransform: "none", fontWeight: 700, bgcolor: colors.buttonBackground, color: colors.buttonText }}
                  >
                    {loggedIn ? "Proceed to checkout" : "Sign in to checkout"}
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

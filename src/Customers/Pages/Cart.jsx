import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { FiMinus, FiPlus, FiX } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { getStoredAccessToken } from "../../Setup/Axios";
import { useCart } from "../context/useCart";
import { colors, fonts } from "../../theme/theme";

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

function TotalsLine({ label, value, positive = false, bold = false }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ py: 0.75 }}
    >
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: bold ? 14 : 13,
          letterSpacing: "0.04em",
          color: bold ? colors.ink : colors.muted,
          fontWeight: bold ? 600 : 400,
          textTransform: bold ? "uppercase" : "none",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: bold ? 16 : 13.5,
          fontWeight: bold ? 500 : 500,
          color: positive ? colors.success : colors.ink,
        }}
      >
        {positive && Number(value) > 0 ? "− " : ""}
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
      setActionError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to update quantity."
      );
    }
  };

  const handleRemove = async (itemId) => {
    if (!itemId) return;
    setActionError("");
    try {
      await deleteCartItem(itemId);
    } catch (err) {
      setActionError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to remove item."
      );
    }
  };

  const handleClear = async () => {
    setActionError("");
    try {
      await clearWholeCart();
    } catch (err) {
      setActionError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to clear cart."
      );
    }
  };

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "baseline" }}
          spacing={1.5}
          sx={{ mb: { xs: 4, sm: 6 } }}
        >
          <Box>
            <Typography sx={eyebrowSx}>Your bag</Typography>
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
              Bag ({cart?.itemCount || 0})
            </Typography>
          </Box>
          {cart.items.length > 0 ? (
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
                transition: "color 200ms, border-color 200ms",
                "&:hover": {
                  color: colors.wine,
                  borderBottomColor: colors.wine,
                },
              }}
            >
              Empty bag
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
          <Stack spacing={3}>
            {[1, 2].map((k) => (
              <Skeleton
                key={k}
                variant="rectangular"
                height={140}
                sx={{ bgcolor: colors.stone }}
              />
            ))}
          </Stack>
        ) : null}

        {!loading && cart.items.length === 0 ? (
          <Box sx={{ textAlign: "center", py: { xs: 8, sm: 14 } }}>
            <Typography sx={eyebrowSx}>Empty bag</Typography>
            <Typography
              component="h2"
              sx={{
                fontFamily: fonts.display,
                fontSize: { xs: 30, sm: 40 },
                fontWeight: 500,
                color: colors.ink,
                mt: 2,
                mb: 1,
              }}
            >
              Nothing here yet.
            </Typography>
            <Typography
              sx={{
                color: colors.muted,
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 380,
                mx: "auto",
                mb: 4,
              }}
            >
              Discover the latest from our atelier and find pieces you'll
              return to.
            </Typography>
            <Button
              component={RouterLink}
              to="/products"
              variant="contained"
              size="large"
            >
              Start shopping
            </Button>
          </Box>
        ) : null}

        {!loading && cart.items.length > 0 ? (
          <Grid container spacing={{ xs: 4, md: 6 }}>
            {/* Items */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box
                sx={{
                  borderTop: `1px solid ${colors.line}`,
                  borderBottom: `1px solid ${colors.line}`,
                }}
              >
                {cart.items.map((item, idx) => (
                  <Stack
                    key={item.id}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={3}
                    sx={{
                      py: 3,
                      borderTop:
                        idx === 0
                          ? "none"
                          : `1px solid ${colors.line}`,
                    }}
                  >
                    <Box
                      component={RouterLink}
                      to={
                        item.productSlug
                          ? `/products/${item.productSlug}`
                          : "#"
                      }
                      sx={{
                        flexShrink: 0,
                        width: { xs: "100%", sm: 120 },
                        height: { xs: 200, sm: 160 },
                        overflow: "hidden",
                        bgcolor: colors.stone,
                        display: "block",
                      }}
                    >
                      {item.imageUrl ? (
                        <Box
                          component="img"
                          src={item.imageUrl}
                          alt={item.productName}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
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
                              fontSize: 36,
                              color: colors.muted,
                            }}
                          >
                            {item.productName?.charAt(0) || "S"}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Stack
                      spacing={1}
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={2}
                      >
                        <Typography
                          sx={{
                            fontFamily: fonts.display,
                            fontSize: 18,
                            fontWeight: 500,
                            color: colors.ink,
                            lineHeight: 1.3,
                          }}
                        >
                          {item.productName}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: fonts.body,
                            fontSize: 14,
                            fontWeight: 500,
                            color: colors.ink,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {INR.format(
                            Number(item.effectivePrice) *
                              Number(item.quantity)
                          )}
                        </Typography>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={3}
                        sx={{
                          fontFamily: fonts.body,
                          fontSize: 12,
                          letterSpacing: "0.04em",
                          color: colors.muted,
                        }}
                      >
                        {item.size ? <span>Size {item.size}</span> : null}
                        {item.color?.name ? <span>{item.color.name}</span> : null}
                        {item.quantity > 1 ? (
                          <span>{INR.format(item.effectivePrice)} ea.</span>
                        ) : null}
                      </Stack>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mt: "auto", pt: 1.5 }}
                      >
                        {/* qty stepper */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          sx={{
                            border: `1px solid ${colors.line}`,
                          }}
                        >
                          <IconButton
                            size="small"
                            disabled={busy || item.quantity <= 1}
                            onClick={() =>
                              void handleUpdateQty(
                                item.id,
                                Number(item.quantity) - 1
                              )
                            }
                            aria-label="Decrease quantity"
                            sx={{
                              borderRadius: 0,
                              width: 36,
                              height: 36,
                              color: colors.ink,
                            }}
                          >
                            <FiMinus size={14} />
                          </IconButton>
                          <Typography
                            sx={{
                              minWidth: 32,
                              textAlign: "center",
                              fontFamily: fonts.body,
                              fontSize: 13,
                              fontWeight: 500,
                              color: colors.ink,
                            }}
                          >
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            disabled={busy}
                            onClick={() =>
                              void handleUpdateQty(
                                item.id,
                                Number(item.quantity) + 1
                              )
                            }
                            aria-label="Increase quantity"
                            sx={{
                              borderRadius: 0,
                              width: 36,
                              height: 36,
                              color: colors.ink,
                            }}
                          >
                            <FiPlus size={14} />
                          </IconButton>
                        </Stack>

                        <Box
                          component="button"
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRemove(item.id)}
                          aria-label="Remove item"
                          sx={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.75,
                            fontFamily: fonts.body,
                            fontSize: 11,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            fontWeight: 500,
                            color: colors.muted,
                            transition: "color 200ms",
                            "&:hover": { color: colors.wine },
                          }}
                        >
                          <FiX size={12} /> Remove
                        </Box>
                      </Stack>
                    </Stack>
                  </Stack>
                ))}
              </Box>
            </Grid>

            {/* Summary */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  position: { md: "sticky" },
                  top: { md: 120 },
                  bgcolor: colors.paper,
                  border: `1px solid ${colors.line}`,
                  p: { xs: 3, sm: 4 },
                }}
              >
                <Typography
                  sx={{
                    ...eyebrowSx,
                    color: colors.ink,
                    mb: 3,
                  }}
                >
                  Order Summary
                </Typography>
                <TotalsLine label="Subtotal" value={cart.totals.subtotal} />
                {Number(cart.totals.taxTotal) > 0 ? (
                  <TotalsLine label="Tax" value={cart.totals.taxTotal} />
                ) : null}
                {Number(cart.totals.discountAmount) > 0 ? (
                  <TotalsLine
                    label="Discount"
                    value={cart.totals.discountAmount}
                    positive
                  />
                ) : null}
                {Number(cart.totals.savings) > 0 ? (
                  <TotalsLine
                    label="Savings"
                    value={cart.totals.savings}
                    positive
                  />
                ) : null}
                <Box
                  sx={{
                    height: 1,
                    bgcolor: colors.line,
                    my: 2,
                  }}
                />
                <TotalsLine
                  label="Total"
                  value={cart.totals.grandTotal}
                  bold
                />
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    color: colors.muted,
                    mt: 1,
                  }}
                >
                  Shipping calculated at checkout.
                </Typography>

                <Button
                  component={RouterLink}
                  to={loggedIn ? "/checkout" : "/login"}
                  state={
                    loggedIn ? undefined : { from: { pathname: "/checkout" } }
                  }
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ mt: 3, py: 1.75 }}
                >
                  {loggedIn ? "Checkout" : "Sign in to checkout"}
                </Button>

                <Box
                  component={RouterLink}
                  to="/products"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    mt: 2.5,
                    fontFamily: fonts.body,
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: colors.muted,
                    textDecoration: "none",
                    "&:hover": { color: colors.ink },
                  }}
                >
                  Continue shopping →
                </Box>
              </Box>
            </Grid>
          </Grid>
        ) : null}
      </Container>
    </Box>
  );
}

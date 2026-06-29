import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  Grid,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import { colors, fonts } from "../../theme/theme";
import {
  extractAddressesFromMeResponse,
  getAddressId,
} from "../../utils/addressesApi";
import { useCart } from "../context/useCart";
import { loadRazorpayScript } from "../services/loadRazorpayScript";
import {
  initiateRazorpayPayment,
  normalizeCustomerOrderPayload,
  normalizeInitiatePaymentPayload,
  pickCustomerOrderNumber,
  placeCustomerOrder,
  verifyRazorpayPayment,
} from "../services/publicOrdersService";

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

const sectionLabelSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.ink,
  mb: 2.5,
};

const Card = ({ children, sx = {} }) => (
  <Box
    sx={{
      bgcolor: colors.paper,
      border: `1px solid ${colors.line}`,
      p: { xs: 3, sm: 4 },
      ...sx,
    }}
  >
    {children}
  </Box>
);

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, loading: cartLoading, reloadCart } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState("");

  const [prefill, setPrefill] = useState({ name: "", email: "", contact: "" });
  const [addressId, setAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const [submitError, setSubmitError] = useState("");
  const [placing, setPlacing] = useState(false);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError("");
    try {
      const res = await client.get("/users/me");
      const list = extractAddressesFromMeResponse(res);
      setAddresses(list);
      const user = res?.data?.data?.user;
      if (user && typeof user === "object") {
        setPrefill({
          name: String(user.name ?? "").trim(),
          email: String(user.email ?? "").trim(),
          contact: String(user.mobile ?? user.phone ?? "")
            .replace(/\D/g, "")
            .slice(-10),
        });
      }
      const first = list.find((a) => a?.isDefault) || list[0];
      const fid = getAddressId(first);
      if (fid) setAddressId(fid);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login", { state: { from: { pathname: "/checkout" } } });
        return;
      }
      setAddressesError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Could not load addresses."
      );
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    if (cartLoading) return;
    if (!cart.items.length) {
      navigate("/cart", { replace: true });
    }
  }, [cart.items.length, cartLoading, navigate]);

  // Razorpay theme as hex without # — black ink looks editorial
  const razorpayThemeColor = useMemo(
    () => String(colors.ink || "").replace("#", ""),
    []
  );

  const openRazorpay = useCallback(
    async (createdOrder) => {
      const order =
        normalizeCustomerOrderPayload(createdOrder) ?? createdOrder;
      const orderNum = pickCustomerOrderNumber(order);

      if (!orderNum) {
        setSubmitError("Could not read order number from the server.");
        return;
      }

      const initiateResp = await initiateRazorpayPayment(orderNum);
      const initiated = normalizeInitiatePaymentPayload(initiateResp?.data);
      if (!initiated) {
        setSubmitError("Could not initiate online payment.");
        return;
      }
      const key =
        initiated.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "";
      const rpOrderId = initiated.razorpayOrderId;
      const amountPaise = Number.isFinite(initiated.amount) && initiated.amount > 0
        ? Math.round(initiated.amount)
        : Math.round(Number(cart.totals.grandTotal || 0) * 100);
      const currency = initiated.currency || "INR";

      if (!key) {
        setSubmitError(
          "Razorpay key is missing. Set RAZORPAY_KEY_ID on the server or VITE_RAZORPAY_KEY_ID on the client."
        );
        return;
      }
      if (!rpOrderId) {
        setSubmitError("Could not read Razorpay order id from the server response.");
        return;
      }
      if (!amountPaise) {
        setSubmitError("Could not determine payment amount.");
        return;
      }

      await loadRazorpayScript();

      const options = {
        key,
        amount: amountPaise,
        currency,
        name: "Shree Gallery",
        description: orderNum ? `Order ${orderNum}` : "Checkout",
        order_id: rpOrderId,
        handler: async (response) => {
          try {
            await verifyRazorpayPayment({
              orderNumber: orderNum,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          } catch (verifyErr) {
            setSubmitError(
              verifyErr?.response?.data?.error?.message ||
                verifyErr?.message ||
                "Payment captured but server verification failed. Contact support with your order number."
            );
            return;
          }
          await reloadCart();
          navigate(`/orders/${encodeURIComponent(orderNum)}`, { replace: true });
        },
        prefill: {
          name: prefill.name || undefined,
          email: prefill.email || undefined,
          contact:
            prefill.contact && prefill.contact.length === 10
              ? prefill.contact
              : undefined,
        },
        theme: { color: razorpayThemeColor || "111111" },
        modal: {
          ondismiss() {
            setSubmitError("");
          },
        },
      };

      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        setSubmitError("Razorpay failed to initialize.");
        return;
      }

      const rzp = new RazorpayCtor(options);
      rzp.on("payment.failed", (response) => {
        const msg = response?.error?.description || "Payment failed.";
        setSubmitError(msg);
      });
      rzp.open();
    },
    [
      cart.totals.grandTotal,
      navigate,
      prefill.contact,
      prefill.email,
      prefill.name,
      razorpayThemeColor,
      reloadCart,
    ]
  );

  const handlePlaceOrder = async () => {
    setSubmitError("");
    if (!addressId) {
      setSubmitError("Choose a delivery address.");
      return;
    }
    setPlacing(true);
    try {
      const { data } = await placeCustomerOrder({
        addressId,
        paymentMethod,
      });
      const order = normalizeCustomerOrderPayload(data) ?? data;

      if (paymentMethod === "cod") {
        const orderNum = pickCustomerOrderNumber(order);
        await reloadCart();
        if (orderNum)
          navigate(`/orders/${encodeURIComponent(orderNum)}`, {
            replace: true,
          });
        else navigate("/orders", { replace: true });
        return;
      }

      await openRazorpay(order);
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not place order."
      );
    } finally {
      setPlacing(false);
    }
  };

  const showSkeleton = cartLoading || addressesLoading;

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Stack spacing={1} sx={{ mb: { xs: 4, sm: 6 } }}>
          <Typography sx={eyebrowSx}>Final step</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 34, sm: 48 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            Checkout
          </Typography>
        </Stack>

        {submitError ? (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 0,
              border: `1px solid ${colors.danger}`,
            }}
          >
            {submitError}
          </Alert>
        ) : null}
        {addressesError ? (
          <Alert
            severity="warning"
            sx={{ mb: 3, borderRadius: 0 }}
          >
            {addressesError}
          </Alert>
        ) : null}

        {showSkeleton ? (
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={180} sx={{ bgcolor: colors.stone }} />
            <Skeleton variant="rectangular" height={120} sx={{ bgcolor: colors.stone }} />
          </Stack>
        ) : null}

        {!showSkeleton ? (
          <Grid container spacing={{ xs: 4, md: 6 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={3}>
                {/* Address card */}
                <Card>
                  <Typography sx={sectionLabelSx}>Deliver to</Typography>

                  {!addresses.length ? (
                    <Stack spacing={2} alignItems="flex-start">
                      <Typography
                        sx={{
                          fontFamily: fonts.body,
                          fontSize: 14,
                          color: colors.muted,
                        }}
                      >
                        Add a delivery address before placing your order.
                      </Typography>
                      <Button
                        component={RouterLink}
                        to="/profile/addresses/new"
                        variant="outlined"
                      >
                        Add new address
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <RadioGroup
                        value={addressId}
                        onChange={(e) => setAddressId(e.target.value)}
                        sx={{ gap: 1.5 }}
                      >
                        {addresses.map((a) => {
                          const id = getAddressId(a);
                          const lines = [
                            [a.line1, a.line2].filter(Boolean).join(", "),
                            [a.city, a.state, a.pincode]
                              .filter(Boolean)
                              .join(", "),
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          const isSelected = addressId === id;
                          return (
                            <Box
                              key={id || JSON.stringify(a)}
                              onClick={() => id && setAddressId(id)}
                              sx={{
                                p: 2.5,
                                border: `1px solid ${
                                  isSelected ? colors.ink : colors.line
                                }`,
                                bgcolor: isSelected
                                  ? colors.mutedSurface
                                  : "transparent",
                                cursor: id ? "pointer" : "not-allowed",
                                display: "flex",
                                gap: 2,
                                transition:
                                  "border-color 200ms cubic-bezier(0.2,0.7,0.2,1)",
                                "&:hover": {
                                  borderColor: id ? colors.ink : colors.line,
                                },
                              }}
                            >
                              <Radio
                                value={id}
                                checked={isSelected}
                                disabled={!id}
                                sx={{
                                  p: 0,
                                  mt: 0.25,
                                  color: colors.muted,
                                  "&.Mui-checked": { color: colors.ink },
                                }}
                              />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1.5}
                                >
                                  <Typography
                                    sx={{
                                      fontFamily: fonts.body,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: colors.ink,
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {a.label || "Address"}
                                  </Typography>
                                  {a.isDefault ? (
                                    <Typography
                                      component="span"
                                      sx={{
                                        fontFamily: fonts.body,
                                        fontSize: 9,
                                        letterSpacing: "0.22em",
                                        textTransform: "uppercase",
                                        color: colors.muted,
                                        border: `1px solid ${colors.line}`,
                                        px: 0.85,
                                        py: 0.25,
                                      }}
                                    >
                                      Default
                                    </Typography>
                                  ) : null}
                                </Stack>
                                <Typography
                                  sx={{
                                    fontFamily: fonts.body,
                                    fontSize: 13.5,
                                    color: colors.ink2,
                                    mt: 0.75,
                                    lineHeight: 1.55,
                                  }}
                                >
                                  {[a.name, a.mobile]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontFamily: fonts.body,
                                    fontSize: 13,
                                    color: colors.muted,
                                    mt: 0.5,
                                    lineHeight: 1.55,
                                  }}
                                >
                                  {lines}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </RadioGroup>
                      <Box
                        component={RouterLink}
                        to="/profile/addresses"
                        sx={{
                          display: "inline-block",
                          mt: 2,
                          fontFamily: fonts.body,
                          fontSize: 11,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          fontWeight: 500,
                          color: colors.muted,
                          textDecoration: "none",
                          borderBottom: `1px solid ${colors.muted}`,
                          pb: 0.5,
                          "&:hover": {
                            color: colors.ink,
                            borderBottomColor: colors.ink,
                          },
                        }}
                      >
                        Manage addresses
                      </Box>
                    </>
                  )}
                </Card>

                {/* Payment card */}
                <Card>
                  <Typography sx={sectionLabelSx}>Payment</Typography>
                  <FormControl>
                    <RadioGroup
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      sx={{ gap: 1.5 }}
                    >
                      {[
                        { value: "razorpay", label: "Pay online", hint: "Credit / Debit / UPI / Wallets — secured by Razorpay" },
                        { value: "cod", label: "Cash on delivery", hint: "Pay when you receive your order" },
                      ].map((opt) => {
                        const isSelected = paymentMethod === opt.value;
                        return (
                          <Box
                            key={opt.value}
                            onClick={() => setPaymentMethod(opt.value)}
                            sx={{
                              p: 2.5,
                              border: `1px solid ${
                                isSelected ? colors.ink : colors.line
                              }`,
                              bgcolor: isSelected
                                ? colors.mutedSurface
                                : "transparent",
                              cursor: "pointer",
                              display: "flex",
                              gap: 2,
                              alignItems: "flex-start",
                            }}
                          >
                            <Radio
                              value={opt.value}
                              checked={isSelected}
                              sx={{
                                p: 0,
                                mt: 0.25,
                                color: colors.muted,
                                "&.Mui-checked": { color: colors.ink },
                              }}
                            />
                            <Box>
                              <Typography
                                sx={{
                                  fontFamily: fonts.body,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: colors.ink,
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {opt.label}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: fonts.body,
                                  fontSize: 12.5,
                                  color: colors.muted,
                                  mt: 0.5,
                                }}
                              >
                                {opt.hint}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                </Card>
              </Stack>
            </Grid>

            {/* Summary */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  position: { md: "sticky" },
                  top: { md: 120 },
                }}
              >
                <Card>
                  <Typography sx={sectionLabelSx}>Order summary</Typography>
                  <Stack
                    spacing={1.5}
                    sx={{
                      maxHeight: 280,
                      overflowY: "auto",
                      pr: 1,
                      mb: 2.5,
                    }}
                  >
                    {cart.items.map((item) => (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={2}
                        alignItems="flex-start"
                      >
                        <Box
                          sx={{
                            width: 60,
                            height: 80,
                            flexShrink: 0,
                            overflow: "hidden",
                            bgcolor: colors.stone,
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
                          ) : null}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 13,
                              color: colors.ink,
                              fontWeight: 500,
                              lineHeight: 1.4,
                            }}
                          >
                            {item.productName}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 11,
                              color: colors.muted,
                              mt: 0.25,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {[
                              item.size && `Size ${item.size}`,
                              item.color?.name,
                              `Qty ${item.quantity}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: fonts.body,
                            fontSize: 13,
                            color: colors.ink,
                            fontWeight: 500,
                          }}
                        >
                          {INR.format(
                            Number(item.effectivePrice) *
                              Number(item.quantity)
                          )}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Box
                    sx={{
                      height: 1,
                      bgcolor: colors.line,
                      mb: 2,
                    }}
                  />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ py: 0.75 }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: colors.muted,
                      }}
                    >
                      Subtotal
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 13.5,
                        color: colors.ink,
                        fontWeight: 500,
                      }}
                    >
                      {INR.format(cart.totals.subtotal)}
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      height: 1,
                      bgcolor: colors.line,
                      my: 2,
                    }}
                  />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: colors.ink,
                      }}
                    >
                      Totalss
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 18,
                        fontWeight: 500,
                        color: colors.ink,
                      }}
                    >
                      {INR.format(cart.totals.grandTotal)}
                    </Typography>
                  </Stack>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={placing || !addresses.length || !addressId}
                    onClick={() => void handlePlaceOrder()}
                    sx={{ mt: 3, py: 1.75 }}
                  >
                    {placing
                      ? "Placing order…"
                      : paymentMethod === "cod"
                      ? "Place order"
                      : "Pay now"}
                  </Button>

                  <Box
                    component={RouterLink}
                    to="/cart"
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
                    ← Back to bag
                  </Box>
                </Card>
              </Box>
            </Grid>
          </Grid>
        ) : null}
      </Container>
    </Box>
  );
}

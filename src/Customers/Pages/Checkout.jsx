import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import { colors } from "../../theme/theme";
import { extractAddressesFromMeResponse, getAddressId } from "../../utils/addressesApi";
import { useCart } from "../context/CartContext";
import { useVerification } from "../../context/VerificationContext";
import { loadRazorpayScript } from "../services/loadRazorpayScript";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  normalizeCustomerOrderPayload,
  pickCustomerOrderNumber,
  pickRazorpayAmountPaise,
  pickRazorpayOrderId,
  pickRazorpayPublicKey,
  placeCustomerOrder,
} from "../services/publicOrdersService";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, loading: cartLoading, reloadCart } = useCart();
  const { needsVerification, loading: verificationLoading, openVerificationWarning } = useVerification();
  const warnedCheckoutRef = useRef(false);

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
          contact: String(user.mobile ?? user.phone ?? "").replace(/\D/g, "").slice(-10),
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
      setAddressesError(getApiErrorMessage(err, "Could not load addresses."));
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    if (verificationLoading || !needsVerification || warnedCheckoutRef.current) return;
    warnedCheckoutRef.current = true;
    openVerificationWarning();
  }, [verificationLoading, needsVerification, openVerificationWarning]);

  useEffect(() => {
    if (cartLoading) return;
    if (!cart.items.length) {
      navigate("/cart", { replace: true });
    }
  }, [cart.items.length, cartLoading, navigate]);

  const razorpayThemeColor = useMemo(() => String(colors.primary || "").replace("#", ""), []);

  const openRazorpay = useCallback(
    async (createdOrder) => {
      const order = normalizeCustomerOrderPayload(createdOrder) ?? createdOrder;
      const key = pickRazorpayPublicKey(order);
      const orderNum = pickCustomerOrderNumber(order);
      const rpOrderId = pickRazorpayOrderId(order);
      const amountPaise = pickRazorpayAmountPaise(order, cart.totals.grandTotal);
      const ro = order?.razorpayOrder ?? order?.razorpay_order ?? {};
      const currency = typeof ro.currency === "string" && ro.currency.trim() ? ro.currency : "INR";

      if (!key) {
        setSubmitError("Razorpay key is missing. Set VITE_RAZORPAY_KEY_ID or ask your API to return it on the order.");
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
        name: "Shree Fashion",
        description: orderNum ? `Order ${orderNum}` : "Checkout",
        order_id: rpOrderId,
        handler() {
          void reloadCart();
          if (orderNum) navigate(`/orders/${encodeURIComponent(orderNum)}`, { replace: true });
          else navigate("/orders", { replace: true });
        },
        prefill: {
          name: prefill.name || undefined,
          email: prefill.email || undefined,
          contact: prefill.contact && prefill.contact.length === 10 ? prefill.contact : undefined,
        },
        theme: { color: razorpayThemeColor || "ab8a48" },
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
    [cart.totals.grandTotal, navigate, prefill.contact, prefill.email, prefill.name, razorpayThemeColor, reloadCart]
  );

  const handlePlaceOrder = async () => {
    setSubmitError("");
    if (needsVerification) {
      openVerificationWarning();
      setSubmitError("Verify your email or mobile number on your profile before placing an order.");
      return;
    }
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
        if (orderNum) navigate(`/orders/${encodeURIComponent(orderNum)}`, { replace: true });
        else navigate("/orders", { replace: true });
        return;
      }

      await openRazorpay(order);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Could not place order."));
    } finally {
      setPlacing(false);
    }
  };

  const showSkeleton = cartLoading || addressesLoading;

  return (
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Checkout
          </Typography>

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          {needsVerification ? (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={openVerificationWarning} sx={{ fontWeight: 700 }}>
                  Verify now
                </Button>
              }
            >
              Verify your email or mobile number before placing an order.
            </Alert>
          ) : null}
          {addressesError ? <Alert severity="warning">{addressesError}</Alert> : null}

          {showSkeleton ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton height={28} />
              <Skeleton height={80} sx={{ mt: 1 }} />
            </Paper>
          ) : null}

          {!showSkeleton && !addresses.length ? (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" component={RouterLink} to="/profile/addresses/new" sx={{ fontWeight: 700 }}>
                  Add address
                </Button>
              }
            >
              Add a delivery address before you can place an order.
            </Alert>
          ) : null}

          {!showSkeleton && addresses.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Deliver to
              </Typography>
              <RadioGroup
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                sx={{ gap: 1 }}
              >
                {addresses.map((a) => {
                  const id = getAddressId(a);
                  const lines = [[a.line1, a.line2].filter(Boolean).join(", "), [a.city, a.state, a.pincode].filter(Boolean).join(", ")]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <Paper
                      key={id || JSON.stringify(a)}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: addressId === id ? alpha(colors.primary, 0.55) : alpha(colors.text, 0.12),
                        bgcolor: addressId === id ? alpha(colors.primary, 0.04) : "transparent",
                      }}
                    >
                      <FormControlLabel
                        value={id}
                        control={<Radio />}
                        disabled={!id}
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {a.label || "Address"}
                              {a.isDefault ? (
                                <Typography component="span" variant="caption" sx={{ ml: 1, color: alpha(colors.text, 0.6) }}>
                                  Default
                                </Typography>
                              ) : null}
                            </Typography>
                            <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75) }}>
                              {[a.name, a.mobile].filter(Boolean).join(" · ")}
                            </Typography>
                            <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75) }}>
                              {lines}
                            </Typography>
                          </Box>
                        }
                        sx={{ alignItems: "flex-start", m: 0 }}
                      />
                    </Paper>
                  );
                })}
              </RadioGroup>
              <Button component={RouterLink} to="/profile/addresses" size="small" sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}>
                Manage addresses
              </Button>
            </Paper>
          ) : null}

          {!showSkeleton ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Payment
              </Typography>
              <FormControl>
                <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <FormControlLabel value="razorpay" control={<Radio />} label="Pay online (Razorpay)" />
                  <FormControlLabel value="cod" control={<Radio />} label="Cash on delivery" />
                </RadioGroup>
              </FormControl>
            </Paper>
          ) : null}

          {!showSkeleton ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75) }}>
                    Subtotal
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {INR.format(cart.totals.subtotal)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: alpha(colors.text, 0.75) }}>
                    Grand total
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {INR.format(cart.totals.grandTotal)}
                  </Typography>
                </Stack>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" component={RouterLink} to="/cart" sx={{ textTransform: "none", fontWeight: 700 }}>
                  Back to cart
                </Button>
                <Button
                  variant="contained"
                  disabled={placing || !addresses.length || !addressId || needsVerification}
                  onClick={() => void handlePlaceOrder()}
                  sx={{ textTransform: "none", fontWeight: 700, bgcolor: colors.buttonBackground, color: colors.buttonText }}
                >
                  {placing ? "Placing order…" : paymentMethod === "cod" ? "Place order (COD)" : "Pay with Razorpay"}
                </Button>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { colors } from "../../theme/theme";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  cancelCustomerOrder,
  fetchCustomerOrder,
  normalizeCustomerOrderPayload,
  pickCustomerOrderNumber,
} from "../services/publicOrdersService";
import {
  createCustomerReturn,
  normalizeCustomerReturnPayload,
  pickCustomerReturnNumber,
} from "../services/publicReturnsService";

const accent = colors.primary;
const forest = "#0f3828";
const pageBg = colors.background;
const muted = "#6f7f77";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const NON_CANCEL = new Set(["cancelled", "delivered", "returned"]);

const RETURN_REASON_OPTIONS = [
  { value: "size_issue", label: "Size issue" },
  { value: "defective", label: "Defective / damaged" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "other", label: "Other" },
];

const RETURN_REFUND_METHOD_OPTIONS = [{ value: "original", label: "Original payment method" }];

const cardSx = {
  p: { xs: 2, sm: 3 },
  borderRadius: 2,
  border: `1px solid ${alpha(forest, 0.1)}`,
  boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
};

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function formatLabel(value) {
  if (value == null || value === "") return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? INR.format(n) : "—";
}

function pickLines(order) {
  const raw = order?.items ?? order?.lineItems ?? order?.lines ?? [];
  return Array.isArray(raw) ? raw : [];
}

function lineLabel(line) {
  return line?.productName ?? line?.name ?? line?.title ?? "Item";
}

function lineQty(line) {
  const q = Number(line?.quantity ?? line?.qty ?? 1);
  return Number.isFinite(q) ? q : 1;
}

function lineUnit(line) {
  const n = Number(line?.unitPrice ?? line?.price ?? line?.effectivePrice ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function lineSku(line) {
  const raw = line?.sku ?? line?.SKU ?? line?.variantSku ?? line?.variant?.sku ?? "";
  return raw != null && String(raw).trim() !== "" ? String(raw) : "—";
}

function lineAmount(line) {
  const n = Number(line?.lineTotal ?? line?.total ?? line?.amount);
  return Number.isFinite(n) ? n : lineUnit(line) * lineQty(line);
}

function lineVariant(line) {
  const parts = [
    line?.color?.name ? `Color: ${line.color.name}` : "",
    line?.size ? `Size: ${line.size}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function pickAddress(order) {
  return order?.shippingAddress ?? order?.address ?? order?.deliveryAddress ?? null;
}

function pickAddressBlock(order) {
  const ship = pickAddress(order);
  if (!ship || typeof ship !== "object") return "";
  const parts = [
    [ship.line1, ship.line2].filter(Boolean).join(", "),
    [ship.city, ship.state, ship.pincode ?? ship.postalCode].filter(Boolean).join(", "),
    ship.country,
  ].filter(Boolean);
  return parts.join("\n");
}

function pickStatusHistory(order) {
  const raw = order?.statusHistory ?? order?.history ?? order?.orderStatusHistory ?? [];
  return Array.isArray(raw) ? raw : [];
}

function lineVariantId(line) {
  const raw =
    line?.variantId ?? line?.variant?._id ?? line?.variant?.id ?? line?.productVariantId ?? null;
  return raw != null && String(raw).trim() !== "" ? String(raw) : "";
}

function lineProductId(line) {
  const raw = line?.productId ?? line?.product?._id ?? line?.product?.id ?? null;
  return raw != null && String(raw).trim() !== "" ? String(raw) : "";
}

function lineRowKey(line, idx) {
  return line?.id ?? line?._id ?? lineVariantId(line) ?? `line-${idx}`;
}

function pickPricingAmounts(order) {
  const p = order?.pricing;
  return {
    subtotal: p?.subtotal ?? order?.subtotal,
    tax: p?.taxTotal ?? order?.tax ?? order?.gst,
    shipping: p?.shippingCharge ?? order?.shippingFee ?? order?.shippingCost,
    discount: p?.couponDiscount ?? order?.discount,
    grand: p?.total ?? order?.grandTotal ?? order?.total ?? order?.totalAmount,
  };
}

function DetailField({ label, children }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
      >
        {label}
      </Typography>
      <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap", mt: 0.25 }}>
        {children}
      </Typography>
    </Box>
  );
}

function OrderLinesTable({ lines }) {
  return (
    <TableContainer sx={{ border: `1px solid ${alpha(forest, 0.1)}`, borderRadius: 1.5 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(accent, 0.08) }}>
            <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Variant</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Qty
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Price
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Tax
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line, idx) => (
            <TableRow key={line?.id ?? line?._id ?? line?.variantId ?? idx}>
              <TableCell>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  {line?.image ? (
                    <Box
                      component="img"
                      src={line.image}
                      alt={lineLabel(line)}
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: 1,
                        objectFit: "cover",
                        bgcolor: alpha(forest, 0.06),
                      }}
                    />
                  ) : (
                    <Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: alpha(forest, 0.06) }} />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {lineLabel(line)}
                    </Typography>
                    {line?.productSlug ? (
                      <Typography variant="caption" sx={{ color: muted }}>
                        /{line.productSlug}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>{lineSku(line)}</TableCell>
              <TableCell>
                <Stack spacing={0.5}>
                  <Typography variant="body2">{lineVariant(line)}</Typography>
                  {line?.color?.hexCode ? (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          bgcolor: line.color.hexCode,
                          border: `1px solid ${alpha(forest, 0.25)}`,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: muted }}>
                        {line.color.hexCode}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell align="right">{lineQty(line)}</TableCell>
              <TableCell align="right">
                <Stack spacing={0.25}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatMoney(line?.effectivePrice ?? lineUnit(line))}
                  </Typography>
                  {line?.regularPrice != null &&
                  Number(line.regularPrice) !== Number(line?.effectivePrice ?? lineUnit(line)) ? (
                    <Typography
                      variant="caption"
                      sx={{ color: muted, textDecoration: "line-through" }}
                    >
                      {formatMoney(line.regularPrice)}
                    </Typography>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell align="right">
                {formatMoney(line?.taxAmount)}
                {line?.taxPercent != null ? (
                  <Typography variant="caption" display="block" sx={{ color: muted }}>
                    {line.taxPercent}%
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatMoney(lineAmount(line))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function PriceSummaryPanel({ amounts }) {
  const rows = [
    { label: "Subtotal", value: formatMoney(amounts.subtotal) },
    { label: "Tax", value: formatMoney(amounts.tax) },
    { label: "Shipping", value: formatMoney(amounts.shipping) },
    { label: "Coupon discount", value: formatMoney(amounts.discount) },
  ];

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: alpha(forest, 0.03),
        border: `1px solid ${alpha(forest, 0.1)}`,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1.5 }}
      >
        Price summary
      </Typography>
      <Stack spacing={1.25}>
        {rows.map((row) => (
          <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Typography variant="body2">{row.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.value}
            </Typography>
          </Stack>
        ))}
        <Divider />
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Typography sx={{ fontWeight: 800 }}>Total</Typography>
          <Typography sx={{ fontWeight: 900, color: accent, fontSize: "1.1rem" }}>
            {formatMoney(amounts.grand)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function OrderDetail() {
  const { orderNumber: orderNumberParam } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const orderNumber = orderNumberParam ? decodeURIComponent(orderNumberParam) : "";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Changed my mind");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState("");

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnSelections, setReturnSelections] = useState({});
  const [returnReason, setReturnReason] = useState("wrong_item");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnRefundMethod, setReturnRefundMethod] = useState("original");
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnErr, setReturnErr] = useState("");

  const load = useCallback(async () => {
    if (!orderNumber) {
      setError("Missing order number.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchCustomerOrder(orderNumber);
      const body = normalizeCustomerOrderPayload(data);
      if (!body || typeof body !== "object") {
        setError("Unexpected response from server.");
        setOrder(null);
        return;
      }
      setOrder(body);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login", { state: { from: { pathname: `/orders/${encodeURIComponent(orderNumber)}` } } });
        return;
      }
      setOrder(null);
      setError(getApiErrorMessage(err, "Could not load order."));
    } finally {
      setLoading(false);
    }
  }, [navigate, orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setActiveTab(0);
  }, [orderNumber]);

  const displayNumber = useMemo(() => (order ? pickCustomerOrderNumber(order) : orderNumber), [order, orderNumber]);
  const status = String(order?.status ?? order?.orderStatus ?? "—");
  const statusLower = status.toLowerCase();
  const canCancel = order && !NON_CANCEL.has(statusLower);
  const canRequestReturn = order && statusLower === "delivered";

  const lines = useMemo(() => (order ? pickLines(order) : []), [order]);
  const returnableLineCount = useMemo(
    () => lines.filter((line) => Boolean(lineVariantId(line) && lineProductId(line))).length,
    [lines],
  );
  const address = order ? pickAddress(order) : null;
  const addressBlock = order ? pickAddressBlock(order) : "";
  const statusHistory = useMemo(() => (order ? pickStatusHistory(order) : []), [order]);
  const amounts = useMemo(() => pickPricingAmounts(order || {}), [order]);

  const handleCancel = async () => {
    if (!orderNumber) return;
    setCancelBusy(true);
    setCancelErr("");
    try {
      await cancelCustomerOrder(orderNumber, { reason: cancelReason.trim() || "Cancelled by customer" });
      setCancelOpen(false);
      await load();
    } catch (err) {
      setCancelErr(getApiErrorMessage(err, "Could not cancel order."));
    } finally {
      setCancelBusy(false);
    }
  };

  const openReturnDialog = () => {
    const next = {};
    lines.forEach((line, idx) => {
      const key = lineRowKey(line, idx);
      const variantId = lineVariantId(line);
      const productId = lineProductId(line);
      if (!variantId || !productId) return;
      next[key] = {
        selected: false,
        variantId,
        productId,
        quantity: 1,
        maxQty: lineQty(line),
        label: lineLabel(line),
      };
    });
    setReturnSelections(next);
    setReturnReason("wrong_item");
    setReturnDescription("");
    setReturnRefundMethod("original");
    setReturnErr("");
    setReturnOpen(true);
  };

  const handleRequestReturn = async () => {
    const resolvedOrderNumber = displayNumber || orderNumber;
    if (!resolvedOrderNumber) {
      setReturnErr("Could not determine order number for this return.");
      return;
    }

    const items = Object.values(returnSelections)
      .filter((row) => row.selected)
      .map((row) => ({
        variantId: row.variantId,
        productId: row.productId,
        quantity: Math.min(Math.max(1, Number(row.quantity) || 1), row.maxQty),
      }));

    if (items.length === 0) {
      setReturnErr("Select at least one item to return.");
      return;
    }

    const description = returnDescription.trim();
    if (!description) {
      setReturnErr("Please describe the issue.");
      return;
    }

    setReturnBusy(true);
    setReturnErr("");
    try {
      const { data } = await createCustomerReturn({
        orderNumber: resolvedOrderNumber,
        items,
        reason: returnReason,
        description,
        refundMethod: returnRefundMethod,
      });
      const body = normalizeCustomerReturnPayload(data);
      const returnNum = body ? pickCustomerReturnNumber(body) : "";
      setReturnOpen(false);
      if (returnNum) {
        navigate(`/returns/${encodeURIComponent(returnNum)}`);
        return;
      }
      navigate("/returns");
    } catch (err) {
      setReturnErr(getApiErrorMessage(err, "Could not submit return request."));
    } finally {
      setReturnBusy(false);
    }
  };

  const paymentMethod = formatLabel(order?.paymentMethod ?? order?.payment?.method);
  const paymentStatus = formatLabel(order?.paymentStatus ?? order?.payment?.status);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: pageBg, boxSizing: "border-box", py: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 } }}>
        <Breadcrumbs
          aria-label="order breadcrumb"
          separator="›"
          sx={{
            mb: 2,
            "& .MuiBreadcrumbs-separator": { color: alpha(forest, 0.45), fontSize: 15 },
          }}
        >
          <Link component={RouterLink} to="/" underline="hover" sx={{ color: accent, fontWeight: 600, fontSize: 14 }}>
            Home
          </Link>
          <Link component={RouterLink} to="/orders" underline="hover" sx={{ color: accent, fontWeight: 600, fontSize: 14 }}>
            Orders
          </Link>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#19271f" }}>
            {loading ? "Order" : displayNumber || "Order"}
          </Typography>
        </Breadcrumbs>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: accent }} />
          </Box>
        ) : order ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: muted, letterSpacing: 1.2, fontWeight: 600 }}>
              Order
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
              {displayNumber || "—"}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1.5}
              sx={{ mt: 0.5 }}
            >
              <Typography sx={{ color: muted, fontWeight: 600, fontSize: 13 }}>
                Status: {formatLabel(status)} | Payment: {paymentMethod} ({paymentStatus}) | Total:{" "}
                {formatMoney(amounts.grand)}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                {canRequestReturn && returnableLineCount > 0 ? (
                  <Button
                    variant="contained"
                    onClick={openReturnDialog}
                    sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                  >
                    Request return
                  </Button>
                ) : null}
                {canRequestReturn ? (
                  <Button
                    component={RouterLink}
                    to="/returns"
                    variant="outlined"
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderColor: alpha(accent, 0.45),
                      color: forest,
                    }}
                  >
                    My returns
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={() => setCancelOpen(true)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Cancel order
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Tabs
              value={activeTab}
              onChange={(_, next) => setActiveTab(next)}
              sx={{
                mt: 2,
                mb: 0,
                minHeight: 44,
                borderBottom: `1px solid ${alpha(forest, 0.1)}`,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  minHeight: 44,
                  color: muted,
                },
                "& .Mui-selected": { color: "#19271f" },
                "& .MuiTabs-indicator": { bgcolor: accent, height: 3, borderRadius: "3px 3px 0 0" },
              }}
            >
              <Tab label="Details" />
              <Tab label={`Items (${lines.length})`} />
              <Tab label="History & totals" />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {activeTab === 0 ? (
              <>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      <DetailField label="Placed">{formatWhen(order?.createdAt ?? order?.placedAt)}</DetailField>
                      <DetailField label="Updated">{formatWhen(order?.updatedAt)}</DetailField>
                      <DetailField label="Delivered">{formatWhen(order?.deliveredAt)}</DetailField>
                      <DetailField label="Payment method">{paymentMethod}</DetailField>
                      <DetailField label="Payment status">{paymentStatus}</DetailField>
                      {order?.couponCode ? (
                        <DetailField label="Coupon">{String(order.couponCode)}</DetailField>
                      ) : null}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      <DetailField label="Recipient name">
                        {address?.name ?? address?.fullName ?? "—"}
                      </DetailField>
                      <DetailField label="Mobile">{address?.mobile ?? address?.phone ?? "—"}</DetailField>
                      <DetailField label="Delivery address">{addressBlock || "—"}</DetailField>
                    </Stack>
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(forest, 0.03),
                    border: `1px solid ${alpha(forest, 0.1)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: muted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      display: "block",
                      mb: 1,
                    }}
                  >
                    Order total
                  </Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: "1.35rem", color: accent }}>
                    {formatMoney(amounts.grand)}
                  </Typography>
                </Box>
              </>
            ) : activeTab === 1 ? (
              <Box sx={{ overflow: "auto" }}>
                {lines.length === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No items</Typography>
                    <Typography variant="body2" sx={{ color: muted }}>
                      This order has no line items to display.
                    </Typography>
                  </Box>
                ) : (
                  <OrderLinesTable lines={lines} />
                )}
              </Box>
            ) : (
              <Grid container spacing={2} alignItems="flex-start">
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: muted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      display: "block",
                      mb: 1.25,
                    }}
                  >
                    Status history
                  </Typography>
                  {statusHistory.length > 0 ? (
                    <Stack spacing={1.25}>
                      {statusHistory.map((entry, idx) => (
                        <Box
                          key={`${entry?.status ?? "status"}-${idx}`}
                          sx={{
                            pl: 1.5,
                            py: 1,
                            borderLeft: `3px solid ${idx === statusHistory.length - 1 ? accent : alpha(forest, 0.15)}`,
                            bgcolor: idx === statusHistory.length - 1 ? alpha(accent, 0.06) : "transparent",
                            borderRadius: "0 8px 8px 0",
                          }}
                        >
                          <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                            {formatLabel(entry?.status)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: muted, display: "block" }}>
                            {formatWhen(entry?.timestamp ?? entry?.createdAt ?? entry?.at)}
                          </Typography>
                          {entry?.note ? (
                            <Typography variant="body2" sx={{ color: "#1f2a24", mt: 0.5 }}>
                              {String(entry.note)}
                            </Typography>
                          ) : null}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: muted }}>
                      No status updates yet.
                    </Typography>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <PriceSummaryPanel amounts={amounts} />
                </Grid>
              </Grid>
            )}

            <Divider sx={{ mt: 3, mb: 2 }} />

            <Typography variant="caption" sx={{ color: "#8a9690", fontWeight: 600 }}>
              Order: {displayNumber || "—"}
            </Typography>
          </Paper>
        ) : null}
      </Box>

      <Dialog
        open={returnOpen}
        onClose={() => (returnBusy ? null : setReturnOpen(false))}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>Request return</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: muted, mb: 2 }}>
            Select items from this delivered order. Returns must be within the return window.
          </Typography>
          {returnErr ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {returnErr}
            </Alert>
          ) : null}
          <Stack spacing={2}>
            <FormControl size="small" fullWidth disabled={returnBusy}>
              <InputLabel id="return-reason">Reason</InputLabel>
              <Select
                labelId="return-reason"
                label="Reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              >
                {RETURN_REASON_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Description"
              placeholder="Describe the issue"
              fullWidth
              multiline
              minRows={2}
              value={returnDescription}
              disabled={returnBusy}
              onChange={(e) => setReturnDescription(e.target.value)}
            />
            <FormControl size="small" fullWidth disabled={returnBusy}>
              <InputLabel id="return-refund-method">Refund method</InputLabel>
              <Select
                labelId="return-refund-method"
                label="Refund method"
                value={returnRefundMethod}
                onChange={(e) => setReturnRefundMethod(e.target.value)}
              >
                {RETURN_REFUND_METHOD_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            {lines.map((line, idx) => {
              const key = lineRowKey(line, idx);
              const row = returnSelections[key];
              if (!row) return null;
              return (
                <Box
                  key={key}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(forest, 0.12)}`,
                    bgcolor: row.selected ? alpha(accent, 0.06) : pageBg,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={row.selected}
                        disabled={returnBusy}
                        onChange={(e) =>
                          setReturnSelections((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], selected: e.target.checked },
                          }))
                        }
                        sx={{ color: alpha(accent, 0.6), "&.Mui-checked": { color: accent } }}
                      />
                    }
                    label={<Typography sx={{ fontWeight: 700, fontSize: "0.875rem" }}>{row.label}</Typography>}
                  />
                  {row.selected ? (
                    <Box sx={{ mt: 1, pl: { xs: 0, sm: 4 } }}>
                      <TextField
                        type="number"
                        label="Quantity"
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, max: row.maxQty }}
                        value={row.quantity}
                        disabled={returnBusy}
                        onChange={(e) =>
                          setReturnSelections((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], quantity: e.target.value },
                          }))
                        }
                      />
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setReturnOpen(false)} disabled={returnBusy} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={returnBusy}
            onClick={() => void handleRequestReturn()}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
          >
            {returnBusy ? "Submitting…" : "Submit return"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onClose={() => (cancelBusy ? null : setCancelOpen(false))}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>Cancel order</DialogTitle>
        <DialogContent>
          {cancelErr ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cancelErr}
            </Alert>
          ) : null}
          <TextField
            autoFocus
            margin="dense"
            label="Reason"
            fullWidth
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            disabled={cancelBusy}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelBusy} sx={{ textTransform: "none" }}>
            Keep order
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={cancelBusy}
            onClick={() => void handleCancel()}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {cancelBusy ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

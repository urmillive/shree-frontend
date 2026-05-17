import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { colors, primaryAlpha } from "../../theme/theme";
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

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
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

function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? INR.format(n) : "—";
}

function formatLabel(value) {
  if (value == null || value === "") return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function pickAddress(order) {
  return order?.shippingAddress ?? order?.address ?? order?.deliveryAddress ?? null;
}

function pickAddressBlock(order) {
  const ship = order?.shippingAddress ?? order?.address ?? order?.deliveryAddress;
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

const NON_CANCEL = new Set(["cancelled", "delivered", "returned"]);

const RETURN_REASON_OPTIONS = [
  { value: "size_issue", label: "Size issue" },
  { value: "defective", label: "Defective / damaged" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "other", label: "Other" },
];

const RETURN_REFUND_METHOD_OPTIONS = [
  { value: "original", label: "Original payment method" },
];

function lineVariantId(line) {
  const raw =
    line?.variantId ??
    line?.variant?._id ??
    line?.variant?.id ??
    line?.productVariantId ??
    null;
  return raw != null && String(raw).trim() !== "" ? String(raw) : "";
}

function lineProductId(line) {
  const raw =
    line?.productId ??
    line?.product?._id ??
    line?.product?.id ??
    null;
  return raw != null && String(raw).trim() !== "" ? String(raw) : "";
}

function lineRowKey(line, idx) {
  return line?.id ?? line?._id ?? lineVariantId(line) ?? `line-${idx}`;
}

const sectionTitleSx = {
  fontWeight: 800,
  fontSize: { xs: "0.8rem", sm: "0.875rem" },
  letterSpacing: 0.2,
};

const labelSx = {
  color: alpha(colors.text, 0.5),
  fontWeight: 800,
  fontSize: { xs: "0.62rem", sm: "0.7rem" },
  letterSpacing: 0.4,
  display: "block",
};

const valueSx = {
  fontWeight: 700,
  fontSize: { xs: "0.78rem", sm: "0.875rem" },
  lineHeight: 1.35,
};

function SectionCard({ title, children, sx }) {
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: { xs: 1.5, sm: 2 },
        border: `1px solid ${alpha(colors.text, 0.1)}`,
        bgcolor: colors.background,
        ...sx,
      }}
    >
      {title ? (
        <Typography variant="subtitle2" sx={{ ...sectionTitleSx, mb: { xs: 1.25, sm: 1.5 } }}>
          {title}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

function SummaryField({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="span" sx={labelSx}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.35 }}>{children}</Box>
    </Box>
  );
}

function OrderLineCard({ line }) {
  const effective = line?.effectivePrice ?? lineUnit(line);
  const regular = line?.regularPrice;
  const showStrike = regular != null && Number(regular) !== Number(effective);

  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 1.5,
        border: `1px solid ${alpha(colors.text, 0.1)}`,
        bgcolor: alpha(colors.text, 0.02),
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        {line?.image ? (
          <Box
            component="img"
            src={line.image}
            alt={lineLabel(line)}
            sx={{
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              borderRadius: 1.25,
              objectFit: "cover",
              flexShrink: 0,
              bgcolor: alpha(colors.text, 0.06),
            }}
          />
        ) : (
          <Box
            sx={{
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              borderRadius: 1.25,
              flexShrink: 0,
              bgcolor: alpha(colors.text, 0.06),
            }}
          />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "0.82rem", sm: "0.9rem" }, lineHeight: 1.3 }}>
            {lineLabel(line)}
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.55), display: "block", mt: 0.25 }}>
            SKU: {lineSku(line)}
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.65), display: "block", mt: 0.35 }}>
            {lineVariant(line)}
          </Typography>
          {line?.color?.hexCode ? (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: line.color.hexCode,
                  border: `1px solid ${alpha(colors.text, 0.25)}`,
                }}
              />
              <Typography variant="caption" sx={{ color: alpha(colors.text, 0.55) }}>
                {line.color.hexCode}
              </Typography>
            </Stack>
          ) : null}
        </Box>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.82rem", sm: "0.9rem" }, flexShrink: 0, color: colors.primary }}>
          {formatMoney(lineAmount(line))}
        </Typography>
      </Stack>

      <Divider sx={{ my: 1.25, borderColor: alpha(colors.text, 0.08) }} />

      <Stack spacing={0.75}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.55), fontWeight: 700 }}>
            Qty × Price
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="baseline">
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
              {lineQty(line)} × {formatMoney(effective)}
            </Typography>
            {showStrike ? (
              <Typography
                variant="caption"
                sx={{ color: alpha(colors.text, 0.5), textDecoration: "line-through" }}
              >
                {formatMoney(regular)}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.55), fontWeight: 700 }}>
            Tax
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
            {formatMoney(line?.taxAmount)}
            {line?.taxPercent != null ? ` (${line.taxPercent}%)` : ""}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function OrderLinesTable({ lines }) {
  return (
    <TableContainer sx={{ border: `1px solid ${alpha(colors.text, 0.12)}`, borderRadius: 1.5 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(colors.primary ?? colors.text, 0.06) }}>
            <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Variant</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              Qty
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              Price
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              Tax
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800 }}>
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
                        bgcolor: alpha(colors.text, 0.06),
                      }}
                    />
                  ) : (
                    <Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: alpha(colors.text, 0.06) }} />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {lineLabel(line)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha(colors.text, 0.65) }}>
                      {line?.productSlug ? `/${line.productSlug}` : "Product"}
                    </Typography>
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
                          border: `1px solid ${alpha(colors.text, 0.25)}`,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: alpha(colors.text, 0.65) }}>
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
                      sx={{ color: alpha(colors.text, 0.55), textDecoration: "line-through" }}
                    >
                      {formatMoney(line.regularPrice)}
                    </Typography>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell align="right">
                {formatMoney(line?.taxAmount)}
                {line?.taxPercent != null ? (
                  <Typography variant="caption" display="block" sx={{ color: alpha(colors.text, 0.6) }}>
                    {line.taxPercent}%
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                {formatMoney(lineAmount(line))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function PriceSummaryRows({ pricing, order, grand }) {
  const rows = [
    { label: "Subtotal", value: formatMoney(pricing?.subtotal ?? order?.subtotal) },
    { label: "Tax", value: formatMoney(pricing?.taxTotal ?? order?.tax ?? order?.gst) },
    { label: "Shipping", value: formatMoney(pricing?.shippingCharge ?? order?.shippingFee ?? order?.shippingCost) },
    { label: "Coupon discount", value: formatMoney(pricing?.couponDiscount ?? order?.discount) },
  ];

  return (
    <Stack spacing={1.25}>
      {rows.map((row) => (
        <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Typography variant="body2" sx={{ fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
            {row.label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: "0.78rem", sm: "0.875rem" } }}>
            {row.value}
          </Typography>
        </Stack>
      ))}
      <Divider />
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: "0.9rem", sm: "1rem" } }}>Total</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: "1rem", sm: "1.1rem" }, color: colors.primary }}>
          {formatMoney(grand)}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default function OrderDetail() {
  const { orderNumber: orderNumberParam } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const orderNumber = orderNumberParam ? decodeURIComponent(orderNumberParam) : "";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const displayNumber = useMemo(() => (order ? pickCustomerOrderNumber(order) : orderNumber), [order, orderNumber]);
  const status = String(order?.status ?? order?.orderStatus ?? "—");
  const statusLower = status.toLowerCase();
  const canCancel = order && !NON_CANCEL.has(statusLower);
  const canRequestReturn = order && statusLower === "delivered";

  const grand = Number(order?.pricing?.total ?? order?.grandTotal ?? order?.total ?? order?.totalAmount ?? 0);

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
    const orderLines = order ? pickLines(order) : [];
    orderLines.forEach((line, idx) => {
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

  const lines = order ? pickLines(order) : [];
  const returnableLineCount = lines.filter((line) => Boolean(lineVariantId(line) && lineProductId(line))).length;
  const address = order ? pickAddress(order) : null;
  const statusHistory = order ? pickStatusHistory(order) : [];
  const pricing = order?.pricing ?? {};

  const statusChip = (
    <Chip
      label={formatLabel(status)}
      size="small"
      color={statusLower === "delivered" ? "success" : "default"}
      sx={{
        fontWeight: 800,
        flexShrink: 0,
        maxWidth: isMobile ? "48%" : "none",
        height: { xs: 24, sm: 28 },
        fontSize: { xs: "0.68rem", sm: "0.75rem" },
        bgcolor: primaryAlpha(0.12),
        color: colors.text,
        border: `1px solid ${primaryAlpha(0.28)}`,
        "& .MuiChip-label": { px: { xs: 0.85, sm: 1.25 } },
      }}
    />
  );

  return (
    <Box sx={{ py: { xs: 2, sm: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Button
            component={RouterLink}
            to="/orders"
            size="small"
            sx={{
              alignSelf: "flex-start",
              textTransform: "none",
              fontWeight: 700,
              fontSize: { xs: "0.78rem", sm: "0.875rem" },
              px: { xs: 0.5, sm: 1 },
              minWidth: 0,
            }}
          >
            ← All orders
          </Button>

          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={1}
            sx={{ flexWrap: { xs: "nowrap", sm: "wrap" } }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="span" sx={labelSx}>
                Order
              </Typography>
              <Typography
                variant={isMobile ? "h6" : "h4"}
                sx={{
                  fontWeight: 900,
                  lineHeight: 1.25,
                  wordBreak: "break-all",
                  fontSize: { xs: "1.05rem", sm: "1.35rem", md: "2.125rem" },
                }}
              >
                {displayNumber || "—"}
              </Typography>
            </Box>
            {order && !loading ? statusChip : null}
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={isMobile ? 140 : 100} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" height={isMobile ? 200 : 120} sx={{ borderRadius: 2 }} />
            </Stack>
          ) : null}

          {!loading && order ? (
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
              {/* Order summary */}
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2, md: 3 },
                  borderRadius: { xs: 2, sm: 2.5 },
                  borderColor: alpha(colors.text, 0.1),
                  overflow: "hidden",
                }}
              >
                {isMobile ? (
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        bgcolor: primaryAlpha(0.08),
                        border: `1px solid ${primaryAlpha(0.2)}`,
                      }}
                    >
                      <Typography sx={labelSx}>Order total</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.15rem", color: colors.primary, mt: 0.35 }}>
                        {formatMoney(grand)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 1.5,
                      }}
                    >
                      <SummaryField label="Placed">
                        <Typography sx={valueSx}>{formatWhen(order?.createdAt ?? order?.placedAt)}</Typography>
                      </SummaryField>
                      <SummaryField label="Payment">
                        <Typography sx={valueSx} noWrap title={formatLabel(order?.paymentMethod ?? order?.payment?.method)}>
                          {formatLabel(order?.paymentMethod ?? order?.payment?.method)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: alpha(colors.text, 0.6), fontWeight: 600 }}>
                          {formatLabel(order?.paymentStatus ?? order?.payment?.status)}
                        </Typography>
                      </SummaryField>
                    </Box>
                  </Stack>
                ) : (
                  <Stack direction="row" justifyContent="space-between" gap={2}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                        Status
                      </Typography>
                      {statusChip}
                      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 1 }}>
                        Payment
                      </Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {formatLabel(order?.paymentMethod ?? order?.payment?.method)} ·{" "}
                        {formatLabel(order?.paymentStatus ?? order?.payment?.status)}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                        Placed
                      </Typography>
                      <Typography sx={{ fontWeight: 700 }}>{formatWhen(order?.createdAt ?? order?.placedAt)}</Typography>
                      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 1 }}>
                        Total
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: colors.primary }}>
                        {formatMoney(grand)}
                      </Typography>
                    </Stack>
                  </Stack>
                )}
              </Paper>

              {/* Delivery & dates */}
              {isMobile ? (
                <Stack spacing={1.5}>
                  <SectionCard title="Delivery details">
                    <Stack spacing={1}>
                      <Box>
                        <Typography sx={labelSx}>Name</Typography>
                        <Typography sx={valueSx}>{address?.name ?? address?.fullName ?? "—"}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={labelSx}>Mobile</Typography>
                        <Typography sx={valueSx}>{address?.mobile ?? address?.phone ?? "—"}</Typography>
                      </Box>
                      {pickAddressBlock(order) ? (
                        <Box>
                          <Typography sx={labelSx}>Address</Typography>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: "pre-wrap", color: alpha(colors.text, 0.78), lineHeight: 1.5, fontSize: "0.78rem" }}
                          >
                            {pickAddressBlock(order)}
                          </Typography>
                        </Box>
                      ) : null}
                    </Stack>
                  </SectionCard>
                  <SectionCard title="Order dates">
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography sx={labelSx}>Created</Typography>
                        <Typography sx={{ ...valueSx, textAlign: "right" }}>
                          {formatWhen(order?.createdAt ?? order?.placedAt)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography sx={labelSx}>Updated</Typography>
                        <Typography sx={{ ...valueSx, textAlign: "right" }}>{formatWhen(order?.updatedAt)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography sx={labelSx}>Delivered</Typography>
                        <Typography sx={{ ...valueSx, textAlign: "right" }}>{formatWhen(order?.deliveredAt)}</Typography>
                      </Stack>
                    </Stack>
                  </SectionCard>
                </Stack>
              ) : (
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: alpha(colors.text, 0.1) }}>
                  <Grid container spacing={2} alignItems="flex-start" justifyContent="space-between">
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ ...sectionTitleSx, mb: 1 }}>
                        Delivery details
                      </Typography>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Typography variant="body2">
                          <strong>Name:</strong> {address?.name ?? address?.fullName ?? "—"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Mobile:</strong> {address?.mobile ?? address?.phone ?? "—"}
                        </Typography>
                        {pickAddressBlock(order) ? (
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: alpha(colors.text, 0.78) }}>
                            {pickAddressBlock(order)}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      md={6}
                      sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "stretch", md: "flex-end" } }}
                    >
                      <Box sx={{ width: "100%", maxWidth: 420, textAlign: { xs: "left", md: "right" } }}>
                        <Typography variant="subtitle2" sx={{ ...sectionTitleSx, mb: 1 }}>
                          Order dates
                        </Typography>
                        <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                          <Typography variant="body2">
                            <strong>Created:</strong> {formatWhen(order?.createdAt ?? order?.placedAt)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Updated:</strong> {formatWhen(order?.updatedAt)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Delivered:</strong> {formatWhen(order?.deliveredAt)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Items */}
              {lines.length > 0 ? (
                isMobile ? (
                  <SectionCard title={`Items (${lines.length})`}>
                    <Stack spacing={1.25}>
                      {lines.map((line, idx) => (
                        <OrderLineCard key={line?.id ?? line?._id ?? line?.variantId ?? idx} line={line} />
                      ))}
                    </Stack>
                  </SectionCard>
                ) : (
                  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: alpha(colors.text, 0.1) }}>
                    <Typography variant="subtitle2" sx={{ ...sectionTitleSx, mb: 1 }}>
                      Items
                    </Typography>
                    <OrderLinesTable lines={lines} />
                  </Paper>
                )
              ) : null}

              {/* Status history & pricing */}
              {isMobile ? (
                <Stack spacing={1.5}>
                  <SectionCard title="Status history">
                    {statusHistory.length > 0 ? (
                      <Stack spacing={0}>
                        {statusHistory.map((entry, idx) => {
                          const isLatest = idx === statusHistory.length - 1;
                          return (
                            <Stack
                              key={`${entry?.status ?? "status"}-${idx}`}
                              direction="row"
                              spacing={1.25}
                              sx={{ position: "relative", pb: idx < statusHistory.length - 1 ? 1.75 : 0 }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  width: 14,
                                  flexShrink: 0,
                                  pt: 0.35,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    bgcolor: isLatest ? colors.primary : alpha(colors.text, 0.25),
                                    border: isLatest ? `2px solid ${primaryAlpha(0.35)}` : "none",
                                  }}
                                />
                                {idx < statusHistory.length - 1 ? (
                                  <Box
                                    sx={{
                                      flex: 1,
                                      width: 2,
                                      mt: 0.5,
                                      bgcolor: alpha(colors.text, 0.12),
                                      minHeight: 24,
                                    }}
                                  />
                                ) : null}
                              </Box>
                              <Box
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  pb: idx < statusHistory.length - 1 ? 0.5 : 0,
                                  p: 1,
                                  borderRadius: 1.25,
                                  ...(isLatest
                                    ? {
                                        bgcolor: primaryAlpha(0.08),
                                        border: `1px solid ${primaryAlpha(0.22)}`,
                                      }
                                    : {}),
                                }}
                              >
                                <Typography sx={{ fontWeight: 800, fontSize: "0.8rem" }}>
                                  {formatLabel(entry?.status)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: alpha(colors.text, 0.6), display: "block", mt: 0.25 }}>
                                  {formatWhen(entry?.timestamp ?? entry?.createdAt)}
                                </Typography>
                              </Box>
                            </Stack>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Typography variant="body2" sx={{ color: alpha(colors.text, 0.68), fontSize: "0.78rem" }}>
                        No status updates yet.
                      </Typography>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Price summary"
                    sx={{
                      bgcolor: primaryAlpha(0.05),
                      borderColor: primaryAlpha(0.2),
                    }}
                  >
                    <PriceSummaryRows pricing={pricing} order={order} grand={grand} />
                  </SectionCard>
                </Stack>
              ) : (
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: alpha(colors.text, 0.1) }}>
                  <Grid container spacing={3} alignItems="flex-start" justifyContent="space-between">
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ ...sectionTitleSx, mb: 1 }}>
                        Status history
                      </Typography>
                      {statusHistory.length > 0 ? (
                        <Stack spacing={1}>
                          {statusHistory.map((entry, idx) => (
                            <Stack
                              key={`${entry?.status ?? "status"}-${idx}`}
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              gap={2}
                              sx={{
                                px: 1,
                                py: 0.75,
                                borderRadius: 1,
                                bgcolor: idx === statusHistory.length - 1 ? alpha(colors.primary, 0.07) : undefined,
                                border:
                                  idx === statusHistory.length - 1
                                    ? `1.5px solid ${alpha(colors.primary, 0.2)}`
                                    : undefined,
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {formatLabel(entry?.status)}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ color: alpha(colors.text, 0.68), textAlign: "right", minWidth: 110 }}
                              >
                                {formatWhen(entry?.timestamp ?? entry?.createdAt)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ color: alpha(colors.text, 0.68) }}>
                          No status updates yet.
                        </Typography>
                      )}
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      md={6}
                      sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "stretch", md: "flex-end" } }}
                    >
                      <Box sx={{ width: "100%", maxWidth: 360 }}>
                        <Typography variant="subtitle2" sx={{ ...sectionTitleSx, mb: 1, textAlign: { xs: "left", md: "right" } }}>
                          Price summary
                        </Typography>
                        <PriceSummaryRows pricing={pricing} order={order} grand={grand} />
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                {canRequestReturn && returnableLineCount > 0 ? (
                  <Button
                    variant="outlined"
                    fullWidth={isMobile}
                    onClick={openReturnDialog}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      py: { xs: 1.1, sm: 0.75 },
                      borderRadius: { xs: 1.5, sm: 1 },
                      borderColor: alpha(colors.primary, 0.5),
                      color: colors.primary,
                    }}
                  >
                    Request return
                  </Button>
                ) : null}
                {canRequestReturn ? (
                  <Button
                    component={RouterLink}
                    to="/returns"
                    variant="text"
                    fullWidth={isMobile}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    My returns
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button
                    color="error"
                    variant="outlined"
                    fullWidth={isMobile}
                    onClick={() => setCancelOpen(true)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      py: { xs: 1.1, sm: 0.75 },
                      borderRadius: { xs: 1.5, sm: 1 },
                      ml: { sm: "auto" },
                    }}
                  >
                    Cancel order
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </Container>

      <Dialog
        open={returnOpen}
        onClose={() => (returnBusy ? null : setReturnOpen(false))}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>Request return</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mb: 2 }}>
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
                    border: `1px solid ${alpha(colors.text, 0.12)}`,
                    bgcolor: row.selected ? primaryAlpha(0.06) : colors.background,
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
                      />
                    }
                    label={
                      <Typography sx={{ fontWeight: 800, fontSize: "0.875rem" }}>{row.label}</Typography>
                    }
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
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, flexDirection: { xs: "column-reverse", sm: "row" }, gap: 1 }}>
          <Button onClick={() => setReturnOpen(false)} disabled={returnBusy} fullWidth={isMobile} sx={{ textTransform: "none", m: 0 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={returnBusy}
            fullWidth={isMobile}
            onClick={() => void handleRequestReturn()}
            sx={{ textTransform: "none", fontWeight: 700, m: 0 }}
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
        <DialogTitle sx={{ fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>Cancel order</DialogTitle>
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
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, flexDirection: { xs: "column-reverse", sm: "row" }, gap: 1 }}>
          <Button
            onClick={() => setCancelOpen(false)}
            disabled={cancelBusy}
            fullWidth={isMobile}
            sx={{ textTransform: "none", m: 0 }}
          >
            Keep order
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={cancelBusy}
            fullWidth={isMobile}
            onClick={() => void handleCancel()}
            sx={{ textTransform: "none", fontWeight: 700, m: 0 }}
          >
            {cancelBusy ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

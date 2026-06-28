import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";
const forest = "#0f3828";

const STATUS_FORWARD_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];
const STATUS_CANCELLED = "cancelled";
const TERMINAL_STATUS_NO_UI = new Set(["delivered", "cancelled", "returned"]);

const DETAIL_SKIP_KEYS = new Set([
  "__v",
  "items",
  "lineItems",
  "lines",
  "shippingAddress",
  "address",
  "deliveryAddress",
  "user",
  "customer",
  "razorpay",
  "razorpayOrder",
  "razorpay_order",
  "payment",
  "pricing",
  "statusHistory",
  "history",
  "orderStatusHistory",
  "shiprocket",
  "shipment",
  "shipping",
]);

const FIELD_LABEL_OVERRIDES = {
  _id: "ID",
  orderNumber: "Order Number",
  orderNo: "Order Number",
  createdAt: "Placed",
  updatedAt: "Updated",
  deliveredAt: "Delivered",
  paymentMethod: "Payment Method",
  paymentStatus: "Payment Status",
  couponCode: "Coupon",
  razorpayPaymentId: "Razorpay Payment ID",
  razorpayOrderId: "Razorpay Order ID",
};

function pickOrderStatus(order) {
  const raw = order?.status ?? order?.orderStatus ?? "";
  return raw != null && String(raw).trim() !== "" ? String(raw).trim() : "";
}

function getForwardStatusActions(statusRaw) {
  const c = String(statusRaw ?? "").toLowerCase().trim();
  if (!c) return { nextStatus: STATUS_FORWARD_FLOW[0], showCancelled: true };
  if (TERMINAL_STATUS_NO_UI.has(c)) return { nextStatus: null, showCancelled: false };
  const idx = STATUS_FORWARD_FLOW.indexOf(c);
  if (idx === -1) return { nextStatus: null, showCancelled: true };
  const next = STATUS_FORWARD_FLOW[idx + 1];
  if (!next) return { nextStatus: null, showCancelled: false };
  return { nextStatus: next, showCancelled: true };
}

const COMPLEX_KEYS = new Set(["items", "statusHistory", "shippingAddress", "pricing"]);

function normalizeOrderPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.order ?? root.data?.order ?? root.data ?? root;
  }
  return root;
}

function normalizeApiPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.data ?? root.order ?? root;
  }
  return root;
}

function pickOrderNumber(order) {
  const raw =
    order?.orderNumber ??
    order?.order_no ??
    order?.orderNo ??
    order?.number ??
    order?._id ??
    order?.id ??
    null;
  return raw == null ? "" : String(raw);
}

function pickOrderId(order) {
  if (!order) return "";
  return String(order._id ?? order.id ?? "").trim();
}

function pickStatusHistory(order) {
  const raw = order?.statusHistory ?? order?.history ?? order?.orderStatusHistory ?? [];
  return Array.isArray(raw) ? raw : [];
}

function pickLines(order) {
  const raw = order?.items ?? order?.lineItems ?? order?.lines ?? [];
  return Array.isArray(raw) ? raw : [];
}

function pickShippingRecord(order) {
  return order?.shippingAddress ?? order?.address ?? order?.deliveryAddress ?? null;
}

function pickNestedShipping(order) {
  const nested = order?.shiprocket ?? order?.shipment ?? order?.shipping;
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return {};
  return nested;
}

function pickShippingField(order, keys) {
  for (const key of keys) {
    const value = order?.[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function firstMoney(...candidates) {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickPricingAmounts(order) {
  const p = order?.pricing;
  return {
    subtotal: firstMoney(p?.subtotal, order?.subtotal, order?.subTotal),
    tax: firstMoney(p?.taxTotal, order?.tax, order?.gst),
    shipping: firstMoney(p?.shippingCharge, order?.shippingFee, order?.shipping, order?.shippingCost),
    discount: firstMoney(p?.couponDiscount, order?.discount, order?.couponDiscount),
    grand: firstMoney(p?.total, order?.grandTotal, order?.total, order?.totalAmount),
  };
}

function pickCustomerBlock(order) {
  const name =
    order?.customerName ??
    order?.customer_name ??
    order?.user?.name ??
    order?.user?.fullName ??
    order?.customer?.name ??
    order?.shippingAddress?.fullName ??
    "";
  const email = order?.user?.email ?? order?.customer?.email ?? order?.email ?? order?.customerEmail ?? "";
  const phone =
    order?.user?.phone ??
    order?.user?.mobile ??
    order?.customer?.phone ??
    order?.customer?.mobile ??
    order?.phone ??
    order?.shippingAddress?.phone ??
    "";
  return {
    name: name != null && String(name).trim() !== "" ? String(name) : "",
    email: email != null && String(email).trim() !== "" ? String(email) : "",
    phone: phone != null && String(phone).trim() !== "" ? String(phone) : "",
  };
}

function formatFieldLabel(key) {
  if (FIELD_LABEL_OVERRIDES[key]) return FIELD_LABEL_OVERRIDES[key];
  return key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatStatusLabel(value) {
  if (value == null || value === "") return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value != null && value !== "" ? String(value) : "—";
  return `Rs ${n.toFixed(2)}`;
}

function formatFieldValue(key, v) {
  if (key === "createdAt" || key === "updatedAt" || key === "deliveredAt" || key === "placedAt") {
    return formatDateTime(v);
  }
  if (key === "status" || key === "orderStatus" || key === "paymentStatus" || key === "paymentMethod") {
    return formatStatusLabel(v);
  }
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

function formatAddressLines(ship) {
  if (!ship || typeof ship !== "object") return "";
  const nameLine = ship.fullName ?? ship.name;
  const phoneLine = ship.phone ?? ship.mobile;
  const line12 = [ship.line1, ship.line2].filter(Boolean).join(", ");
  const cityLine = [ship.city, ship.state, ship.pincode ?? ship.postalCode ?? ship.zip].filter(Boolean).join(", ");
  const parts = [nameLine, phoneLine, line12, cityLine, ship.country].filter(Boolean);
  return parts.join("\n");
}

function lineLabel(line) {
  return line?.productName ?? line?.name ?? line?.title ?? "Item";
}

function lineSku(line) {
  const raw = line?.sku ?? line?.SKU ?? line?.variantSku ?? line?.variant?.sku ?? "";
  return raw != null && String(raw).trim() !== "" ? String(raw) : "—";
}

function lineQty(line) {
  const q = Number(line?.quantity ?? line?.qty ?? 1);
  return Number.isFinite(q) ? q : 1;
}

function lineUnit(line) {
  const n = Number(line?.unitPrice ?? line?.price ?? line?.effectivePrice ?? line?.salePrice ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const AdminOrderDetail = () => {
  const navigate = useNavigate();
  const { orderNumber = "" } = useParams();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(
    () => ["super_admin", "manager", "support_staff"].includes(roleGate || ""),
    [roleGate],
  );
  const roleCanManageShipping = ["super_admin", "manager"].includes(roleGate || "");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);

  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [shippingBusy, setShippingBusy] = useState("");

  const applyOrderBody = useCallback((body) => {
    if (!body || typeof body !== "object") return false;
    setOrder(body);
    return true;
  }, []);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (!orderNumber.trim()) {
      setLoading(false);
      setError("Missing order number.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setFeedback({ type: "", message: "" });
      setOrder(null);
      try {
        const { data } = await client.get(`/admin/orders/${encodeURIComponent(orderNumber.trim())}`);
        if (cancelled) return;
        const body = normalizeOrderPayload(data);
        if (!body || typeof body !== "object" || !applyOrderBody(body)) {
          setError("Unexpected response from server.");
        }
      } catch (e) {
        if (cancelled) return;
        setOrder(null);
        setError(getApiErrorMessage(e, "Failed to load order."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [applyOrderBody, isAdminAllowed, orderNumber]);

  useEffect(() => {
    setActiveTab(0);
  }, [orderNumber]);

  const reloadOrder = useCallback(async () => {
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get(`/admin/orders/${encodeURIComponent(orderNumber.trim())}`);
      const body = normalizeOrderPayload(data);
      if (!body || typeof body !== "object" || !applyOrderBody(body)) {
        setError("Unexpected response from server.");
      }
    } catch (e) {
      setOrder(null);
      setError(getApiErrorMessage(e, "Failed to load order."));
    } finally {
      setLoading(false);
    }
  }, [applyOrderBody, orderNumber]);

  const lineItems = useMemo(() => pickLines(order), [order]);
  const addressText = useMemo(() => formatAddressLines(pickShippingRecord(order)), [order]);
  const customer = useMemo(() => pickCustomerBlock(order || {}), [order]);
  const pricingAmounts = useMemo(() => pickPricingAmounts(order || {}), [order]);
  const statusHistory = useMemo(() => pickStatusHistory(order), [order]);

  const currentStatus = pickOrderStatus(order);
  const forwardActions = useMemo(() => getForwardStatusActions(currentStatus), [currentStatus]);
  const showStatusUpdateCard = Boolean(forwardActions.nextStatus) || forwardActions.showCancelled;

  const shippingDetails = useMemo(() => {
    const nested = pickNestedShipping(order);
    const from = (keys) => pickShippingField(order, keys) || pickShippingField(nested, keys);
    return {
      trackingId: from(["trackingId", "tracking_id", "shipmentId", "shipment_id"]),
      awb: from(["awb", "awbCode", "awb_code", "awbNumber"]),
      trackingUrl: from(["trackingUrl", "tracking_url", "trackUrl", "trackingLink"]),
      shippingStatus: from(["shippingStatus", "shipmentStatus", "trackingStatus"]),
    };
  }, [order]);

  const razorpayRows = useMemo(() => {
    if (!order) return [];
    const rows = [];
    const ro = order?.razorpayOrder ?? order?.razorpay_order;
    if (ro && typeof ro === "object") {
      const id = ro.id ?? ro.order_id;
      if (id) rows.push({ label: "Razorpay order id", value: String(id) });
      const amt = ro.amount ?? ro.amount_due ?? ro.amountDue;
      if (amt != null && String(amt).trim() !== "") rows.push({ label: "Razorpay amount (paise)", value: String(amt) });
    }
    if (order?.razorpayPaymentId) rows.push({ label: "Razorpay payment id", value: String(order.razorpayPaymentId) });
    if (order?.razorpayOrderId) rows.push({ label: "Razorpay order id (field)", value: String(order.razorpayOrderId) });
    const pay = order?.payment;
    if (pay && typeof pay === "object" && !Array.isArray(pay)) {
      for (const [k, v] of Object.entries(pay)) {
        if (v != null && typeof v === "object") continue;
        rows.push({ label: `Payment ${formatFieldLabel(k)}`, value: String(v ?? "—") });
      }
    }
    return rows;
  }, [order]);

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(order || {}).filter(([k]) => !DETAIL_SKIP_KEYS.has(k));
    const { subtotal, tax, shipping, discount, grand } = pricingAmounts;
    entries.push(
      ["customerName", customer.name || null],
      ["customerEmail", customer.email || null],
      ["customerPhone", customer.phone || null],
      ["subtotal", subtotal],
      ["tax", tax],
      ["shippingCharge", shipping],
      ["discount", discount],
      ["total", grand],
    );
    const seen = new Set();
    const unique = entries.filter(([k]) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const mid = Math.ceil(unique.length / 2);
    return {
      leftEntries: unique.slice(0, mid),
      rightEntries: unique.slice(mid),
    };
  }, [customer.email, customer.name, customer.phone, order, pricingAmounts]);

  const latestHistoryNote = useMemo(() => {
    for (let i = statusHistory.length - 1; i >= 0; i -= 1) {
      const note = statusHistory[i]?.note;
      if (note != null && String(note).trim() !== "") return String(note).trim();
    }
    return "";
  }, [statusHistory]);

  const summaryNote = [order?.notes, order?.note, order?.internalNote, latestHistoryNote].find(
    (n) => n != null && String(n).trim() !== "",
  );

  const updateStatus = async (nextStatus) => {
    const status = String(nextStatus ?? "").trim();
    if (!orderNumber.trim() || !status) return;
    if (status.toLowerCase() === String(currentStatus).toLowerCase()) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = { status };
      const isCancel = status.toLowerCase() === STATUS_CANCELLED;
      if (!isCancel && noteDraft.trim()) payload.note = noteDraft.trim();
      await client.patch(`/admin/orders/${encodeURIComponent(orderNumber.trim())}/status`, payload);
      await reloadOrder();
      setFeedback({ type: "success", message: "Order status updated successfully." });
      if (!isCancel) setNoteDraft("");
    } catch (e) {
      setFeedback({ type: "error", message: getApiErrorMessage(e, "Failed to update order status.") });
    } finally {
      setSaving(false);
    }
  };

  const syncOrderFromShipping = async () => {
    if (!orderNumber.trim()) return;
    try {
      const { data } = await client.get(`/admin/orders/${encodeURIComponent(orderNumber.trim())}`);
      const normalized = normalizeOrderPayload(data);
      if (normalized && typeof normalized === "object") {
        applyOrderBody({ ...(order || {}), ...normalized });
      }
    } catch {
      // Keep shipping response as source of truth if order refetch fails.
    }
  };

  const applyShippingResponse = (data) => {
    const normalized = normalizeApiPayload(data);
    if (normalized && typeof normalized === "object") {
      setOrder((prev) => ({ ...(prev || {}), ...normalized }));
    }
  };

  const runShippingAction = async ({ action, method, endpoint }) => {
    if (!orderNumber.trim()) return;
    setShippingBusy(action);
    setFeedback({ type: "", message: "" });
    try {
      const req = method === "get" ? client.get(endpoint) : client.post(endpoint);
      const { data } = await req;
      applyShippingResponse(data);
      await syncOrderFromShipping();
      if (action === "create") setFeedback({ type: "success", message: "Shipment created successfully on Shiprocket." });
      if (action === "track") setFeedback({ type: "success", message: "Shipment tracking details fetched successfully." });
      if (action === "cancel") setFeedback({ type: "success", message: "Shipment cancelled successfully on Shiprocket." });
    } catch (e) {
      setFeedback({ type: "error", message: getApiErrorMessage(e, "Shipping action failed.") });
    } finally {
      setShippingBusy("");
    }
  };

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
          Back
        </Button>
      </Box>
    );
  }

  const id = pickOrderId(order);
  const displayNumber = pickOrderNumber(order) || orderNumber.trim() || "Order";
  const statusLabel = currentStatus ? formatStatusLabel(currentStatus) : "—";
  const paymentLabel = formatStatusLabel(
    order?.paymentStatus ?? order?.payment_status ?? order?.payment?.status,
  );

  const cardSx = {
    p: { xs: 2, sm: 3 },
    borderRadius: 2,
    border: `1px solid ${alpha(forest, 0.1)}`,
    boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Orders", to: "/admin/orders" },
            { label: loading ? "Order" : displayNumber },
          ]}
        />

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: accent }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : order ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Order
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
              {displayNumber}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1.5}
              sx={{ mt: 0.5 }}
            >
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, fontSize: 13 }}>
                Status: {statusLabel} | Payment: {paymentLabel}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => void reloadOrder()}
                disabled={loading}
                sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}
              >
                Refresh
              </Button>
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
                  color: "#6f7f77",
                },
                "& .Mui-selected": { color: "#19271f" },
                "& .MuiTabs-indicator": { bgcolor: accent, height: 3, borderRadius: "3px 3px 0 0" },
              }}
            >
              <Tab label="Details" />
              <Tab label={`Items (${lineItems.length})`} />
              <Tab label={`History (${statusHistory.length})`} />
              <Tab label="Actions" />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {activeTab === 0 ? (
              <>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      {leftEntries.map(([k, v]) => (
                        <Box key={k}>
                          <Typography
                            variant="caption"
                            sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                          >
                            {formatFieldLabel(k)}
                          </Typography>
                          <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                            {formatFieldValue(k, v)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      {rightEntries.map(([k, v]) => (
                        <Box key={k}>
                          <Typography
                            variant="caption"
                            sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                          >
                            {formatFieldLabel(k)}
                          </Typography>
                          <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                            {formatFieldValue(k, v)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                </Grid>

                {addressText ? (
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
                      sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}
                    >
                      Delivery address
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap" }}>
                      {addressText}
                    </Typography>
                  </Box>
                ) : null}

                {summaryNote ? (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px solid ${alpha(forest, 0.1)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}
                    >
                      Order notes
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap" }}>
                      {String(summaryNote)}
                    </Typography>
                  </Box>
                ) : null}

                {razorpayRows.length > 0 ? (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px solid ${alpha(forest, 0.1)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}
                    >
                      Payment reference
                    </Typography>
                    <Stack spacing={1}>
                      {razorpayRows.map((row, idx) => (
                        <Box key={`${row.label}-${idx}`}>
                          <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600 }}>
                            {row.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-all" }}>
                            {row.value}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ) : null}
              </>
            ) : activeTab === 1 ? (
              <Box sx={{ overflow: "auto" }}>
                {lineItems.length === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No line items</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                      This order has no items in the response.
                    </Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(accent, 0.08) }}>
                        <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Qty
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Unit
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Line total
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((line, idx) => {
                        const qty = lineQty(line);
                        const unit = lineUnit(line);
                        const rowKey = line?._id ?? line?.id ?? idx;
                        return (
                          <TableRow key={rowKey}>
                            <TableCell sx={{ fontWeight: 600 }}>{lineLabel(line)}</TableCell>
                            <TableCell>{lineSku(line)}</TableCell>
                            <TableCell align="right">{qty}</TableCell>
                            <TableCell align="right">{formatAmount(unit)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {formatAmount(unit * qty)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Box>
            ) : activeTab === 2 ? (
              <Box>
                {statusHistory.length === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: "#19271f", mb: 0.5 }}>No status history</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                      Status updates will appear here once recorded.
                    </Typography>
                  </Box>
                ) : (
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
                          {formatStatusLabel(entry?.status)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#6f7f77", display: "block" }}>
                          {formatDateTime(entry?.at ?? entry?.createdAt ?? entry?.timestamp ?? entry?.updatedAt)}
                          {entry?.by || entry?.updatedBy ? ` · ${entry.by ?? entry.updatedBy}` : ""}
                        </Typography>
                        {entry?.note ? (
                          <Typography variant="body2" sx={{ color: "#1f2a24", mt: 0.5 }}>
                            {String(entry.note)}
                          </Typography>
                        ) : null}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {showStatusUpdateCard ? (
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
                      sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}
                    >
                      Update status
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6f7f77", display: "block", mb: 1.25 }}>
                      {forwardActions.nextStatus
                        ? `Current: ${statusLabel}. Next step: ${formatStatusLabel(forwardActions.nextStatus)}.`
                        : `Current: ${statusLabel}. You can cancel below if required.`}
                    </Typography>
                    {forwardActions.nextStatus ? (
                      <TextField
                        size="small"
                        label="Note (optional)"
                        placeholder="Packed and ready for dispatch"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        disabled={saving}
                        fullWidth
                        sx={{ maxWidth: 420, mb: 1.25 }}
                      />
                    ) : null}
                    <Stack spacing={1} sx={{ maxWidth: 420 }}>
                      {forwardActions.nextStatus ? (
                        <Button
                          size="medium"
                          fullWidth
                          variant="contained"
                          disabled={saving}
                          onClick={() => void updateStatus(forwardActions.nextStatus)}
                          sx={{
                            textTransform: "capitalize",
                            fontWeight: 700,
                            bgcolor: accent,
                            boxShadow: "none",
                            "&:hover": { bgcolor: "#8f723c", boxShadow: "none" },
                          }}
                        >
                          {saving ? "Updating…" : formatStatusLabel(forwardActions.nextStatus)}
                        </Button>
                      ) : null}
                      {forwardActions.nextStatus && forwardActions.showCancelled ? <Divider /> : null}
                      {forwardActions.showCancelled ? (
                        <Button
                          size="medium"
                          fullWidth
                          color="error"
                          variant="outlined"
                          disabled={saving}
                          onClick={() => void updateStatus(STATUS_CANCELLED)}
                          sx={{ textTransform: "capitalize", fontWeight: 700, boxShadow: "none" }}
                        >
                          {saving ? "Updating…" : formatStatusLabel(STATUS_CANCELLED)}
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: "#6f7f77" }}>
                    No status changes available for this order.
                  </Typography>
                )}

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
                    sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}
                  >
                    Shipping (Shiprocket)
                  </Typography>
                  {!roleCanManageShipping ? (
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      Only super_admin or manager can manage shipments.
                    </Alert>
                  ) : null}

                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="contained"
                      onClick={() =>
                        runShippingAction({
                          action: "create",
                          method: "post",
                          endpoint: `/admin/shipping/${encodeURIComponent(orderNumber.trim())}/create`,
                        })
                      }
                      disabled={
                        !roleCanManageShipping ||
                        shippingBusy === "create" ||
                        String(currentStatus).toLowerCase() !== "processing"
                      }
                      sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                    >
                      {shippingBusy === "create" ? "Creating…" : "Create Shipment"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        runShippingAction({
                          action: "track",
                          method: "get",
                          endpoint: `/admin/shipping/${encodeURIComponent(orderNumber.trim())}/track`,
                        })
                      }
                      disabled={!roleCanManageShipping || shippingBusy === "track"}
                      sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha(forest, 0.25), color: "#2a4135" }}
                    >
                      {shippingBusy === "track" ? "Tracking…" : "Track Shipment"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() =>
                        runShippingAction({
                          action: "cancel",
                          method: "post",
                          endpoint: `/admin/shipping/${encodeURIComponent(orderNumber.trim())}/cancel`,
                        })
                      }
                      disabled={!roleCanManageShipping || shippingBusy === "cancel"}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      {shippingBusy === "cancel" ? "Cancelling…" : "Cancel Shipment"}
                    </Button>
                  </Stack>

                  <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Tracking ID
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                        {shippingDetails.trackingId || "—"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        AWB
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                        {shippingDetails.awb || "—"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Tracking URL
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                        {shippingDetails.trackingUrl ? (
                          <Link href={shippingDetails.trackingUrl} target="_blank" rel="noopener noreferrer" sx={{ color: accent, fontWeight: 600 }}>
                            {shippingDetails.trackingUrl}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Shipping status
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#1f2a24", textTransform: "capitalize" }}>
                        {shippingDetails.shippingStatus || "—"}
                      </Typography>
                    </Grid>
                  </Grid>

                  {String(currentStatus).toLowerCase() !== "processing" ? (
                    <Typography variant="caption" sx={{ mt: 1.25, display: "block", color: "#8a6a2f" }}>
                      Shipment creation is allowed only when order status is processing.
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            )}

            <Divider sx={{ mt: 3, mb: 2 }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
              <Typography variant="caption" sx={{ color: "#8a9690", fontWeight: 600 }}>
                ID: {id || "—"}
              </Typography>
              <Button
                variant="text"
                onClick={() => navigate("/admin/orders")}
                sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }}
              >
                Back to orders
              </Button>
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminOrderDetail;

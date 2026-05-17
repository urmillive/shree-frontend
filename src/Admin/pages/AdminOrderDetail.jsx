import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";

/** Linear happy-path; only the next step is offered as a forward button. */
const STATUS_FORWARD_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];
const STATUS_CANCELLED = "cancelled";
/** No status controls on this page. */
const TERMINAL_STATUS_NO_UI = new Set(["delivered", "cancelled", "returned"]);

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

const SKIP_EXTRA_KEYS = new Set([
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

const SUMMARY_SCALAR_KEYS = new Set([
  "_id",
  "id",
  "orderNumber",
  "order_no",
  "orderNo",
  "number",
  "status",
  "orderStatus",
  "createdAt",
  "created_at",
  "placedAt",
  "updatedAt",
  "updated_at",
  "paymentMethod",
  "payment_method",
  "paymentStatus",
  "payment_status",
  "customerName",
  "customer_name",
  "totalAmount",
  "total",
  "grandTotal",
  "subtotal",
  "subTotal",
  "shippingFee",
  "shipping",
  "shippingCost",
  "tax",
  "gst",
  "discount",
  "couponCode",
  "notes",
  "note",
  "internalNote",
  "trackingId",
  "tracking_id",
  "shipmentId",
  "shipment_id",
  "awb",
  "awbCode",
  "awb_code",
  "awbNumber",
  "trackingUrl",
  "tracking_url",
  "trackUrl",
  "trackingLink",
  "shippingStatus",
  "shipmentStatus",
  "trackingStatus",
]);

function normalizeOrderPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.order ?? root.data?.order ?? root.data ?? root;
  }
  return root;
}

function pickStatusHistory(order) {
  const raw = order?.statusHistory ?? order?.history ?? order?.orderStatusHistory ?? [];
  return Array.isArray(raw) ? raw : [];
}

function formatStatusLabel(value) {
  if (value == null || value === "") return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

function pickNestedShipping(order) {
  const nested = order?.shiprocket ?? order?.shipment ?? order?.shipping;
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return {};
  return nested;
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
  return raw == null ? null : String(raw);
}

function formatDate(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value != null && value !== "" ? String(value) : "—";
  return `Rs ${n.toFixed(2)}`;
}

function humanizeKey(key) {
  return String(key).replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
}

function formatScalar(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return String(value);
}

function pickLines(order) {
  const raw = order?.items ?? order?.lineItems ?? order?.lines ?? [];
  return Array.isArray(raw) ? raw : [];
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

function pickShippingRecord(order) {
  return order?.shippingAddress ?? order?.address ?? order?.deliveryAddress ?? null;
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

function firstMoney(...candidates) {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function NestedValue({ value, depth = 0 }) {
  if (value == null || value === "") {
    return (
      <Typography component="span" variant="body2" sx={{ color: "#1f2a24" }}>
        —
      </Typography>
    );
  }
  if (typeof value !== "object") {
    return (
      <Typography component="span" variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
        {formatScalar(value)}
      </Typography>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Typography component="span" variant="body2" sx={{ color: "#1f2a24" }}>
          —
        </Typography>
      );
    }
    if (value.every((v) => v == null || ["string", "number", "boolean"].includes(typeof v))) {
      return (
        <Typography component="span" variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
          {value.map((v) => formatScalar(v)).join(", ")}
        </Typography>
      );
    }
    if (depth >= 2) {
      return (
        <Typography component="span" variant="body2" sx={{ color: "#6f7f77" }}>
          {value.length} entries
        </Typography>
      );
    }
    return (
      <Stack component="span" spacing={0.75} sx={{ display: "inline-flex", verticalAlign: "top", width: "100%" }}>
        {value.map((entry, idx) => (
          <Box key={idx} sx={{ pl: 1, borderLeft: `2px solid ${alpha("#0f3828", 0.12)}` }}>
            <NestedValue value={entry} depth={depth + 1} />
          </Box>
        ))}
      </Stack>
    );
  }
  if (depth >= 3) {
    return (
      <Typography component="span" variant="body2" sx={{ color: "#6f7f77" }}>
        (nested data)
      </Typography>
    );
  }
  const entries = Object.entries(value).filter(([k]) => k !== "__v");
  if (entries.length === 0) {
    return (
      <Typography component="span" variant="body2" sx={{ color: "#1f2a24" }}>
        —
      </Typography>
    );
  }
  return (
    <Stack spacing={0.5} sx={{ mt: 0.25 }}>
      {entries.map(([k, v]) => (
        <Box key={k} sx={{ pl: depth ? 1 : 0, borderLeft: depth ? `1px solid ${alpha("#0f3828", 0.1)}` : "none" }}>
          <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, display: "block" }}>
            {humanizeKey(k)}
          </Typography>
          <Box sx={{ pl: 0.5 }}>
            <NestedValue value={v} depth={depth + 1} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function normalizeApiPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.data ?? root.order ?? root;
  }
  return root;
}

function pickShippingField(order, keys) {
  for (const key of keys) {
    const value = order?.[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

const AdminOrderDetail = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusDraft, setStatusDraft] = useState("pending");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [shippingBusy, setShippingBusy] = useState("");

  const roleCanManageShipping = ["super_admin", "manager"].includes(roleGate || "");

  const applyOrderBody = useCallback((body) => {
    if (!body || typeof body !== "object") return false;
    setOrder(body);
    const current = pickOrderStatus(body);
    const { nextStatus } = getForwardStatusActions(current);
    setStatusDraft(nextStatus ?? current ?? "pending");
    return true;
  }, []);

  const loadOrder = useCallback(async () => {
    if (!orderNumber) {
      setLoading(false);
      setError("Missing order number.");
      return;
    }
    setLoading(true);
    setError("");
    setActionError("");
    setActionSuccess("");
    try {
      const { data } = await client.get(`/admin/orders/${encodeURIComponent(orderNumber)}`);
      const body = normalizeOrderPayload(data);
      if (!applyOrderBody(body)) {
        setError("Unexpected response from server.");
        setOrder(null);
      }
    } catch (e) {
      setOrder(null);
      setError(getApiErrorMessage(e, "Failed to load order."));
    } finally {
      setLoading(false);
    }
  }, [applyOrderBody, orderNumber]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const lineItems = useMemo(() => pickLines(order), [order]);
  const addressText = useMemo(() => formatAddressLines(pickShippingRecord(order)), [order]);
  const customer = useMemo(() => pickCustomerBlock(order), [order]);
  const pricingAmounts = useMemo(() => pickPricingAmounts(order || {}), [order]);
  const { grand, subtotal, shipping: shippingCost, tax: taxVal, discount: discountVal } = pricingAmounts;
  const statusHistory = useMemo(() => pickStatusHistory(order), [order]);

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
        rows.push({ label: `Payment ${humanizeKey(k)}`, value: formatScalar(v) });
      }
    }
    return rows;
  }, [order]);

  const extraEntries = useMemo(() => {
    if (!order) return [];
    return Object.entries(order).filter(([k]) => !SKIP_EXTRA_KEYS.has(k) && !SUMMARY_SCALAR_KEYS.has(k));
  }, [order]);

  const summaryNote = [order?.notes, order?.note, order?.internalNote].find((n) => n != null && String(n).trim() !== "");

  const canUpdate = Boolean(orderNumber) && Boolean(statusDraft);
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

  const updateStatus = async () => {
    if (!canUpdate) return;
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      const payload = {
        status: statusDraft,
      };
      if (noteDraft.trim()) payload.note = noteDraft.trim();

      await client.patch(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, payload);
      await loadOrder();
      setActionSuccess("Order status updated successfully.");
      setNoteDraft("");
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Failed to update order status."));
    } finally {
      setSaving(false);
    }
  };

  const syncOrderFromShipping = async () => {
    if (!orderNumber) return;
    try {
      const { data } = await client.get(`/admin/orders/${encodeURIComponent(orderNumber)}`);
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
    if (!orderNumber) return;
    setShippingBusy(action);
    setActionError("");
    setActionSuccess("");
    try {
      const req = method === "get" ? client.get(endpoint) : client.post(endpoint);
      const { data } = await req;
      applyShippingResponse(data);
      await syncOrderFromShipping();

      if (action === "create") setActionSuccess("Shipment created successfully on Shiprocket.");
      if (action === "track") setActionSuccess("Shipment tracking details fetched successfully.");
      if (action === "cancel") setActionSuccess("Shipment cancelled successfully on Shiprocket.");
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Shipping action failed."));
    } finally {
      setShippingBusy("");
    }
  };

  if (!["super_admin", "manager", "support_staff"].includes(roleGate || "")) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
          Back
        </Button>
      </Box>
    );
  }

  const resolvedOrderNumber = pickOrderNumber(order) || String(orderNumber || "");

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Orders", to: "/admin/orders" },
            { label: resolvedOrderNumber || "Order" },
          ]}
        />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: accent }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : order ? (
          <Stack spacing={2.25}>
            {actionError ? (
              <Alert severity="error" onClose={() => setActionError("")}>
                {actionError}
              </Alert>
            ) : null}
            {actionSuccess ? (
              <Alert severity="success" onClose={() => setActionSuccess("")}>
                {actionSuccess}
              </Alert>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 0.5 }}>
              <Box>
                <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
                  Order {resolvedOrderNumber || "—"}
                </Typography>
                <Typography sx={{ color: "#6f7f77", fontWeight: 600, mt: 0.25 }}>
                  Current status: {formatStatusLabel(currentStatus)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/orders")}>
                  Back to list
                </Button>
                <Button
                  variant="outlined"
                  sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}
                  onClick={() => void loadOrder()}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Stack>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 2.5,
                border: `1px solid ${alpha("#0f3828", 0.1)}`,
                boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
              }}
            >
              <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                Order details
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                Summary
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                {order?._id ? (
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Document ID
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-all" }}>
                      {String(order._id)}
                    </Typography>
                  </Grid>
                ) : null}
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Order status
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                    {formatStatusLabel(currentStatus)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Placed
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    {formatDate(order?.createdAt ?? order?.created_at ?? order?.placedAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Last updated
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    {formatDate(order?.updatedAt ?? order?.updated_at)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Delivered
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    {formatDate(order?.deliveredAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Payment method
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    {formatStatusLabel(order?.paymentMethod ?? order?.payment_method ?? order?.payment?.method)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Payment status
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                    {formatStatusLabel(order?.paymentStatus ?? order?.payment_status ?? order?.payment?.status)}
                  </Typography>
                </Grid>
                {order?.couponCode ? (
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Coupon
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                      {String(order.couponCode)}
                    </Typography>
                  </Grid>
                ) : null}
              </Grid>

              {(customer.name || customer.email || customer.phone) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Customer
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    {customer.name ? (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          Name
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                          {customer.name}
                        </Typography>
                      </Grid>
                    ) : null}
                    {customer.email ? (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          Email
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                          {customer.email}
                        </Typography>
                      </Grid>
                    ) : null}
                    {customer.phone ? (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          Phone
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24" }}>
                          {customer.phone}
                        </Typography>
                      </Grid>
                    ) : null}
                  </Grid>
                </>
              )}

              {addressText ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Delivery address
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap", mt: 0.75 }}>
                    {addressText}
                  </Typography>
                </>
              ) : null}

              {summaryNote ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Order notes
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap", mt: 0.75 }}>
                    {String(summaryNote)}
                  </Typography>
                </>
              ) : null}

              <Divider sx={{ my: 2 }} />
              <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                Amounts
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                {subtotal != null ? (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Subtotal
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                      {formatAmount(subtotal)}
                    </Typography>
                  </Grid>
                ) : null}
                {shippingCost != null ? (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Shipping
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                      {formatAmount(shippingCost)}
                    </Typography>
                  </Grid>
                ) : null}
                {taxVal != null ? (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Tax
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                      {formatAmount(taxVal)}
                    </Typography>
                  </Grid>
                ) : null}
                {discountVal != null ? (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Discount
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                      {formatAmount(discountVal)}
                    </Typography>
                  </Grid>
                ) : null}
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#19271f", fontWeight: 800 }}>
                    {grand != null ? formatAmount(grand) : "—"}
                  </Typography>
                </Grid>
              </Grid>

              {razorpayRows.length > 0 ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Payment reference
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    {razorpayRows.map((row, idx) => (
                      <Grid item xs={12} sm={6} key={`${row.label}-${idx}`}>
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {row.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-all" }}>
                          {row.value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : null}

              <Divider sx={{ my: 2 }} />
              <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                Status history
              </Typography>
              {statusHistory.length > 0 ? (
                <Stack spacing={1.25} sx={{ mt: 1 }}>
                  {statusHistory.map((entry, idx) => (
                    <Box
                      key={`${entry?.status ?? "status"}-${idx}`}
                      sx={{
                        pl: 1.5,
                        py: 1,
                        borderLeft: `3px solid ${idx === statusHistory.length - 1 ? accent : alpha("#0f3828", 0.15)}`,
                        bgcolor: idx === statusHistory.length - 1 ? alpha(accent, 0.06) : "transparent",
                        borderRadius: "0 8px 8px 0",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                        {formatStatusLabel(entry?.status)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6f7f77", display: "block" }}>
                        {formatDate(entry?.at ?? entry?.createdAt ?? entry?.timestamp ?? entry?.updatedAt)}
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
              ) : (
                <Typography variant="body2" sx={{ color: "#6f7f77", mt: 1 }}>
                  No status updates yet.
                </Typography>
              )}

              {lineItems.length > 0 ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Line items
                  </Typography>
                  <TableContainer sx={{ mt: 1.25, borderRadius: 1, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
                          <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Product</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>SKU</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: "#2a4135" }}>
                            Qty
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: "#2a4135" }}>
                            Unit
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: "#2a4135" }}>
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
                              <TableCell sx={{ color: "#1f2a24", fontWeight: 600 }}>{lineLabel(line)}</TableCell>
                              <TableCell sx={{ color: "#1f2a24" }}>{lineSku(line)}</TableCell>
                              <TableCell align="right" sx={{ color: "#1f2a24" }}>
                                {qty}
                              </TableCell>
                              <TableCell align="right" sx={{ color: "#1f2a24" }}>
                                {formatAmount(unit)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: "#1f2a24", fontWeight: 700 }}>
                                {formatAmount(unit * qty)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : null}

              {extraEntries.length > 0 ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Additional fields
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    {extraEntries.map(([k, v]) => (
                      <Grid item xs={12} sm={6} key={k}>
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {humanizeKey(k)}
                        </Typography>
                        <Box sx={{ mt: 0.25 }}>
                          <NestedValue value={v} />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : null}
            </Paper>

            {showStatusUpdateCard ? (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 2.5,
                  border: `1px solid ${alpha("#0f3828", 0.1)}`,
                  boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
                }}
              >
                <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                  Update status
                </Typography>
                <Typography variant="caption" sx={{ color: "#6f7f77", display: "block", mt: 0.75 }}>
                  {forwardActions.nextStatus
                    ? `Current: ${formatStatusLabel(currentStatus)}. Next step: ${formatStatusLabel(forwardActions.nextStatus)}. You can also cancel. Add a note if needed, then save.`
                    : `Current: ${formatStatusLabel(currentStatus)}. This status is outside the usual flow — you can cancel below if required.`}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.25, maxWidth: 420 }}>
                  {forwardActions.nextStatus ? (
                    <Button
                      size="medium"
                      fullWidth
                      variant={String(statusDraft).toLowerCase() === forwardActions.nextStatus ? "contained" : "outlined"}
                      disabled={saving}
                      onClick={() => setStatusDraft(forwardActions.nextStatus)}
                      sx={{
                        textTransform: "capitalize",
                        fontWeight: 700,
                        justifyContent: "center",
                        py: 1,
                        borderColor: alpha("#0f3828", 0.28),
                        color: String(statusDraft).toLowerCase() === forwardActions.nextStatus ? "#fff" : "#2a4135",
                        bgcolor: String(statusDraft).toLowerCase() === forwardActions.nextStatus ? accent : "transparent",
                        boxShadow: "none",
                        ...(String(statusDraft).toLowerCase() === forwardActions.nextStatus
                          ? { "&:hover": { bgcolor: "#8f723c", boxShadow: "none" } }
                          : {
                              "&:hover": {
                                borderColor: alpha(accent, 0.65),
                                bgcolor: alpha(accent, 0.06),
                              },
                            }),
                      }}
                    >
                      {formatStatusLabel(forwardActions.nextStatus)}
                    </Button>
                  ) : null}
                  {forwardActions.nextStatus && forwardActions.showCancelled ? <Divider sx={{ my: 0.5 }} /> : null}
                  {forwardActions.showCancelled ? (
                    <Button
                      size="medium"
                      fullWidth
                      color="error"
                      variant={String(statusDraft).toLowerCase() === STATUS_CANCELLED ? "contained" : "outlined"}
                      disabled={saving}
                      onClick={() => setStatusDraft(STATUS_CANCELLED)}
                      sx={{
                        textTransform: "capitalize",
                        fontWeight: 700,
                        justifyContent: "center",
                        py: 1,
                        boxShadow: "none",
                        ...(String(statusDraft).toLowerCase() === STATUS_CANCELLED
                          ? { "&:hover": { boxShadow: "none" } }
                          : {
                              "&:hover": {
                                bgcolor: alpha("#d32f2f", 0.06),
                              },
                            }),
                      }}
                    >
                      {formatStatusLabel(STATUS_CANCELLED)}
                    </Button>
                  ) : null}
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mt: 1.75 }}>
                  <TextField
                    size="small"
                    label="Note"
                    placeholder="Packed and ready for dispatch"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    disabled={
                      saving ||
                      !canUpdate ||
                      (String(statusDraft).toLowerCase() === String(currentStatus).toLowerCase() && !noteDraft.trim())
                    }
                    onClick={updateStatus}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: accent,
                      minWidth: { xs: "100%", sm: 160 },
                      alignSelf: { xs: "stretch", sm: "center" },
                      "&:hover": { bgcolor: "#8f723c" },
                    }}
                  >
                    {saving ? "Updating..." : "Save status"}
                  </Button>
                </Stack>
              </Paper>
            ) : null}

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 2.5,
                border: `1px solid ${alpha("#0f3828", 0.1)}`,
                boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
              }}
            >
              <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                Shipping (Shiprocket)
              </Typography>
              {!roleCanManageShipping ? (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  Only super_admin or manager can manage shipments.
                </Alert>
              ) : null}

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} sx={{ mt: 1.5 }}>
                <Button
                  variant="contained"
                  onClick={() =>
                    runShippingAction({
                      action: "create",
                      method: "post",
                      endpoint: `/admin/shipping/${encodeURIComponent(orderNumber)}/create`,
                    })
                  }
                  disabled={
                    !roleCanManageShipping || shippingBusy === "create" || String(currentStatus).toLowerCase() !== "processing"
                  }
                  sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
                >
                  {shippingBusy === "create" ? "Creating..." : "Create Shipment"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() =>
                    runShippingAction({
                      action: "track",
                      method: "get",
                      endpoint: `/admin/shipping/${encodeURIComponent(orderNumber)}/track`,
                    })
                  }
                  disabled={!roleCanManageShipping || shippingBusy === "track"}
                  sx={{ textTransform: "none", fontWeight: 700, borderColor: alpha("#0f3828", 0.25), color: "#2a4135" }}
                >
                  {shippingBusy === "track" ? "Tracking..." : "Track Shipment"}
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={() =>
                    runShippingAction({
                      action: "cancel",
                      method: "post",
                      endpoint: `/admin/shipping/${encodeURIComponent(orderNumber)}/cancel`,
                    })
                  }
                  disabled={!roleCanManageShipping || shippingBusy === "cancel"}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  {shippingBusy === "cancel" ? "Cancelling..." : "Cancel Shipment"}
                </Button>
              </Stack>

              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Tracking ID
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                    {shippingDetails.trackingId || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    AWB
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                    {shippingDetails.awb || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Tracking URL
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                    {shippingDetails.trackingUrl ? (
                      <a href={shippingDetails.trackingUrl} target="_blank" rel="noreferrer">
                        {shippingDetails.trackingUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Shipping status
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word", textTransform: "capitalize" }}>
                    {shippingDetails.shippingStatus || "—"}
                  </Typography>
                </Grid>
              </Grid>

              {String(currentStatus).toLowerCase() !== "processing" ? (
                <Typography variant="caption" sx={{ mt: 1.25, display: "block", color: "#8a6a2f" }}>
                  Shipment creation is allowed only when order status is processing.
                </Typography>
              ) : null}
            </Paper>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminOrderDetail;

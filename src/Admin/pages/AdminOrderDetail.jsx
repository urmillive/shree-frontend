import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

const COMPLEX_KEYS = new Set(["items", "statusHistory", "shippingAddress", "pricing"]);

function normalizeOrderPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.order ?? root;
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
  return raw == null ? null : String(raw);
}

function formatValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
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

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      setError("Missing order number.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setOrder(null);
      try {
        const { data } = await client.get(`/admin/orders/${encodeURIComponent(orderNumber)}`);
        if (cancelled) return;
        const body = normalizeOrderPayload(data);
        if (!body || typeof body !== "object") {
          setError("Unexpected response from server.");
          setOrder(null);
          return;
        }
        setOrder(body);
        setStatusDraft(String(body?.status ?? "pending"));
      } catch (e) {
        if (cancelled) return;
        setOrder(null);
        setError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || "Failed to load order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const orderEntries = useMemo(() => {
    const entries = Object.entries(order || {}).filter(([k]) => k !== "__v" && !COMPLEX_KEYS.has(k));
    const mid = Math.ceil(entries.length / 2);
    return { left: entries.slice(0, mid), right: entries.slice(mid) };
  }, [order]);

  const canUpdate = Boolean(orderNumber) && Boolean(statusDraft);
  const currentStatus = String(order?.status ?? "");
  const shippingDetails = useMemo(
    () => ({
      trackingId: pickShippingField(order, ["trackingId", "tracking_id", "shipmentId", "shipment_id"]),
      awb: pickShippingField(order, ["awb", "awbCode", "awb_code", "awbNumber"]),
      trackingUrl: pickShippingField(order, ["trackingUrl", "tracking_url", "trackUrl", "trackingLink"]),
      shippingStatus: pickShippingField(order, ["shippingStatus", "shipmentStatus", "trackingStatus"]),
    }),
    [order]
  );

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

      const { data } = await client.patch(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, payload);
      const updated = normalizeOrderPayload(data);
      setOrder((prev) => ({
        ...(prev || {}),
        ...(updated && typeof updated === "object" ? updated : {}),
        status: statusDraft,
      }));
      setActionSuccess("Order status updated successfully.");
      setNoteDraft("");
    } catch (e) {
      setActionError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || "Failed to update order status.");
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
        setOrder((prev) => ({ ...(prev || {}), ...normalized }));
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
      setActionError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || "Shipping action failed.");
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
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mt: 1 }}>
                <TextField
                  select
                  size="small"
                  label="New status"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(String(e.target.value))}
                  sx={{ minWidth: 220 }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
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
                  disabled={saving || !canUpdate || (statusDraft === currentStatus && !noteDraft.trim())}
                  onClick={updateStatus}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: accent,
                    minWidth: 150,
                    "&:hover": { bgcolor: "#8f723c" },
                  }}
                >
                  {saving ? "Updating..." : "Update Status"}
                </Button>
              </Stack>
            </Paper>

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

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 2.5,
                border: `1px solid ${alpha("#0f3828", 0.1)}`,
                boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", mb: 0.5 }}>
                Order {resolvedOrderNumber || "—"}
              </Typography>
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "capitalize" }}>
                Current status: {currentStatus || "—"}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.25}>
                    {orderEntries.left.map(([k, v]) => (
                      <Box key={k}>
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {k.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {formatValue(v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.25}>
                    {orderEntries.right.map(([k, v]) => (
                      <Box key={k}>
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {k.replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {formatValue(v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              </Grid>

              {/* Shipping address */}
              {order?.shippingAddress && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Shipping Address
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1f2a24", mt: 0.5 }}>
                    {[order.shippingAddress.name, order.shippingAddress.mobile, order.shippingAddress.line1, order.shippingAddress.line2, [order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.pincode].filter(Boolean).join(", "), order.shippingAddress.country].filter(Boolean).join(" · ")}
                  </Typography>
                </>
              )}

              {/* Pricing */}
              {order?.pricing && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}>
                    Pricing
                  </Typography>
                  <Stack spacing={0.5}>
                    {Object.entries(order.pricing).map(([k, v]) => (
                      <Box key={k} sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "#6f7f77", textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1").trim()}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1f2a24" }}>₹{Number(v).toLocaleString("en-IN")}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}

              {/* Items */}
              {Array.isArray(order?.items) && order.items.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}>
                    Items ({order.items.length})
                  </Typography>
                  <Stack spacing={1}>
                    {order.items.map((item, idx) => (
                      <Box key={item.variantId ?? idx} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#1f2a24" }}>{item.productName}</Typography>
                          <Typography variant="caption" sx={{ color: "#6f7f77" }}>{item.size} · {item.color?.name} · SKU: {item.sku} · Qty: {item.quantity}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>₹{Number(item.lineTotal).toLocaleString("en-IN")}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}

              {/* Status history */}
              {Array.isArray(order?.statusHistory) && order.statusHistory.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 1 }}>
                    Status History
                  </Typography>
                  <Stack spacing={0.75}>
                    {order.statusHistory.map((h, idx) => (
                      <Box key={idx} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, textTransform: "capitalize", minWidth: 110 }}>{h.status}</Typography>
                        <Typography variant="caption" sx={{ color: "#6f7f77" }}>{h.timestamp ? new Date(h.timestamp).toLocaleString() : "—"}</Typography>
                        {h.note && <Typography variant="caption" sx={{ color: "#6f7f77", fontStyle: "italic" }}>— {h.note}</Typography>}
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </Paper>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminOrderDetail;

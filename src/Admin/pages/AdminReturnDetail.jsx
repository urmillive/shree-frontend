import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const REFUND_METHOD_OPTIONS = [
  { value: "original_payment", label: "Original payment (Razorpay)" },
  { value: "credit_note", label: "Credit note" },
];

const DETAIL_SKIP_KEYS = new Set([
  "__v",
  "items",
  "lineItems",
  "lines",
  "user",
  "customer",
  "order",
  "refund",
  "statusHistory",
  "history",
  "returnStatusHistory",
]);

const FIELD_LABEL_OVERRIDES = {
  _id: "ID",
  returnNumber: "Return Number",
  orderNumber: "Order Number",
  createdAt: "Requested",
  updatedAt: "Updated",
  requestedAt: "Requested",
  rejectionReason: "Rejection Reason",
  refundAmount: "Refund Amount",
  approvedRefundAmount: "Approved Refund",
};

function normalizeReturnPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.return ?? root;
  }
  return root;
}

function normalizeRefundPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object") {
    if (root.refund && typeof root.refund === "object") return root.refund;
    if (root.data && typeof root.data === "object") return root.data;
    return root;
  }
  return null;
}

function pickReturnNumber(returnItem) {
  const raw =
    returnItem?.returnNumber ??
    returnItem?.return_no ??
    returnItem?.returnNo ??
    returnItem?.number ??
    returnItem?._id ??
    returnItem?.id ??
    null;
  return raw == null ? "" : String(raw);
}

function pickReturnId(returnItem) {
  if (!returnItem) return "";
  return String(returnItem._id ?? returnItem.id ?? "").trim();
}

function pickOrderNumber(returnItem) {
  const raw =
    returnItem?.orderNumber ??
    returnItem?.order_no ??
    returnItem?.orderNo ??
    returnItem?.order?.orderNumber ??
    returnItem?.orderId ??
    returnItem?.order?.orderId ??
    null;
  return raw != null && String(raw).trim() !== "" ? String(raw) : "";
}

function pickLines(returnItem) {
  const raw = returnItem?.items ?? returnItem?.lineItems ?? returnItem?.lines ?? [];
  return Array.isArray(raw) ? raw : [];
}

function pickStatusHistory(returnItem) {
  const raw = returnItem?.statusHistory ?? returnItem?.history ?? returnItem?.returnStatusHistory ?? [];
  return Array.isArray(raw) ? raw : [];
}

function pickCustomerBlock(returnItem) {
  const name =
    returnItem?.customerName ??
    returnItem?.user?.name ??
    returnItem?.customer?.name ??
    returnItem?.order?.customerName ??
    "";
  const email = returnItem?.user?.email ?? returnItem?.customer?.email ?? returnItem?.email ?? "";
  const phone =
    returnItem?.user?.phone ??
    returnItem?.user?.mobile ??
    returnItem?.customer?.phone ??
    returnItem?.customer?.mobile ??
    returnItem?.phone ??
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
  if (key === "createdAt" || key === "updatedAt" || key === "requestedAt") return formatDateTime(v);
  if (key === "status") return formatStatusLabel(v);
  if (key === "refundAmount" || key === "approvedRefundAmount" || key === "amount") return formatAmount(v);
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

function lineLabel(line) {
  return line?.productName ?? line?.name ?? line?.title ?? "Item";
}

function lineQty(line) {
  const q = Number(line?.quantity ?? line?.qty ?? 1);
  return Number.isFinite(q) ? q : 1;
}

function lineSku(line) {
  const raw = line?.sku ?? line?.SKU ?? line?.variantSku ?? line?.variant?.sku ?? "";
  return raw != null && String(raw).trim() !== "" ? String(raw) : "—";
}

function pickRefundRows(returnItem) {
  if (!returnItem) return [];
  const refund = returnItem?.refund;
  const rows = [];
  if (refund && typeof refund === "object") {
    for (const [k, v] of Object.entries(refund)) {
      if (v != null && typeof v === "object") continue;
      rows.push({ label: formatFieldLabel(k), value: String(v ?? "—") });
    }
  }
  if (returnItem?.refundMethod) rows.push({ label: "Refund method", value: formatStatusLabel(returnItem.refundMethod) });
  if (returnItem?.razorpayRefundId) rows.push({ label: "Razorpay refund id", value: String(returnItem.razorpayRefundId) });
  if (returnItem?.creditNoteCode) rows.push({ label: "Credit note code", value: String(returnItem.creditNoteCode) });
  return rows;
}

const AdminReturnDetail = () => {
  const navigate = useNavigate();
  const { returnNumber: returnNumberParam = "" } = useParams();
  const returnNumber = returnNumberParam ? decodeURIComponent(returnNumberParam) : "";
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(
    () => ["super_admin", "manager", "support_staff"].includes(roleGate || ""),
    [roleGate],
  );

  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);

  const [noteDraft, setNoteDraft] = useState("");
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [refundMethod, setRefundMethod] = useState("original_payment");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);

  const applyReturnBody = useCallback((body) => {
    if (!body || typeof body !== "object") return false;
    setReturnData(body);
    return true;
  }, []);

  useEffect(() => {
    if (!isAdminAllowed) return;
    if (!returnNumber.trim()) {
      setLoading(false);
      setError("Missing return number.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setFeedback({ type: "", message: "" });
      setReturnData(null);
      try {
        const { data } = await client.get(`/admin/returns/${encodeURIComponent(returnNumber.trim())}`);
        if (cancelled) return;
        const body = normalizeReturnPayload(data);
        if (!body || typeof body !== "object" || !applyReturnBody(body)) {
          setError("Unexpected response from server.");
        }
      } catch (e) {
        if (cancelled) return;
        setReturnData(null);
        setError(getApiErrorMessage(e, "Failed to load return details."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [applyReturnBody, isAdminAllowed, returnNumber]);

  useEffect(() => {
    setActiveTab(0);
  }, [returnNumber]);

  const reloadReturn = useCallback(async () => {
    if (!returnNumber.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get(`/admin/returns/${encodeURIComponent(returnNumber.trim())}`);
      const body = normalizeReturnPayload(data);
      if (!body || typeof body !== "object" || !applyReturnBody(body)) {
        setError("Unexpected response from server.");
      }
    } catch (e) {
      setReturnData(null);
      setError(getApiErrorMessage(e, "Failed to load return details."));
    } finally {
      setLoading(false);
    }
  }, [applyReturnBody, returnNumber]);

  useEffect(() => {
    if (!returnData) return;
    const candidateAmount =
      returnData?.refund?.amount ??
      returnData?.refundAmount ??
      returnData?.approvedRefundAmount ??
      returnData?.amount ??
      "";
    setRefundAmount(candidateAmount === "" ? "" : String(candidateAmount));
  }, [returnData]);

  const lineItems = useMemo(() => pickLines(returnData), [returnData]);
  const statusHistory = useMemo(() => pickStatusHistory(returnData), [returnData]);
  const customer = useMemo(() => pickCustomerBlock(returnData || {}), [returnData]);
  const refundRows = useMemo(() => pickRefundRows(returnData), [returnData]);

  const currentStatus = String(returnData?.status ?? "");
  const canRefund = currentStatus === "approved";
  const isApproved = currentStatus === "approved";
  const isRejected = currentStatus === "rejected";

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(returnData || {}).filter(([k]) => !DETAIL_SKIP_KEYS.has(k));
    entries.push(
      ["customerName", customer.name || null],
      ["customerEmail", customer.email || null],
      ["customerPhone", customer.phone || null],
      ["orderNumber", pickOrderNumber(returnData) || null],
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
  }, [customer.email, customer.name, customer.phone, returnData]);

  const summaryReason = returnData?.reason ?? returnData?.returnReason ?? "";
  const summaryDescription = returnData?.description ?? returnData?.customerNote ?? "";
  const summaryNote = returnData?.note ?? returnData?.internalNote ?? "";
  const rejectionReason = returnData?.rejectionReason ?? "";

  const updateStatus = async (status) => {
    if (!returnNumber.trim()) return;
    if (status === "rejected" && !rejectionReasonDraft.trim()) {
      setFeedback({ type: "error", message: "Rejection reason is required to reject a return." });
      return;
    }

    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = { status };
      if (noteDraft.trim()) payload.note = noteDraft.trim();
      if (status === "rejected") payload.rejectionReason = rejectionReasonDraft.trim();

      await client.patch(`/admin/returns/${encodeURIComponent(returnNumber.trim())}/status`, payload);
      await reloadReturn();
      setFeedback({ type: "success", message: `Return ${formatStatusLabel(status).toLowerCase()} successfully.` });
      if (status === "approved") setRejectionReasonDraft("");
    } catch (e) {
      setFeedback({ type: "error", message: getApiErrorMessage(e, `Failed to ${status} return.`) });
    } finally {
      setSaving(false);
    }
  };

  const initiateRefund = async () => {
    if (!returnNumber.trim()) return;
    const parsedAmount = Number(refundAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid refund amount greater than zero." });
      return;
    }

    setRefundSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = { method: refundMethod, amount: parsedAmount };
      const { data } = await client.post(
        `/admin/payments/returns/${encodeURIComponent(returnNumber.trim())}/refund`,
        payload,
      );
      const refundPayload = normalizeRefundPayload(data) || {};
      await reloadReturn();
      if (refundMethod === "credit_note") {
        const creditNoteCode = refundPayload?.refund?.creditNoteCode ?? refundPayload?.creditNoteCode;
        setFeedback({
          type: "success",
          message: creditNoteCode
            ? `Credit note refund issued successfully (${creditNoteCode}).`
            : "Credit note refund issued successfully.",
        });
      } else {
        const razorpayRefundId = refundPayload?.refund?.razorpayRefundId ?? refundPayload?.razorpayRefundId;
        setFeedback({
          type: "success",
          message: razorpayRefundId
            ? `Refund initiated successfully (Razorpay refund ID: ${razorpayRefundId}).`
            : "Refund initiated successfully.",
        });
      }
    } catch (e) {
      setFeedback({ type: "error", message: getApiErrorMessage(e, "Failed to initiate refund.") });
    } finally {
      setRefundSaving(false);
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

  const id = pickReturnId(returnData);
  const displayNumber = pickReturnNumber(returnData) || returnNumber.trim() || "Return";
  const statusLabel = currentStatus ? formatStatusLabel(currentStatus) : "—";
  const orderNum = pickOrderNumber(returnData);

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
            { label: "Returns", to: "/admin/returns" },
            { label: loading ? "Return" : displayNumber },
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
        ) : returnData ? (
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Return
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
                Status: {statusLabel}
                {orderNum ? ` | Order: ${orderNum}` : ""}
                {customer.name ? ` | Customer: ${customer.name}` : ""}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {orderNum ? (
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/admin/orders/${encodeURIComponent(orderNum)}`)}
                    sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}
                  >
                    View Order
                  </Button>
                ) : null}
                <Button
                  variant="outlined"
                  onClick={() => void reloadReturn()}
                  disabled={loading}
                  sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}
                >
                  Refresh
                </Button>
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

                {summaryReason ? (
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
                      Return reason
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#1f2a24" }}>
                      {formatStatusLabel(summaryReason)}
                    </Typography>
                  </Box>
                ) : null}

                {summaryDescription ? (
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
                      Customer description
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap" }}>
                      {String(summaryDescription)}
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
                      Admin note
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#1f2a24", whiteSpace: "pre-wrap" }}>
                      {String(summaryNote)}
                    </Typography>
                  </Box>
                ) : null}

                {rejectionReason ? (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {String(rejectionReason)}
                  </Alert>
                ) : null}

                {refundRows.length > 0 ? (
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
                      Refund details
                    </Typography>
                    <Stack spacing={1}>
                      {refundRows.map((row, idx) => (
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
                      This return has no items in the response.
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
                        <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Refund
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((line, idx) => {
                        const rowKey = line?._id ?? line?.id ?? line?.variantId ?? idx;
                        return (
                          <TableRow key={rowKey}>
                            <TableCell sx={{ fontWeight: 600 }}>{lineLabel(line)}</TableCell>
                            <TableCell>{lineSku(line)}</TableCell>
                            <TableCell align="right">{lineQty(line)}</TableCell>
                            <TableCell>{formatStatusLabel(line?.reason)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {formatAmount(line?.refundAmount)}
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
                    Current: {statusLabel}. Approve or reject this return request.
                  </Typography>
                  <Stack spacing={1.25} sx={{ maxWidth: 480 }}>
                    <TextField
                      size="small"
                      label="Note (optional)"
                      placeholder="Valid size issue - approved for return"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      disabled={saving}
                      fullWidth
                    />
                    <TextField
                      size="small"
                      label="Rejection reason"
                      placeholder="Product shows signs of use - not eligible for return"
                      value={rejectionReasonDraft}
                      onChange={(e) => setRejectionReasonDraft(e.target.value)}
                      disabled={saving || isRejected}
                      fullWidth
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                      <Button
                        variant="contained"
                        disabled={saving || isApproved}
                        onClick={() => void updateStatus("approved")}
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          bgcolor: accent,
                          minWidth: 150,
                          "&:hover": { bgcolor: "#8f723c" },
                        }}
                      >
                        {saving ? "Updating…" : "Approve Return"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={saving || isRejected}
                        onClick={() => void updateStatus("rejected")}
                        sx={{ textTransform: "none", fontWeight: 700, minWidth: 150 }}
                      >
                        {saving ? "Updating…" : "Reject Return"}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>

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
                    Issue refund
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#6f7f77", mb: 1.25 }}>
                    Refund can only be initiated when the return is approved.
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
                    <TextField
                      select
                      size="small"
                      label="Method"
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(String(e.target.value))}
                      sx={{ minWidth: 260 }}
                      disabled={refundSaving || !canRefund}
                    >
                      {REFUND_METHOD_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      inputProps={{ min: 1, step: 1 }}
                      sx={{ minWidth: 180 }}
                      disabled={refundSaving || !canRefund}
                    />
                    <Button
                      variant="contained"
                      onClick={() => void initiateRefund()}
                      disabled={refundSaving || !canRefund}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        bgcolor: accent,
                        minWidth: 170,
                        "&:hover": { bgcolor: "#8f723c" },
                      }}
                    >
                      {refundSaving ? "Issuing…" : "Issue Refund"}
                    </Button>
                  </Stack>
                  {!canRefund ? (
                    <Typography variant="caption" sx={{ mt: 1.25, display: "block", color: "#8a6a2f" }}>
                      Approve the return first to enable refund issuance.
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
                onClick={() => navigate("/admin/returns")}
                sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }}
              >
                Back to returns
              </Button>
            </Stack>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminReturnDetail;

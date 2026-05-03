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
const REFUND_METHOD_OPTIONS = [
  { value: "original_payment", label: "Original payment (Razorpay)" },
  { value: "credit_note", label: "Credit note" },
];

function normalizeReturnPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.return ?? root;
  }
  return root;
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
  return raw == null ? null : String(raw);
}

function formatValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
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

const AdminReturnDetail = () => {
  const { returnNumber } = useParams();
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteDraft, setNoteDraft] = useState("");
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [refundMethod, setRefundMethod] = useState("original_payment");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);

  useEffect(() => {
    if (!returnNumber) {
      setLoading(false);
      setError("Missing return number.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setReturnData(null);
      try {
        const { data } = await client.get(`/admin/returns/${encodeURIComponent(returnNumber)}`);
        if (cancelled) return;
        const body = normalizeReturnPayload(data);
        if (!body || typeof body !== "object") {
          setError("Unexpected response from server.");
          setReturnData(null);
          return;
        }
        setReturnData(body);
      } catch (e) {
        if (cancelled) return;
        setReturnData(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load return details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [returnNumber]);

  const returnEntries = useMemo(() => {
    const entries = Object.entries(returnData || {}).filter(([k]) => k !== "__v");
    const mid = Math.ceil(entries.length / 2);
    return { left: entries.slice(0, mid), right: entries.slice(mid) };
  }, [returnData]);

  const currentStatus = String(returnData?.status ?? "");
  const canRefund = currentStatus === "approved";

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

  const updateStatus = async (status) => {
    if (!returnNumber) return;
    if (status === "rejected" && !rejectionReasonDraft.trim()) {
      setActionError("Rejection reason is required to reject a return.");
      return;
    }

    setSaving(true);
    setActionError("");
    setActionSuccess("");

    try {
      const payload = { status };
      if (noteDraft.trim()) payload.note = noteDraft.trim();
      if (status === "rejected") payload.rejectionReason = rejectionReasonDraft.trim();

      const { data } = await client.patch(`/admin/returns/${encodeURIComponent(returnNumber)}/status`, payload);
      const updated = normalizeReturnPayload(data);
      setReturnData((prev) => ({
        ...(prev || {}),
        ...(updated && typeof updated === "object" ? updated : {}),
        status,
        note: payload.note ?? prev?.note,
        rejectionReason: payload.rejectionReason ?? prev?.rejectionReason,
      }));
      setActionSuccess(`Return ${status} successfully.`);
      if (status === "approved") setRejectionReasonDraft("");
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || `Failed to ${status} return.`);
    } finally {
      setSaving(false);
    }
  };

  const initiateRefund = async () => {
    if (!returnNumber) return;
    const parsedAmount = Number(refundAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setActionError("Please enter a valid refund amount greater than zero.");
      return;
    }

    setRefundSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      const payload = { method: refundMethod, amount: parsedAmount };
      const { data } = await client.post(`/admin/payments/returns/${encodeURIComponent(returnNumber)}/refund`, payload);
      const refundPayload = normalizeRefundPayload(data) || {};
      setReturnData((prev) => ({
        ...(prev || {}),
        ...(refundPayload && typeof refundPayload === "object" ? refundPayload : {}),
        refund: {
          ...(prev?.refund || {}),
          ...(refundPayload?.refund || {}),
          method: payload.method,
          amount: payload.amount,
        },
      }));
      if (refundMethod === "credit_note") {
        const creditNoteCode = refundPayload?.refund?.creditNoteCode ?? refundPayload?.creditNoteCode;
        setActionSuccess(
          creditNoteCode
            ? `Credit note refund issued successfully (${creditNoteCode}).`
            : "Credit note refund issued successfully."
        );
      } else {
        const razorpayRefundId = refundPayload?.refund?.razorpayRefundId ?? refundPayload?.razorpayRefundId;
        setActionSuccess(
          razorpayRefundId
            ? `Refund initiated successfully (Razorpay refund ID: ${razorpayRefundId}).`
            : "Refund initiated successfully."
        );
      }
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || "Failed to initiate refund.");
    } finally {
      setRefundSaving(false);
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

  const resolvedReturnNumber = pickReturnNumber(returnData) || String(returnNumber || "");

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Returns", to: "/admin/returns" },
            { label: resolvedReturnNumber || "Return" },
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
        ) : returnData ? (
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
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="Note"
                  placeholder="Valid size issue - approved for return"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Rejection reason"
                  placeholder="Product shows signs of use - not eligible for return"
                  value={rejectionReasonDraft}
                  onChange={(e) => setRejectionReasonDraft(e.target.value)}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  <Button
                    variant="contained"
                    disabled={saving || currentStatus === "approved"}
                    onClick={() => updateStatus("approved")}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: accent,
                      minWidth: 150,
                      "&:hover": { bgcolor: "#8f723c" },
                    }}
                  >
                    {saving ? "Updating..." : "Approve Return"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={saving || currentStatus === "rejected"}
                    onClick={() => updateStatus("rejected")}
                    sx={{ textTransform: "none", fontWeight: 700, minWidth: 150 }}
                  >
                    {saving ? "Updating..." : "Reject Return"}
                  </Button>
                </Stack>
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
                Issue refund
              </Typography>
              <Typography variant="body2" sx={{ color: "#6f7f77", mt: 0.5 }}>
                Refund can only be initiated when the return is approved.
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mt: 1.25 }}>
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
                  onClick={initiateRefund}
                  disabled={refundSaving || !canRefund}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: accent,
                    minWidth: 170,
                    "&:hover": { bgcolor: "#8f723c" },
                  }}
                >
                  {refundSaving ? "Issuing..." : "Issue Refund"}
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
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", mb: 0.5 }}>
                Return {resolvedReturnNumber || "—"}
              </Typography>
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "capitalize" }}>
                Current status: {currentStatus || "—"}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={1.25}>
                    {returnEntries.left.map(([k, v]) => (
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
                <Grid item xs={12} md={6}>
                  <Stack spacing={1.25}>
                    {returnEntries.right.map(([k, v]) => (
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
            </Paper>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminReturnDetail;

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { colors } from "../../theme/theme";
import {
  cancelCustomerOrder,
  fetchCustomerOrder,
  normalizeCustomerOrderPayload,
  pickCustomerOrderNumber,
} from "../services/publicOrdersService";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

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

const NON_CANCEL = new Set(["cancelled", "delivered", "returned"]);

export default function OrderDetail() {
  const { orderNumber: orderNumberParam } = useParams();
  const navigate = useNavigate();
  const orderNumber = orderNumberParam ? decodeURIComponent(orderNumberParam) : "";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Changed my mind");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState("");

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
      setError(err?.response?.data?.message || err?.message || "Could not load order.");
    } finally {
      setLoading(false);
    }
  }, [navigate, orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayNumber = useMemo(() => (order ? pickCustomerOrderNumber(order) : orderNumber), [order, orderNumber]);
  const status = String(order?.status ?? order?.orderStatus ?? "—");
  const canCancel = order && !NON_CANCEL.has(String(order?.status ?? "").toLowerCase());

  const grand = Number(order?.grandTotal ?? order?.total ?? order?.totalAmount ?? 0);

  const handleCancel = async () => {
    if (!orderNumber) return;
    setCancelBusy(true);
    setCancelErr("");
    try {
      await cancelCustomerOrder(orderNumber, { reason: cancelReason.trim() || "Cancelled by customer" });
      setCancelOpen(false);
      await load();
    } catch (err) {
      setCancelErr(err?.response?.data?.message || err?.message || "Could not cancel order.");
    } finally {
      setCancelBusy(false);
    }
  };

  const lines = order ? pickLines(order) : [];

  return (
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Button component={RouterLink} to="/orders" size="small" sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}>
            ← All orders
          </Button>

          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Order {displayNumber || "—"}
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton height={32} />
              <Skeleton variant="rounded" height={120} sx={{ mt: 1 }} />
            </Paper>
          ) : null}

          {!loading && order ? (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                      Status
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>{status}</Typography>
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 1 }}>
                      Payment
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{String(order?.paymentMethod ?? order?.payment?.method ?? "—")}</Typography>
                  </Stack>
                  <Stack spacing={0.5} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                      Placed
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{formatWhen(order?.createdAt ?? order?.placedAt)}</Typography>
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 1 }}>
                      Total
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {Number.isFinite(grand) ? INR.format(grand) : "—"}
                    </Typography>
                  </Stack>
                </Stack>

                {pickAddressBlock(order) ? (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                      Delivery address
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {pickAddressBlock(order)}
                    </Typography>
                  </>
                ) : null}

                {lines.length > 0 ? (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                      Items
                    </Typography>
                    <Stack spacing={1.25}>
                      {lines.map((line, idx) => (
                        <Stack key={line?.id ?? line?._id ?? idx} direction="row" justifyContent="space-between" gap={1}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {lineLabel(line)} × {lineQty(line)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {INR.format(lineUnit(line) * lineQty(line))}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                ) : null}

                {canCancel ? (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Button color="error" variant="outlined" onClick={() => setCancelOpen(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                      Cancel order
                    </Button>
                  </>
                ) : null}
              </Paper>
            </Stack>
          ) : null}
        </Stack>
      </Container>

      <Dialog open={cancelOpen} onClose={() => (cancelBusy ? null : setCancelOpen(false))} fullWidth maxWidth="sm">
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
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelBusy} sx={{ textTransform: "none" }}>
            Keep order
          </Button>
          <Button color="error" variant="contained" disabled={cancelBusy} onClick={() => void handleCancel()} sx={{ textTransform: "none", fontWeight: 700 }}>
            {cancelBusy ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { colors, fonts } from "../../theme/theme";
import {
  cancelCustomerOrder,
  fetchCustomerOrder,
  normalizeCustomerOrderPayload,
  pickCustomerOrderNumber,
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
  const n = Number(
    line?.unitPrice ?? line?.price ?? line?.effectivePrice ?? 0
  );
  return Number.isFinite(n) ? n : 0;
}

function pickAddressBlock(order) {
  const ship = order?.shippingAddress ?? order?.address ?? order?.deliveryAddress;
  if (!ship || typeof ship !== "object") return null;
  return ship;
}

const NON_CANCEL = new Set(["cancelled", "delivered", "returned"]);

function StatusBadge({ status }) {
  const s = String(status).toLowerCase();
  const tone = s.includes("delivered")
    ? colors.success
    : s.includes("cancel") || s.includes("returned")
    ? colors.danger
    : colors.ink;
  return (
    <Box
      sx={{
        display: "inline-block",
        border: `1px solid ${tone}`,
        color: tone,
        px: 1.5,
        py: 0.65,
        fontFamily: fonts.body,
        fontSize: 10.5,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      {status}
    </Box>
  );
}

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
        navigate("/login", {
          state: {
            from: { pathname: `/orders/${encodeURIComponent(orderNumber)}` },
          },
        });
        return;
      }
      setOrder(null);
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not load order."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayNumber = useMemo(
    () => (order ? pickCustomerOrderNumber(order) : orderNumber),
    [order, orderNumber]
  );
  const status = String(order?.status ?? order?.orderStatus ?? "—");
  const canCancel =
    order && !NON_CANCEL.has(String(order?.status ?? "").toLowerCase());

  const grand = Number(
    order?.pricing?.total ??
      order?.grandTotal ??
      order?.total ??
      order?.totalAmount ??
      0
  );

  const handleCancel = async () => {
    if (!orderNumber) return;
    setCancelBusy(true);
    setCancelErr("");
    try {
      await cancelCustomerOrder(orderNumber, {
        reason: cancelReason.trim() || "Cancelled by customer",
      });
      setCancelOpen(false);
      await load();
    } catch (err) {
      setCancelErr(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not cancel order."
      );
    } finally {
      setCancelBusy(false);
    }
  };

  const lines = order ? pickLines(order) : [];
  const ship = order ? pickAddressBlock(order) : null;

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1100, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Box
          component={RouterLink}
          to="/orders"
          sx={{
            display: "inline-block",
            mb: 3,
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
          ← All orders
        </Box>

        <Stack spacing={1} sx={{ mb: { xs: 4, sm: 5 } }}>
          <Typography sx={eyebrowSx}>Order</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 30, sm: 42 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            {displayNumber || "—"}
          </Typography>
        </Stack>

        {error ? (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 0, border: `1px solid ${colors.danger}` }}
          >
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={140} sx={{ bgcolor: colors.stone }} />
            <Skeleton variant="rectangular" height={180} sx={{ bgcolor: colors.stone }} />
          </Stack>
        ) : null}

        {!loading && order ? (
          <Grid container spacing={{ xs: 3, md: 4 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                {/* Status / placed / total band */}
                <Box
                  sx={{
                    bgcolor: colors.paper,
                    border: `1px solid ${colors.line}`,
                    p: { xs: 3, sm: 4 },
                  }}
                >
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography sx={eyebrowSx}>Status</Typography>
                      <Box sx={{ mt: 1 }}>
                        <StatusBadge status={status} />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography sx={eyebrowSx}>Placed</Typography>
                      <Typography
                        sx={{
                          fontFamily: fonts.body,
                          fontSize: 13.5,
                          color: colors.ink,
                          mt: 1,
                        }}
                      >
                        {formatWhen(order?.createdAt ?? order?.placedAt)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography sx={eyebrowSx}>Payment</Typography>
                      <Typography
                        sx={{
                          fontFamily: fonts.body,
                          fontSize: 13.5,
                          color: colors.ink,
                          mt: 1,
                          textTransform: "capitalize",
                        }}
                      >
                        {String(
                          order?.paymentMethod ?? order?.payment?.method ?? "—"
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Items */}
                {lines.length > 0 ? (
                  <Box
                    sx={{
                      bgcolor: colors.paper,
                      border: `1px solid ${colors.line}`,
                      p: { xs: 3, sm: 4 },
                    }}
                  >
                    <Typography
                      sx={{
                        ...eyebrowSx,
                        color: colors.ink,
                        mb: 3,
                      }}
                    >
                      Items
                    </Typography>
                    <Stack
                      spacing={2}
                      divider={
                        <Box
                          sx={{ height: 1, bgcolor: colors.line }}
                          component="div"
                        />
                      }
                    >
                      {lines.map((line, idx) => (
                        <Stack
                          key={line?.id ?? line?._id ?? idx}
                          direction="row"
                          justifyContent="space-between"
                          spacing={2}
                        >
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 14,
                              color: colors.ink,
                              fontWeight: 500,
                            }}
                          >
                            {lineLabel(line)}{" "}
                            <Box
                              component="span"
                              sx={{ color: colors.muted, fontWeight: 400 }}
                            >
                              × {lineQty(line)}
                            </Box>
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 14,
                              color: colors.ink,
                              fontWeight: 500,
                            }}
                          >
                            {INR.format(lineUnit(line) * lineQty(line))}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                ) : null}

                {/* Address */}
                {ship ? (
                  <Box
                    sx={{
                      bgcolor: colors.paper,
                      border: `1px solid ${colors.line}`,
                      p: { xs: 3, sm: 4 },
                    }}
                  >
                    <Typography
                      sx={{
                        ...eyebrowSx,
                        color: colors.ink,
                        mb: 2,
                      }}
                    >
                      Delivery address
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 13.5,
                        color: colors.ink,
                        lineHeight: 1.7,
                      }}
                    >
                      {[ship.name, ship.mobile].filter(Boolean).join(" · ")}
                      <br />
                      {[ship.line1, ship.line2].filter(Boolean).join(", ")}
                      <br />
                      {[ship.city, ship.state, ship.pincode ?? ship.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                      {ship.country ? (
                        <>
                          <br />
                          {ship.country}
                        </>
                      ) : null}
                    </Typography>
                  </Box>
                ) : null}

                {canCancel ? (
                  <Button
                    variant="outlined"
                    onClick={() => setCancelOpen(true)}
                    sx={{
                      alignSelf: "flex-start",
                      color: colors.danger,
                      borderColor: colors.danger,
                      "&:hover": {
                        borderColor: colors.danger,
                        color: colors.danger,
                        backgroundColor: "transparent",
                      },
                    }}
                  >
                    Cancel order
                  </Button>
                ) : null}
              </Stack>
            </Grid>

            {/* Total card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  position: { md: "sticky" },
                  top: { md: 120 },
                  bgcolor: colors.paper,
                  border: `1px solid ${colors.line}`,
                  p: { xs: 3, sm: 4 },
                }}
              >
                <Typography sx={{ ...eyebrowSx, color: colors.ink, mb: 3 }}>
                  Total
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: 32,
                    fontWeight: 500,
                    color: colors.ink,
                    lineHeight: 1.05,
                  }}
                >
                  {Number.isFinite(grand) ? INR.format(grand) : "—"}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: colors.muted,
                    mt: 1,
                  }}
                >
                  Includes shipping &amp; taxes if applicable.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        ) : null}
      </Container>

      <Dialog
        open={cancelOpen}
        onClose={() => (cancelBusy ? null : setCancelOpen(false))}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <DialogTitle
          sx={{
            fontFamily: fonts.display,
            fontSize: 26,
            fontWeight: 500,
            color: colors.ink,
            borderBottom: `1px solid ${colors.line}`,
          }}
        >
          Cancel order
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {cancelErr ? (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 0, border: `1px solid ${colors.danger}` }}
            >
              {cancelErr}
            </Alert>
          ) : null}
          <Typography sx={{ ...eyebrowSx, mb: 1.5 }}>Reason</Typography>
          <TextField
            autoFocus
            fullWidth
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            disabled={cancelBusy}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.line}` }}>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelBusy}>
            Keep order
          </Button>
          <Button
            variant="contained"
            disabled={cancelBusy}
            onClick={() => void handleCancel()}
            sx={{
              bgcolor: colors.danger,
              "&:hover": { bgcolor: colors.danger, filter: "brightness(0.92)" },
            }}
          >
            {cancelBusy ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

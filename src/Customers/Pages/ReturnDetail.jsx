import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { colors, primaryAlpha } from "../../theme/theme";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  fetchCustomerReturn,
  normalizeCustomerReturnPayload,
  pickCustomerReturnNumber,
} from "../services/publicReturnsService";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

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

function pickReturnLines(returnData) {
  const raw = returnData?.items ?? returnData?.lineItems ?? returnData?.lines ?? [];
  return Array.isArray(raw) ? raw : [];
}

function lineLabel(line) {
  return line?.productName ?? line?.name ?? line?.title ?? "Item";
}

function lineQty(line) {
  const q = Number(line?.quantity ?? line?.qty ?? 1);
  return Number.isFinite(q) ? q : 1;
}

function pickOrderNumber(returnData) {
  const raw =
    returnData?.orderNumber ??
    returnData?.order?.orderNumber ??
    returnData?.orderId ??
    returnData?.order?.orderId ??
    null;
  return raw != null && String(raw).trim() !== "" ? String(raw) : "";
}

export default function ReturnDetail() {
  const { returnNumber: returnNumberParam } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const returnNumber = returnNumberParam ? decodeURIComponent(returnNumberParam) : "";

  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!returnNumber) {
      setError("Missing return number.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchCustomerReturn(returnNumber);
      const body = normalizeCustomerReturnPayload(data);
      if (!body || typeof body !== "object") {
        setError("Unexpected response from server.");
        setReturnData(null);
        return;
      }
      setReturnData(body);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login", { state: { from: { pathname: `/returns/${encodeURIComponent(returnNumber)}` } } });
        return;
      }
      setReturnData(null);
      setError(getApiErrorMessage(err, "Could not load return."));
    } finally {
      setLoading(false);
    }
  }, [navigate, returnNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayNumber = useMemo(
    () => (returnData ? pickCustomerReturnNumber(returnData) : returnNumber),
    [returnData, returnNumber],
  );
  const status = String(returnData?.status ?? "—");
  const statusLower = status.toLowerCase();
  const lines = returnData ? pickReturnLines(returnData) : [];
  const orderNum = returnData ? pickOrderNumber(returnData) : "";

  const statusChip = (
    <Chip
      label={formatLabel(status)}
      size="small"
      color={statusLower === "approved" ? "success" : statusLower === "rejected" ? "error" : "default"}
      sx={{
        fontWeight: 800,
        flexShrink: 0,
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
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              component={RouterLink}
              to="/returns"
              size="small"
              sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, minWidth: 0, px: { xs: 0.5, sm: 1 } }}
            >
              ← All returns
            </Button>
            {orderNum ? (
              <Button
                component={RouterLink}
                to={`/orders/${encodeURIComponent(orderNum)}`}
                size="small"
                sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, minWidth: 0, px: { xs: 0.5, sm: 1 } }}
              >
                View order
              </Button>
            ) : null}
          </Stack>

          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="span"
                sx={{
                  color: alpha(colors.text, 0.5),
                  fontWeight: 800,
                  fontSize: { xs: "0.62rem", sm: "0.7rem" },
                  letterSpacing: 0.4,
                  display: "block",
                }}
              >
                Return
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
            {returnData && !loading ? statusChip : null}
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
            </Stack>
          ) : null}

          {!loading && returnData ? (
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2, md: 3 },
                  borderRadius: { xs: 2, sm: 2.5 },
                  borderColor: alpha(colors.text, 0.1),
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Stack spacing={0.75}>
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                      Order
                    </Typography>
                    {orderNum ? (
                      <Typography
                        component={RouterLink}
                        to={`/orders/${encodeURIComponent(orderNum)}`}
                        sx={{ fontWeight: 800, color: colors.primary, textDecoration: "none", wordBreak: "break-all" }}
                      >
                        {orderNum}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontWeight: 700 }}>—</Typography>
                    )}
                  </Stack>
                  <Stack spacing={0.75} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7) }}>
                      Requested
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {formatWhen(returnData?.createdAt ?? returnData?.requestedAt)}
                    </Typography>
                    {returnData?.updatedAt ? (
                      <>
                        <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 1 }}>
                          Updated
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>{formatWhen(returnData.updatedAt)}</Typography>
                      </>
                    ) : null}
                  </Stack>
                </Stack>

                {returnData?.reason || returnData?.refundMethod ? (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      {returnData?.reason ? (
                        <Box>
                          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.55), fontWeight: 800 }}>
                            Reason
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                            {formatLabel(returnData.reason)}
                          </Typography>
                        </Box>
                      ) : null}
                      {returnData?.refundMethod ? (
                        <Box>
                          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.55), fontWeight: 800 }}>
                            Refund method
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                            {formatLabel(returnData.refundMethod)}
                          </Typography>
                        </Box>
                      ) : null}
                    </Stack>
                  </>
                ) : null}

                {returnData?.description || returnData?.customerNote || returnData?.rejectionReason ? (
                  <>
                    <Divider sx={{ my: 2 }} />
                    {returnData?.description || returnData?.customerNote ? (
                      <Box sx={{ mb: returnData?.rejectionReason ? 1.5 : 0 }}>
                        <Typography variant="caption" sx={{ color: alpha(colors.text, 0.55), fontWeight: 800 }}>
                          Description
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                          {returnData.description ?? returnData.customerNote}
                        </Typography>
                      </Box>
                    ) : null}
                    {returnData?.rejectionReason ? (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {returnData.rejectionReason}
                      </Alert>
                    ) : null}
                  </>
                ) : null}
              </Paper>

              {lines.length > 0 ? (
                <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 2, borderColor: alpha(colors.text, 0.1) }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                    Items ({lines.length})
                  </Typography>
                  {isMobile ? (
                    <Stack spacing={1.25}>
                      {lines.map((line, idx) => (
                        <Box
                          key={line?.variantId ?? line?.id ?? idx}
                          sx={{
                            p: 1.25,
                            borderRadius: 1.5,
                            border: `1px solid ${alpha(colors.text, 0.1)}`,
                            bgcolor: alpha(colors.text, 0.02),
                          }}
                        >
                          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{lineLabel(line)}</Typography>
                          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.6), display: "block", mt: 0.35 }}>
                            Qty: {lineQty(line)} · Reason: {formatLabel(line?.reason)}
                          </Typography>
                          {line?.refundAmount != null ? (
                            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: colors.primary }}>
                              {formatMoney(line.refundAmount)}
                            </Typography>
                          ) : null}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <TableContainer sx={{ border: `1px solid ${alpha(colors.text, 0.12)}`, borderRadius: 1.5 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: primaryAlpha(0.06) }}>
                            <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              Qty
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Reason</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              Refund
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {lines.map((line, idx) => (
                            <TableRow key={line?.variantId ?? line?.id ?? idx}>
                              <TableCell sx={{ fontWeight: 700 }}>{lineLabel(line)}</TableCell>
                              <TableCell align="right">{lineQty(line)}</TableCell>
                              <TableCell>{formatLabel(line?.reason)}</TableCell>
                              <TableCell align="right">
                                {line?.refundAmount != null ? formatMoney(line.refundAmount) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

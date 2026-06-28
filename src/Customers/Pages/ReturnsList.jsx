import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Link,
  Paper,
  Skeleton,
  Stack,
  TablePagination,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { colors, primaryAlpha } from "../../theme/theme";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  fetchCustomerReturns,
  normalizeCustomerReturnsListPayload,
  pickCustomerReturnNumber,
} from "../services/publicReturnsService";

const GRID_COLUMNS = {
  xs: "repeat(2, minmax(0, 1fr))",
  sm: "repeat(2, minmax(0, 1fr))",
  md: "repeat(3, minmax(0, 1fr))",
  lg: "repeat(3, minmax(0, 1fr))",
};

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function formatLabel(value) {
  if (value == null || value === "") return "—";
  const s = String(value).replace(/_/g, " ");
  return s.length <= 3 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function pickStatus(returnItem) {
  return String(returnItem?.status ?? "—");
}

function pickOrderRef(returnItem) {
  const raw =
    returnItem?.orderNumber ??
    returnItem?.order?.orderNumber ??
    returnItem?.orderId ??
    returnItem?.order?.orderId ??
    returnItem?.order?._id ??
    null;
  return raw != null && String(raw).trim() !== "" ? String(raw) : "—";
}

function rowKey(returnItem) {
  const num = pickCustomerReturnNumber(returnItem);
  if (num) return num;
  return JSON.stringify(returnItem);
}

function ReturnCard({ returnItem }) {
  const returnNum = pickCustomerReturnNumber(returnItem);
  const to = returnNum ? `/returns/${encodeURIComponent(returnNum)}` : "";
  const status = pickStatus(returnItem);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: { xs: 1.5, sm: 2 },
        height: "100%",
        borderColor: alpha(colors.text, 0.1),
        bgcolor: colors.background,
        overflow: "hidden",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
        ...(returnNum
          ? {
              "&:hover": {
                borderColor: alpha(colors.primary, 0.5),
                boxShadow: `0 10px 28px ${alpha(colors.text, 0.1)}`,
                transform: { xs: "none", sm: "translateY(-2px)" },
              },
            }
          : { opacity: 0.85 }),
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.25, sm: 2 },
          "&:last-child": { pb: { xs: 1.25, sm: 2 } },
          height: "100%",
        }}
      >
        <Stack spacing={{ xs: 1.1, sm: 1.5 }} sx={{ height: "100%" }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={0.75}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: alpha(colors.text, 0.5),
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  fontSize: { xs: "0.62rem", sm: "0.7rem" },
                  display: "block",
                }}
              >
                Return ID
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "0.72rem", sm: "0.95rem" },
                  lineHeight: 1.3,
                  wordBreak: "break-all",
                }}
              >
                {returnNum || "—"}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={formatLabel(status)}
              sx={{
                fontWeight: 800,
                flexShrink: 0,
                maxWidth: "46%",
                height: { xs: 22, sm: 24 },
                fontSize: { xs: "0.62rem", sm: "0.75rem" },
                bgcolor: primaryAlpha(0.12),
                color: colors.text,
                border: `1px solid ${primaryAlpha(0.28)}`,
                "& .MuiChip-label": { px: { xs: 0.75, sm: 1 } },
              }}
            />
          </Stack>

          <Stack spacing={{ xs: 0.85, sm: 1.1 }} sx={{ flex: 1 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: alpha(colors.text, 0.5), fontWeight: 800, fontSize: { xs: "0.62rem", sm: "0.7rem" } }}
              >
                Order
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.35,
                  fontSize: { xs: "0.68rem", sm: "0.875rem" },
                  wordBreak: "break-all",
                }}
              >
                {pickOrderRef(returnItem)}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: alpha(colors.text, 0.5), fontWeight: 800, fontSize: { xs: "0.62rem", sm: "0.7rem" } }}
              >
                Requested
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.35,
                  fontSize: { xs: "0.68rem", sm: "0.875rem" },
                }}
                noWrap
              >
                {formatWhen(returnItem?.createdAt ?? returnItem?.requestedAt)}
              </Typography>
            </Box>
          </Stack>

          {returnNum ? (
            <Link
              component={RouterLink}
              to={to}
              underline="hover"
              sx={{
                mt: "auto",
                alignSelf: "flex-start",
                fontWeight: 800,
                fontSize: { xs: "0.7rem", sm: "0.8125rem" },
                color: colors.primary,
                cursor: "pointer",
                textDecoration: "none",
                "&:hover": { color: colors.primary, textDecoration: "underline" },
              }}
            >
              View return →
            </Link>
          ) : (
            <Typography variant="caption" sx={{ color: alpha(colors.text, 0.5), fontSize: "0.62rem", mt: "auto" }}>
              Details unavailable
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReturnsGridSkeleton() {
  return (
    <Box sx={{ display: "grid", gap: { xs: 1.25, sm: 2 }, gridTemplateColumns: GRID_COLUMNS }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" sx={{ borderRadius: 2, height: { xs: 148, sm: 168 } }} />
      ))}
    </Box>
  );
}

export default function ReturnsList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchCustomerReturns({ page: page + 1, limit: rowsPerPage });
      const { items, total: t } = normalizeCustomerReturnsListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login", { state: { from: { pathname: "/returns" } } });
        return;
      }
      setError(getApiErrorMessage(err, "Could not load returns."));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [navigate, page, rowsPerPage]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2, md: 2.5 }}>
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
            ← My orders
          </Button>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2.5,
              border: `1px solid ${alpha(colors.text, 0.08)}`,
              background: `linear-gradient(135deg, ${primaryAlpha(0.14)} 0%, ${colors.background} 55%, ${alpha(colors.text, 0.02)} 100%)`,
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
                My returns
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.65) }}>
                {!loading && !error && total > 0
                  ? `${total} return${total === 1 ? "" : "s"}`
                  : "Track return requests for delivered orders"}
              </Typography>
            </Stack>
          </Paper>

          {error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void load()} sx={{ fontWeight: 700 }}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}

          {loading ? <ReturnsGridSkeleton /> : null}

          {!loading && !error && rows.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: { xs: "center", sm: "left" } }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                No returns yet
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 0.5 }}>
                Request a return from a delivered order within the return window.
              </Typography>
              <Button
                component={RouterLink}
                to="/orders"
                variant="contained"
                sx={{ mt: 2, textTransform: "none", fontWeight: 800 }}
              >
                View orders
              </Button>
            </Paper>
          ) : null}

          {!loading && rows.length > 0 ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 1.25, sm: 2 },
                  gridTemplateColumns: GRID_COLUMNS,
                  alignItems: "stretch",
                }}
              >
                {rows.map((returnItem) => (
                  <ReturnCard key={rowKey(returnItem)} returnItem={returnItem} />
                ))}
              </Box>

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, next) => setPage(next)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number.parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[6, 10, 18]}
                labelRowsPerPage="Per page"
                sx={{
                  borderTop: `1px solid ${alpha(colors.text, 0.08)}`,
                  pt: 1,
                  px: 0,
                }}
              />
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

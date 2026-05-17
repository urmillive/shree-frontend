import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Skeleton,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { colors, primaryAlpha } from "../../theme/theme";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  fetchCustomerOrders,
  normalizeCustomerOrdersListPayload,
  pickCustomerOrderNumber,
} from "../services/publicOrdersService";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const GRID_COLUMNS = {
  xs: "repeat(2, minmax(0, 1fr))",
  sm: "repeat(2, minmax(0, 1fr))",
  md: "repeat(3, minmax(0, 1fr))",
  lg: "repeat(3, minmax(0, 1fr))",
};

const FILTER_FETCH_LIMIT = 100;

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

function pickTotal(order) {
  const n = Number(order?.pricing?.total ?? order?.grandTotal ?? order?.total ?? order?.totalAmount ?? order?.amountPayable ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickStatus(order) {
  return String(order?.status ?? order?.orderStatus ?? "—");
}

function pickPaymentMethod(order) {
  return order?.paymentMethod != null && order?.paymentMethod !== "" ? String(order.paymentMethod) : "—";
}

function pickOrderIdDisplay(order) {
  const num = pickCustomerOrderNumber(order);
  if (num) return num;
  const id = order?.id ?? order?._id;
  return id != null ? String(id) : "—";
}

function rowKey(order) {
  const num = pickCustomerOrderNumber(order);
  if (num) return num;
  const id = order?.id ?? order?._id;
  return id != null ? String(id) : JSON.stringify(order);
}

function normalizeAmountQuery(query) {
  return query.trim().replace(/[₹,\s]/g, "").toLowerCase();
}

function orderMatchesSearch(order, queryRaw) {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return true;

  const amtQ = normalizeAmountQuery(queryRaw);
  const idHay = pickOrderIdDisplay(order).toLowerCase();
  const payHay = `${pickPaymentMethod(order)} ${formatLabel(pickPaymentMethod(order))}`.toLowerCase();
  const total = pickTotal(order);
  const amountHaystack = [
    String(total),
    String(total.toFixed(2)),
    INR.format(total).toLowerCase().replace(/[₹,\s]/g, ""),
  ];

  if (idHay.includes(q)) return true;
  if (payHay.includes(q)) return true;
  if (amountHaystack.some((v) => v.includes(amtQ))) return true;

  return false;
}

function OrderCard({ order }) {
  const orderNum = pickCustomerOrderNumber(order);
  const to = orderNum ? `/orders/${encodeURIComponent(orderNum)}` : "";
  const status = pickStatus(order);
  const pay = pickPaymentMethod(order);
  const orderIdLabel = pickOrderIdDisplay(order);

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
        ...(orderNum
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
                  Order ID
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "0.72rem", sm: "0.95rem" },
                    lineHeight: 1.3,
                    wordBreak: "break-all",
                  }}
                >
                  {orderIdLabel}
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
                  Date
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
                  {formatWhen(order?.createdAt ?? order?.placedAt ?? order?.date)}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: alpha(colors.text, 0.5), fontWeight: 800, fontSize: { xs: "0.62rem", sm: "0.7rem" } }}
                >
                  Total
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.8rem", sm: "0.95rem" }, color: colors.primary }}>
                  {INR.format(pickTotal(order))}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: alpha(colors.text, 0.5), fontWeight: 800, fontSize: { xs: "0.62rem", sm: "0.7rem" } }}
                >
                  Payment
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontSize: { xs: "0.68rem", sm: "0.875rem" }, lineHeight: 1.35 }}
                  noWrap
                  title={formatLabel(pay)}
                >
                  {formatLabel(pay)}
                </Typography>
              </Box>
            </Stack>

            {orderNum ? (
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
                  "&:focus-visible": {
                    outline: `2px solid ${primaryAlpha(0.5)}`,
                    outlineOffset: 2,
                    borderRadius: 0.5,
                  },
                }}
              >
                View order →
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

function OrdersGridSkeleton() {
  return (
    <Box sx={{ display: "grid", gap: { xs: 1.25, sm: 2 }, gridTemplateColumns: GRID_COLUMNS }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" sx={{ borderRadius: 2, height: { xs: 168, sm: 188 } }} />
      ))}
    </Box>
  );
}

export default function OrdersList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const hasActiveSearch = Boolean(appliedSearch.trim());

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = hasActiveSearch
        ? {
            page: 1,
            limit: FILTER_FETCH_LIMIT,
            search: appliedSearch.trim(),
          }
        : { page: page + 1, limit: rowsPerPage };

      const { data } = await fetchCustomerOrders(params);
      const { items, total: t } = normalizeCustomerOrdersListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login", { state: { from: { pathname: "/orders" } } });
        return;
      }
      setError(getApiErrorMessage(err, "Could not load orders."));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [navigate, page, rowsPerPage, hasActiveSearch, appliedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((order) => orderMatchesSearch(order, appliedSearch)),
    [rows, appliedSearch],
  );

  const displayRows = useMemo(() => {
    if (!hasActiveSearch) return filteredRows;
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, hasActiveSearch, page, rowsPerPage]);

  const paginationCount = hasActiveSearch ? filteredRows.length : total;

  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setPage(0);
  };

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <Button
            component={RouterLink}
            to="/returns"
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
            My returns →
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
                My orders
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.65) }}>
                {!loading && !error && paginationCount > 0
                  ? `${paginationCount} order${paginationCount === 1 ? "" : "s"}`
                  : "Track and manage your purchases"}
                {hasActiveSearch ? " · filtered" : ""}
              </Typography>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              borderColor: alpha(colors.text, 0.1),
            }}
          >
            <Stack spacing={1.5}>
              <TextField
                size="small"
                label="Search orders"
                placeholder="Order ID, payment method, or amount"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiSearch size={16} color={alpha(colors.text, 0.45)} />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput ? (
                    <InputAdornment position="end">
                      <IconButton size="small" aria-label="Clear search" onClick={clearSearch}>
                        <FiX size={14} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: colors.background } }}
              />
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

          {loading ? <OrdersGridSkeleton /> : null}

          {!loading && !error && rows.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: { xs: "center", sm: "left" } }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                No orders yet
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 0.5 }}>
                When you shop with us, your orders will show up here.
              </Typography>
              <Button
                component={RouterLink}
                to="/products"
                variant="contained"
                sx={{ mt: 2, textTransform: "none", fontWeight: 800 }}
              >
                Browse products
              </Button>
            </Paper>
          ) : null}

          {!loading && !error && rows.length > 0 && filteredRows.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                No matching orders
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 0.5 }}>
                Try a different order ID, payment method, or amount.
              </Typography>
              <Button onClick={clearSearch} sx={{ mt: 2, textTransform: "none", fontWeight: 800 }}>
                Clear search
              </Button>
            </Paper>
          ) : null}

          {!loading && displayRows.length > 0 ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 1.25, sm: 2 },
                  gridTemplateColumns: GRID_COLUMNS,
                  alignItems: "stretch",
                }}
              >
                {displayRows.map((order) => (
                  <OrderCard key={rowKey(order)} order={order} />
                ))}
              </Box>

              <TablePagination
                component="div"
                count={paginationCount}
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
                  ".MuiTablePagination-toolbar": { px: 0, flexWrap: "wrap", gap: 1 },
                  ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  },
                }}
              />
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

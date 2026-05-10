import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { colors } from "../../theme/theme";
import {
  fetchCustomerOrders,
  normalizeCustomerOrdersListPayload,
  pickCustomerOrderNumber,
} from "../services/publicOrdersService";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function pickTotal(order) {
  const n = Number(order?.grandTotal ?? order?.total ?? order?.totalAmount ?? order?.amountPayable ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickStatus(order) {
  return String(order?.status ?? order?.orderStatus ?? "—");
}

export default function OrdersList() {
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
      const { data } = await fetchCustomerOrders({ page: page + 1, limit: rowsPerPage });
      const { items, total: t } = normalizeCustomerOrdersListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login", { state: { from: { pathname: "/orders" } } });
        return;
      }
      setError(err?.response?.data?.message || err?.message || "Could not load orders.");
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
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            My orders
          </Typography>

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

          {loading ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton height={36} />
              <Skeleton variant="rounded" height={160} sx={{ mt: 1 }} />
            </Paper>
          ) : null}

          {!loading && !error && rows.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                No orders yet
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.7), mt: 0.5 }}>
                When you shop with us, your orders will show up here.
              </Typography>
              <Button component={RouterLink} to="/products" variant="contained" sx={{ mt: 2, textTransform: "none", fontWeight: 700 }}>
                Browse products
              </Button>
            </Paper>
          ) : null}

          {!loading && rows.length > 0 ? (
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Total
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {" "}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const num = pickCustomerOrderNumber(row);
                      return (
                        <TableRow key={num || JSON.stringify(row)} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{num || "—"}</TableCell>
                          <TableCell>{formatWhen(row?.createdAt ?? row?.placedAt ?? row?.date)}</TableCell>
                          <TableCell>{pickStatus(row)}</TableCell>
                          <TableCell align="right">{INR.format(pickTotal(row))}</TableCell>
                          <TableCell align="right">
                            {num ? (
                              <Button
                                component={RouterLink}
                                to={`/orders/${encodeURIComponent(num)}`}
                                size="small"
                                sx={{ textTransform: "none", fontWeight: 700 }}
                              >
                                View
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
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
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Paper>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

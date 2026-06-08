import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Skeleton,
  Stack,
  TablePagination,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { colors, fonts } from "../../theme/theme";
import {
  fetchCustomerOrders,
  normalizeCustomerOrdersListPayload,
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

const accountLinks = [
  { label: "Profile", to: "/profile" },
  { label: "Orders", to: "/orders" },
  { label: "Addresses", to: "/profile/addresses" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "Change password", to: "/profile/change-password" },
];

function AccountSidebar({ active }) {
  return (
    <Stack
      spacing={0}
      sx={{
        borderTop: `1px solid ${colors.line}`,
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      {accountLinks.map((link) => {
        const isActive = active === link.to;
        return (
          <Box
            key={link.to}
            component={RouterLink}
            to={link.to}
            sx={{
              py: 1.5,
              borderLeft: `2px solid ${isActive ? colors.ink : "transparent"}`,
              pl: 1.5,
              fontFamily: fonts.body,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: isActive ? colors.ink : colors.muted,
              textDecoration: "none",
              borderBottom: `1px solid ${colors.line}`,
              "&:hover": { color: colors.ink },
              "&:last-of-type": { borderBottom: "none" },
            }}
          >
            {link.label}
          </Box>
        );
      })}
    </Stack>
  );
}

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function pickTotal(order) {
  const n = Number(
    order?.pricing?.total ??
      order?.grandTotal ??
      order?.total ??
      order?.totalAmount ??
      order?.amountPayable ??
      0
  );
  return Number.isFinite(n) ? n : 0;
}

function pickStatus(order) {
  return String(order?.status ?? order?.orderStatus ?? "—");
}

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
        px: 1.25,
        py: 0.5,
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
      const { data } = await fetchCustomerOrders({
        page: page + 1,
        limit: rowsPerPage,
      });
      const { items, total: t } = normalizeCustomerOrdersListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login", { state: { from: { pathname: "/orders" } } });
        return;
      }
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not load orders."
      );
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
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Stack spacing={1} sx={{ mb: { xs: 4, sm: 6 } }}>
          <Typography sx={eyebrowSx}>Account</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 34, sm: 48 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            Orders
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 4, md: 6 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <AccountSidebar active="/orders" />
          </Grid>

          <Grid size={{ xs: 12, md: 9 }}>
            {error ? (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 0,
                  border: `1px solid ${colors.danger}`,
                }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void load()}
                  >
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            ) : null}

            {loading ? (
              <Stack spacing={1.5}>
                {[1, 2, 3].map((k) => (
                  <Skeleton
                    key={k}
                    variant="rectangular"
                    height={68}
                    sx={{ bgcolor: colors.stone }}
                  />
                ))}
              </Stack>
            ) : rows.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography sx={eyebrowSx}>No orders</Typography>
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: { xs: 26, sm: 36 },
                    fontWeight: 500,
                    color: colors.ink,
                    mt: 1.5,
                    mb: 1,
                  }}
                >
                  Nothing here yet.
                </Typography>
                <Typography
                  sx={{
                    color: colors.muted,
                    fontSize: 14,
                    mb: 3,
                  }}
                >
                  When you shop with us, your orders will show up here.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/products"
                  variant="contained"
                >
                  Start shopping
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  borderTop: `1px solid ${colors.line}`,
                  borderBottom: `1px solid ${colors.line}`,
                }}
              >
                {rows.map((row, idx) => {
                  const num = pickCustomerOrderNumber(row);
                  return (
                    <Grid
                      container
                      key={num || JSON.stringify(row)}
                      sx={{
                        py: 3,
                        borderTop:
                          idx === 0 ? "none" : `1px solid ${colors.line}`,
                        alignItems: "center",
                      }}
                      spacing={2}
                    >
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <Typography sx={eyebrowSx}>Order</Typography>
                        <Typography
                          sx={{
                            fontFamily: fonts.body,
                            fontSize: 13,
                            color: colors.ink,
                            fontWeight: 500,
                            letterSpacing: "0.04em",
                            mt: 0.5,
                          }}
                        >
                          {num || "—"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography sx={eyebrowSx}>Placed</Typography>
                        <Typography
                          sx={{
                            fontFamily: fonts.body,
                            fontSize: 13,
                            color: colors.ink,
                            mt: 0.5,
                          }}
                        >
                          {formatWhen(
                            row?.createdAt ?? row?.placedAt ?? row?.date
                          )}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 2 }}>
                        <StatusBadge status={pickStatus(row)} />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 2 }}>
                        <Typography sx={eyebrowSx}>Total</Typography>
                        <Typography
                          sx={{
                            fontFamily: fonts.body,
                            fontSize: 14,
                            color: colors.ink,
                            fontWeight: 500,
                            mt: 0.5,
                          }}
                        >
                          {INR.format(pickTotal(row))}
                        </Typography>
                      </Grid>
                      <Grid
                        size={{ xs: 6, sm: 2 }}
                        sx={{ textAlign: { sm: "right" } }}
                      >
                        {num ? (
                          <Box
                            component={RouterLink}
                            to={`/orders/${encodeURIComponent(num)}`}
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 11,
                              letterSpacing: "0.22em",
                              textTransform: "uppercase",
                              fontWeight: 500,
                              color: colors.ink,
                              textDecoration: "none",
                              borderBottom: `1px solid ${colors.ink}`,
                              pb: 0.5,
                              "&:hover": {
                                color: colors.wine,
                                borderBottomColor: colors.wine,
                              },
                            }}
                          >
                            View →
                          </Box>
                        ) : null}
                      </Grid>
                    </Grid>
                  );
                })}
              </Box>
            )}

            {!loading && rows.length > 0 ? (
              <Box sx={{ pt: 2 }}>
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
                  sx={{
                    fontFamily: fonts.body,
                    color: colors.muted,
                    fontSize: 12,
                    "& .MuiToolbar-root": { paddingLeft: 0 },
                  }}
                />
              </Box>
            ) : null}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

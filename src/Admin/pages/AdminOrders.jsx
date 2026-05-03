import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "pending", label: "pending" },
  { value: "confirmed", label: "confirmed" },
  { value: "processing", label: "processing" },
  { value: "shipped", label: "shipped" },
  { value: "delivered", label: "delivered" },
  { value: "cancelled", label: "cancelled" },
  { value: "returned", label: "returned" },
];

function normalizeListPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  let items = [];
  let total = 0;

  if (Array.isArray(root)) {
    items = root;
    total = root.length;
  } else if (Array.isArray(root?.orders)) {
    items = root.orders;
    total = Number(root.total ?? root.count ?? root.pagination?.total ?? items.length) || items.length;
  } else if (Array.isArray(root?.data)) {
    items = root.data;
    total = Number(root.total ?? root.meta?.total ?? items.length) || items.length;
  } else if (Array.isArray(root?.items)) {
    items = root.items;
    total = Number(root.total ?? items.length) || items.length;
  } else if (root && typeof root === "object") {
    const firstArray = Object.values(root).find((v) => Array.isArray(v));
    if (firstArray) {
      items = firstArray;
      total = Number(root.total ?? root.count ?? items.length) || items.length;
    }
  }

  return { items, total };
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

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value != null ? String(value) : "—";
  return `Rs ${n.toFixed(2)}`;
}

const AdminOrders = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (searchApplied.trim()) params.search = searchApplied.trim();

      const { data } = await client.get("/admin/orders", { params });
      const { items, total: t } = normalizeListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e?.response?.data?.message || e?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, fromDate, toDate, searchApplied]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchApplied(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const tableRows = useMemo(
    () =>
      rows.map((order) => {
        const orderNumber = pickOrderNumber(order);
        return {
          raw: order,
          orderNumber,
          customer: order?.customerName ?? order?.user?.name ?? order?.customer?.name ?? order?.shippingAddress?.fullName ?? "—",
          status: String(order?.status ?? "—"),
          totalAmount: formatAmount(order?.totalAmount ?? order?.total ?? order?.grandTotal),
          createdAt: formatDate(order?.createdAt ?? order?.created_at ?? order?.placedAt),
        };
      }),
    [rows]
  );

  const openOrder = (orderNumber) => {
    if (!orderNumber) return;
    navigate(`/admin/orders/${encodeURIComponent(String(orderNumber))}`);
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

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1180, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Orders" }]} />
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
          <TextField
            label="Search order number"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { md: 280 } }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="order-status-filter">Status</InputLabel>
            <Select
              labelId="order-status-filter"
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="From"
            type="date"
            size="small"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 2,
            border: `1px solid ${alpha("#0f3828", 0.1)}`,
            boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Placed At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: accent }} />
                  </TableCell>
                </TableRow>
              ) : tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "#6f7f77" }}>
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row) => (
                  <TableRow
                    key={row.orderNumber || JSON.stringify(row.raw)}
                    hover
                    sx={{ cursor: row.orderNumber ? "pointer" : "default" }}
                    onClick={() => openOrder(row.orderNumber)}
                  >
                    <TableCell sx={{ color: "#1f2a24", fontWeight: 600 }}>{row.orderNumber || "—"}</TableCell>
                    <TableCell sx={{ color: "#1f2a24" }}>{row.customer}</TableCell>
                    <TableCell sx={{ color: "#1f2a24", textTransform: "capitalize" }}>{row.status}</TableCell>
                    <TableCell sx={{ color: "#1f2a24" }}>{row.totalAmount}</TableCell>
                    <TableCell sx={{ color: "#1f2a24" }}>{row.createdAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AdminOrders;

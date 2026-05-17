import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
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
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "requested", label: "requested" },
  { value: "approved", label: "approved" },
  { value: "rejected", label: "rejected" },
];

function normalizeListPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  let items = [];
  let total = 0;

  if (Array.isArray(root)) {
    items = root;
    total = root.length;
  } else if (Array.isArray(root?.returns)) {
    items = root.returns;
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

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

const AdminReturns = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (statusFilter) params.status = statusFilter;

      const { data } = await client.get("/admin/returns", { params });
      const { items, total: t } = normalizeListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(getApiErrorMessage(e, "Failed to load returns."));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const tableRows = useMemo(
    () =>
      rows.map((returnItem) => {
        const returnNumber = pickReturnNumber(returnItem);
        return {
          raw: returnItem,
          returnNumber,
          orderNumber:
            returnItem?.orderNumber ??
            returnItem?.order_no ??
            returnItem?.orderNo ??
            returnItem?.order?.orderNumber ??
            "—",
          customer:
            returnItem?.customerName ??
            returnItem?.user?.name ??
            returnItem?.customer?.name ??
            returnItem?.order?.customerName ??
            "—",
          status: String(returnItem?.status ?? "—"),
          requestedAt: formatDate(returnItem?.requestedAt ?? returnItem?.createdAt ?? returnItem?.created_at),
        };
      }),
    [rows]
  );

  const openReturn = (returnNumber) => {
    if (!returnNumber) return;
    navigate(`/admin/returns/${encodeURIComponent(String(returnNumber))}`);
  };

  if (!["super_admin", "manager", "support_staff"].includes(roleGate || "")) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1180, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Returns" }]} />
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="return-status-filter">Status</InputLabel>
            <Select
              labelId="return-status-filter"
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
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Return #</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2a4135" }}>Requested At</TableCell>
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
                    No returns found.
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row) => (
                  <TableRow
                    key={row.returnNumber || JSON.stringify(row.raw)}
                    hover
                    sx={{ cursor: row.returnNumber ? "pointer" : "default" }}
                    onClick={() => openReturn(row.returnNumber)}
                  >
                    <TableCell sx={{ color: "#1f2a24", fontWeight: 600 }}>{row.returnNumber || "—"}</TableCell>
                    <TableCell sx={{ color: "#1f2a24" }}>{String(row.orderNumber || "—")}</TableCell>
                    <TableCell sx={{ color: "#1f2a24" }}>{row.customer}</TableCell>
                    <TableCell sx={{ color: "#1f2a24", textTransform: "capitalize" }}>{row.status}</TableCell>
                    <TableCell sx={{ color: "#1f2a24" }}>{row.requestedAt}</TableCell>
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

export default AdminReturns;

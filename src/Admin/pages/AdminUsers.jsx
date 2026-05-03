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

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "customer", label: "customer" },
  { value: "super_admin", label: "super_admin" },
  { value: "manager", label: "manager" },
];

function normalizeListPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  let items = [];
  let total = 0;

  if (Array.isArray(root)) {
    items = root;
    total = root.length;
  } else if (Array.isArray(root?.users)) {
    items = root.users;
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

function pickUserId(row) {
  return row?._id ?? row?.id ?? row?.userId ?? null;
}

function formatUserCell(row, key) {
  const v = row?.[key];
  if (v == null || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const columns = useMemo(() => {
    const sample = rows[0];
    if (!sample || typeof sample !== "object") {
      return ["name", "fullName", "email", "role", "createdAt"];
    }
    const preferred = ["name", "fullName", "email", "phone", "role", "createdAt", "updatedAt"];
    const keys = Object.keys(sample).filter((k) => !k.startsWith("__") && k !== "password" && k !== "passwordHash");
    const ordered = [...preferred.filter((k) => keys.includes(k)), ...keys.filter((k) => !preferred.includes(k))];
    return ordered.slice(0, 6);
  }, [rows]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        order,
      };
      if (roleFilter) params.role = roleFilter;
      if (searchApplied.trim()) params.search = searchApplied.trim();

      const { data } = await client.get("/admin/users", { params });
      const { items, total: t } = normalizeListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e?.response?.data?.message || e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, order, roleFilter, searchApplied]);

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

  const goToUser = (userId) => {
    if (!userId) return;
    const ids = rows.map(pickUserId).filter(Boolean);
    const pageIndex = ids.indexOf(userId);
    const listPosition = page * rowsPerPage + (pageIndex >= 0 ? pageIndex : 0) + 1;
    navigate(`/admin/users/${encodeURIComponent(String(userId))}`, {
      state: {
        pageUserIds: ids,
        pageIndex: pageIndex >= 0 ? pageIndex : 0,
        listTotal: total,
        listPosition,
      },
    });
  };

  if (!["super_admin", "manager"].includes(roleGate || "")) {
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

      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Users" }]} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <TextField
            label="Search name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { sm: 360 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="role-filter-label">Role</InputLabel>
            <Select
              labelId="role-filter-label"
              label="Role"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
            >
              {ROLE_OPTIONS.map((o) => (
                <MenuItem key={o.value || "all"} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="order-label">Sort</InputLabel>
            <Select
              labelId="order-label"
              label="Sort"
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="desc">Newest first</MenuItem>
              <MenuItem value="asc">Oldest first</MenuItem>
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
                {columns.map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: "#2a4135", textTransform: "capitalize" }}>
                    {col.replace(/([A-Z])/g, " $1").trim()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length, 1)} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: accent }} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length, 1)} align="center" sx={{ py: 4, color: "#6f7f77" }}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const id = pickUserId(row);
                  return (
                    <TableRow
                      key={id || JSON.stringify(row)}
                      hover
                      sx={{ cursor: id ? "pointer" : "default" }}
                      onClick={() => goToUser(id)}
                    >
                      {columns.map((col) => (
                        <TableCell key={col} sx={{ color: "#1f2a24" }}>
                          {formatUserCell(row, col)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
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
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AdminUsers;

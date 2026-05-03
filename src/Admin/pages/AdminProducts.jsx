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
  { value: "draft", label: "draft" },
  { value: "published", label: "published" },
  { value: "archived", label: "archived" },
];

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function pickCategoryId(node) {
  if (node == null) return null;
  return node._id ?? node.id ?? null;
}

function normalizeCategoriesListPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.categories)) return root.categories;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  if (root && typeof root === "object") {
    const firstArray = Object.values(root).find((value) => Array.isArray(value));
    if (firstArray) return firstArray;
  }
  return [];
}

function pickProductId(product) {
  if (!product) return null;
  return product._id ?? product.id ?? product.productId ?? null;
}

function normalizeProductsListPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  let items = [];
  let total = 0;

  if (Array.isArray(root)) {
    items = root;
    total = root.length;
  } else if (Array.isArray(root?.products)) {
    items = root.products;
    total = Number(root.total ?? root.count ?? root.pagination?.total ?? items.length) || items.length;
  } else if (Array.isArray(root?.items)) {
    items = root.items;
    total = Number(root.total ?? root.count ?? items.length) || items.length;
  } else if (Array.isArray(root?.data)) {
    items = root.data;
    total = Number(root.total ?? root.meta?.total ?? items.length) || items.length;
  } else if (root && typeof root === "object") {
    const firstArray = Object.values(root).find((value) => Array.isArray(value));
    if (firstArray) {
      items = firstArray;
      total = Number(root.total ?? root.count ?? items.length) || items.length;
    }
  }

  return { items, total };
}

function productDisplayCell(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const AdminProducts = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [categories, setCategories] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const columns = useMemo(() => {
    const sample = rows[0];
    if (!sample || typeof sample !== "object") {
      return ["name", "slug", "brand", "status", "regularPrice", "discountPrice", "updatedAt"];
    }
    const preferred = ["name", "slug", "brand", "status", "regularPrice", "discountPrice", "updatedAt", "createdAt"];
    const keys = Object.keys(sample).filter((k) => !k.startsWith("__"));
    const ordered = [...preferred.filter((k) => keys.includes(k)), ...keys.filter((k) => !preferred.includes(k))];
    return ordered.slice(0, 8);
  }, [rows]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await client.get("/admin/categories");
      const list = normalizeCategoriesListPayload(data);
      setCategories(list);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        order,
      };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (searchApplied.trim()) params.search = searchApplied.trim();

      const { data } = await client.get("/admin/products", { params });
      const { items, total: t } = normalizeProductsListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e?.response?.data?.message || e?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, order, statusFilter, categoryFilter, searchApplied]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchApplied(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

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

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Products" }]} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <TextField
            label="Search products"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { sm: 320 } }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value || "all"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="category-filter-label">Category</InputLabel>
            <Select
              labelId="category-filter-label"
              label="Category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((category) => {
                const id = pickCategoryId(category);
                if (!id) return null;
                return (
                  <MenuItem key={`filter-${String(id)}`} value={String(id)}>
                    {String(category?.name || id)}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="order-filter-label">Sort</InputLabel>
            <Select
              labelId="order-filter-label"
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
          <Button
            variant="contained"
            onClick={() => navigate("/admin/products/create")}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              bgcolor: accent,
              boxShadow: "none",
              "&:hover": { bgcolor: "#8f723c", boxShadow: "0 6px 18px rgba(171, 138, 72, 0.35)" },
            }}
          >
            Create Product
          </Button>
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
                {columns.map((column) => (
                  <TableCell key={column} sx={{ fontWeight: 700, color: "#2a4135", textTransform: "capitalize" }}>
                    {column.replace(/([A-Z])/g, " $1").trim()}
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
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={pickProductId(row) || JSON.stringify(row)} hover>
                    {columns.map((column) => (
                      <TableCell key={column} sx={{ color: "#1f2a24" }}>
                        {column === "updatedAt" || column === "createdAt"
                          ? formatDateTime(row?.[column])
                          : productDisplayCell(row?.[column])}
                      </TableCell>
                    ))}
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
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AdminProducts;

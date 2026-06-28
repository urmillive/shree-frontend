import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, TableCell, TablePagination, TableRow, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";
import AdminActiveFilterChips from "../components/AdminActiveFilterChips";
import AdminFilterSelect from "../components/AdminFilterSelect";
import AdminListTable from "../components/AdminListTable";
import AdminListSelectionToolbar from "../components/AdminListSelectionToolbar";
import AdminMergedSearchField from "../components/AdminMergedSearchField";
import AdminRowSelectCell from "../components/AdminRowSelectCell";
import { accent, pageBg } from "../components/adminListTheme";
import { useAdminMergedSearch } from "../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";
import { normalizeListPayload } from "../utils/adminListUtils";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const SEARCH_BY_OPTIONS = [
  { value: "name", label: "Name", placeholder: "Enter product name" },
  { value: "slug", label: "Slug", placeholder: "Enter slug" },
  { value: "id", label: "Product ID", placeholder: "Enter product ID" },
  { value: "brand", label: "Brand", placeholder: "Enter brand" },
];

const PRODUCT_COLUMNS = [
  { id: "name", label: "name" },
  { id: "createdAt", label: "created At" },
  { id: "slug", label: "slug" },
  { id: "brand", label: "brand" },
  { id: "regularPrice", label: "regular Price" },
  { id: "discountPrice", label: "discount Price" },
  { id: "status", label: "status" },
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

function productDisplayCell(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getProductSortValue(row, key) {
  const v = row?.[key];
  if (key === "createdAt") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const n = Number(v);
  if (Number.isFinite(n) && (key === "regularPrice" || key === "discountPrice")) return n;
  if (v == null || v === "") return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
const PRODUCT_EXPORT_COLUMNS = PRODUCT_COLUMNS.map((col) => ({
  ...col,
  getValue: (row) =>
    col.id === "createdAt" ? formatDateTime(row?.[col.id]) : productDisplayCell(row?.[col.id]),
}));
const getProductRowId = (row) => {
  const id = pickProductId(row);
  return id == null ? "" : String(id);
};

const AdminProducts = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { sortBy, sortOrder, handleSort } = useAdminTableSort({ defaultSortBy: "createdAt", defaultSortOrder: "desc" });
  const {
    searchTypeInput,
    setSearchTypeInput,
    searchTypeApplied,
    searchInput,
    setSearchInput,
    searchApplied,
    handleSearch,
    getSearchChip,
    searchPlaceholder,
  } = useAdminMergedSearch({
    defaultSearchType: "name",
    searchOptions: SEARCH_BY_OPTIONS,
    onApply: () => setPage(0),
  });
  const apiOrder = sortBy === "createdAt" ? sortOrder : "desc";
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
        order: apiOrder,
      };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (searchApplied.trim()) {
        params.search = searchApplied.trim();
        params.searchBy = searchTypeApplied;
      }
      const { data } = await client.get("/admin/products", { params });
      const { items, total: t } = normalizeListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(getApiErrorMessage(e, "Failed to load products."));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, apiOrder, statusFilter, categoryFilter, searchApplied, searchTypeApplied]);
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  const categoryOptions = useMemo(() => {
    const opts = [{ value: "", label: "All categories" }];
    categories.forEach((category) => {
      const id = pickCategoryId(category);
      if (!id) return;
      opts.push({ value: String(id), label: String(category?.name || id) });
    });
    return opts;
  }, [categories]);
  const activeFilters = useMemo(() => {
    const chips = [];
    const searchChip = getSearchChip(() => setPage(0));
    if (searchChip) chips.push(searchChip);
    if (statusFilter) {
      const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
      chips.push({
        key: "status",
        label: `Status: ${statusLabel}`,
        onRemove: () => {
          setStatusFilter("");
          setPage(0);
        },
      });
    }
    if (categoryFilter) {
      const category = categories.find((c) => String(pickCategoryId(c)) === categoryFilter);
      chips.push({
        key: "category",
        label: `Category: ${category?.name || categoryFilter}`,
        onRemove: () => {
          setCategoryFilter("");
          setPage(0);
        },
      });
    }
    return chips;
  }, [getSearchChip, statusFilter, categoryFilter, categories]);
  const sortedRows = useMemo(() => {
    if (sortBy === "createdAt") return rows;
    return sortRows(rows, sortBy, sortOrder, getProductSortValue);
  }, [rows, sortBy, sortOrder]);
  const selection = useAdminRowSelection();
  const visibleRowIds = useMemo(() => sortedRows.map(getProductRowId).filter(Boolean), [sortedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(sortedRows, getProductRowId)
        : sortedRows;
    exportListToCsv({
      filename: `products-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: PRODUCT_EXPORT_COLUMNS,
      rows: rowsToExport,
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
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Products" }]} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <AdminMergedSearchField
            searchOptions={SEARCH_BY_OPTIONS}
            searchTypeInput={searchTypeInput}
            onSearchTypeChange={setSearchTypeInput}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            placeholder={searchPlaceholder}
            sx={{ maxWidth: { sm: 400 }, flex: { sm: "1 1 300px" } }}
          />
          <AdminFilterSelect
            labelId="status-filter-label"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            options={STATUS_OPTIONS}
            minWidth={150}
          />
          <AdminFilterSelect
            labelId="category-filter-label"
            label="Category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(0);
            }}
            options={categoryOptions}
            minWidth={180}
          />
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
        <AdminActiveFilterChips filters={activeFilters} />
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <AdminListSelectionToolbar
          selectedCount={selection.selectedCount}
          totalVisible={sortedRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />
        <AdminListTable
          columns={PRODUCT_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(col) => {
            handleSort(col);
            setPage(0);
          }}
          loading={loading}
          isEmpty={sortedRows.length === 0}
          emptyMessage="No products found."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || sortedRows.length === 0}
          pagination={
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
          }
        >
          {sortedRows.map((row) => {
            const rowId = getProductRowId(row);
            const checked = selection.isSelected(rowId);
            return (
            <TableRow
              key={rowId || JSON.stringify(row)}
              hover
              selected={checked}
              onClick={() => {
                const id = pickProductId(row);
                if (id) navigate(`/admin/products/${encodeURIComponent(String(id))}`);
              }}
              sx={{
                cursor: rowId ? "pointer" : "default",
                "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: -2 },
              }}
              tabIndex={rowId ? 0 : -1}
            >
              <AdminRowSelectCell
                checked={checked}
                disabled={!rowId}
                onChange={() => selection.toggleRow(rowId)}
              />
              {PRODUCT_COLUMNS.map((column) => (
                <TableCell key={column.id} sx={{ color: "#1f2a24" }}>
                  {column.id === "createdAt"
                    ? formatDateTime(row?.[column.id])
                    : productDisplayCell(row?.[column.id])}
                </TableCell>
              ))}
            </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default AdminProducts;

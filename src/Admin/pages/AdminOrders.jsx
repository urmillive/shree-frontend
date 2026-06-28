import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, TableCell, TablePagination, TableRow, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";
import { useToast } from "../../context/useToast";
import AdminActiveFilterChips from "../components/AdminActiveFilterChips";
import AdminFilterDateField from "../components/AdminFilterDateField";
import AdminFilterSelect from "../components/AdminFilterSelect";
import AdminListTable from "../components/AdminListTable";
import AdminListSelectionToolbar from "../components/AdminListSelectionToolbar";
import AdminMergedSearchField from "../components/AdminMergedSearchField";
import AdminRowSelectCell from "../components/AdminRowSelectCell";
import { pageBg } from "../components/adminListTheme";
import { useAdminMergedSearch } from "../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";
import { normalizeListPayload } from "../utils/adminListUtils";

const SEARCH_BY_OPTIONS = [
  { value: "orderNumber", label: "Order #", placeholder: "Enter order number" },
  { value: "customerName", label: "Customer name", placeholder: "Enter customer name" },
  { value: "customerEmail", label: "Email", placeholder: "Enter customer email" },
];

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

const ORDER_COLUMNS = [
  { id: "orderNumber", label: "Order #" },
  { id: "customer", label: "Customer" },
  { id: "status", label: "Status" },
  { id: "totalAmount", label: "Total" },
  { id: "createdAt", label: "Placed At" },
];

const ORDER_EXPORT_COLUMNS = [
  { id: "orderNumber", label: "Order #", getValue: (row) => row.orderNumber },
  { id: "customer", label: "Customer", getValue: (row) => row.customer },
  { id: "status", label: "Status", getValue: (row) => row.status },
  { id: "totalAmount", label: "Total", getValue: (row) => row.totalAmount },
  { id: "createdAt", label: "Placed At", getValue: (row) => row.createdAt },
];

const getOrderRowId = (row) => row?.orderNumber ?? "";

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

function parseTimestamp(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}
const AdminOrders = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const roleGate = localStorage.getItem("role");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
    defaultSearchType: "orderNumber",
    searchOptions: SEARCH_BY_OPTIONS,
    onApply: () => setPage(0),
  });
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
      if (searchApplied.trim()) {
        const searchValue = searchApplied.trim();
        if (searchTypeApplied === "orderNumber") params.orderNumber = searchValue;
        else if (searchTypeApplied === "customerName") params.customerName = searchValue;
        else if (searchTypeApplied === "customerEmail") params.customerEmail = searchValue;
      }
      const { data } = await client.get("/admin/orders", { params });
      const { items, total: t } = normalizeListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(getApiErrorMessage(e, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, fromDate, toDate, searchApplied, searchTypeApplied]);
  useEffect(() => {
    fetchList();
  }, [fetchList]);
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
    if (fromDate) {
      chips.push({
        key: "from",
        label: `From: ${fromDate}`,
        onRemove: () => {
          setFromDate("");
          setPage(0);
        },
      });
    }
    if (toDate) {
      chips.push({
        key: "to",
        label: `To: ${toDate}`,
        onRemove: () => {
          setToDate("");
          setPage(0);
        },
      });
    }
    return chips;
  }, [getSearchChip, statusFilter, fromDate, toDate]);
  const tableRows = useMemo(
    () =>
      rows.map((order) => {
        const orderNumber = pickOrderNumber(order);
        const createdRaw = order?.createdAt ?? order?.created_at ?? order?.placedAt;
        const totalRaw = order?.pricing?.total;
        return {
          raw: order,
          orderNumber,
          customer: order?.customerName ?? order?.user?.name ?? order?.customer?.name ?? order?.shippingAddress?.fullName ?? "—",
          status: String(order?.status ?? "—"),
          totalAmount: formatAmount(totalRaw),
          createdAt: formatDate(createdRaw),
          _sort: {
            orderNumber: orderNumber ?? "",
            customer: order?.customerName ?? order?.user?.name ?? order?.customer?.name ?? order?.shippingAddress?.fullName ?? "",
            status: String(order?.status ?? ""),
            totalAmount: Number(totalRaw),
            createdAt: parseTimestamp(createdRaw),
          },
        };
      }),
    [rows]
  );
  const sortedTableRows = useMemo(
    () => sortRows(tableRows, sortBy, sortOrder, (row, col) => row._sort?.[col]),
    [tableRows, sortBy, sortOrder]
  );
  const selection = useAdminRowSelection();
  const visibleRowIds = useMemo(
    () => sortedTableRows.map(getOrderRowId).filter(Boolean),
    [sortedTableRows]
  );
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(sortedTableRows, getOrderRowId)
        : sortedTableRows;
    exportListToCsv({
      filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: ORDER_EXPORT_COLUMNS,
      rows: rowsToExport,
    });
  };

  const openOrder = (orderNumber) => {
    if (!orderNumber) return;
    navigate(`/admin/orders/${encodeURIComponent(String(orderNumber))}`);
  };

  const copyOrderNumber = async (orderNumber, e) => {
    e.stopPropagation();
    if (!orderNumber) return;
    try {
      await navigator.clipboard.writeText(String(orderNumber));
      showSuccess("Order number copied");
    } catch {
      showError("Could not copy order number");
    }
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
          <AdminMergedSearchField
            searchOptions={SEARCH_BY_OPTIONS}
            searchTypeInput={searchTypeInput}
            onSearchTypeChange={setSearchTypeInput}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            placeholder={searchPlaceholder}
            sx={{ maxWidth: { md: 400 }, flex: { md: "1 1 320px" } }}
          />
          <AdminFilterSelect
            labelId="order-status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            options={STATUS_OPTIONS}
            minWidth={180}
          />
          <AdminFilterDateField
            label="From"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
          />
          <AdminFilterDateField
            label="To"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
          />
        </Stack>
        <AdminActiveFilterChips filters={activeFilters} />
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <AdminListSelectionToolbar
          selectedCount={selection.selectedCount}
          totalVisible={sortedTableRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />
        <AdminListTable
          columns={ORDER_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={sortedTableRows.length === 0}
          emptyMessage="No orders found."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || sortedTableRows.length === 0}
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
              rowsPerPageOptions={[10, 20, 50]}
            />
          }
        >
          {sortedTableRows.map((row) => {
            const rowId = getOrderRowId(row);
            const checked = selection.isSelected(rowId);
            return (
            <TableRow
              key={row.orderNumber || JSON.stringify(row.raw)}
              hover
              selected={checked}
              sx={{ cursor: row.orderNumber ? "pointer" : "default" }}
              onClick={() => openOrder(row.orderNumber)}
            >
              <AdminRowSelectCell
                checked={checked}
                disabled={!rowId}
                onChange={() => selection.toggleRow(rowId)}
              />
              <TableCell
                sx={{
                  color: "#1f2a24",
                  fontWeight: 600,
                  userSelect: "none",
                  cursor: row.orderNumber ? "copy" : "default",
                }}
                title={row.orderNumber ? "Click to copy" : undefined}
                onClick={(e) => copyOrderNumber(row.orderNumber, e)}
              >
                {row.orderNumber || "—"}
              </TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.customer}</TableCell>
              <TableCell sx={{ color: "#1f2a24", textTransform: "capitalize" }}>{row.status}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.totalAmount}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.createdAt}</TableCell>
            </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default AdminOrders;

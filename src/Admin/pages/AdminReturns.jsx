import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Stack, TableCell, TablePagination, TableRow, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";
import AdminActiveFilterChips from "../components/AdminActiveFilterChips";
import AdminFilterSelect from "../components/AdminFilterSelect";
import AdminListTable from "../components/AdminListTable";
import AdminListSelectionToolbar from "../components/AdminListSelectionToolbar";
import AdminRowSelectCell from "../components/AdminRowSelectCell";
import { pageBg } from "../components/adminListTheme";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";
import { normalizeListPayload } from "../utils/adminListUtils";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "requested", label: "requested" },
  { value: "approved", label: "approved" },
  { value: "rejected", label: "rejected" },
];

const RETURN_COLUMNS = [
  { id: "returnNumber", label: "Return #" },
  { id: "orderNumber", label: "Order #" },
  { id: "customer", label: "Customer" },
  { id: "status", label: "Status" },
  { id: "requestedAt", label: "Requested At" },
];

const RETURN_EXPORT_COLUMNS = [
  { id: "returnNumber", label: "Return #", getValue: (row) => row.returnNumber },
  { id: "orderNumber", label: "Order #", getValue: (row) => row.orderNumber },
  { id: "customer", label: "Customer", getValue: (row) => row.customer },
  { id: "status", label: "Status", getValue: (row) => row.status },
  { id: "requestedAt", label: "Requested At", getValue: (row) => row.requestedAt },
];

const getReturnRowId = (row) => row?.returnNumber ?? "";

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

function parseTimestamp(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
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
  const { sortBy, sortOrder, handleSort } = useAdminTableSort({ defaultSortBy: "requestedAt", defaultSortOrder: "desc" });
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
  const activeFilters = useMemo(() => {
    if (!statusFilter) return [];
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    return [
      {
        key: "status",
        label: `Status: ${statusLabel}`,
        onRemove: () => {
          setStatusFilter("");
          setPage(0);
        },
      },
    ];
  }, [statusFilter]);
  const tableRows = useMemo(
    () =>
      rows.map((returnItem) => {
        const returnNumber = pickReturnNumber(returnItem);
        const requestedRaw = returnItem?.requestedAt ?? returnItem?.createdAt ?? returnItem?.created_at;
        const orderNumber =
          returnItem?.orderNumber ??
          returnItem?.order_no ??
          returnItem?.orderNo ??
          returnItem?.order?.orderNumber ??
          "—";
        return {
          raw: returnItem,
          returnNumber,
          orderNumber: String(orderNumber || "—"),
          customer:
            returnItem?.customerName ??
            returnItem?.user?.name ??
            returnItem?.customer?.name ??
            returnItem?.order?.customerName ??
            "—",
          status: String(returnItem?.status ?? "—"),
          requestedAt: formatDate(requestedRaw),
          _sort: {
            returnNumber: returnNumber ?? "",
            orderNumber: String(orderNumber || ""),
            customer:
              returnItem?.customerName ??
              returnItem?.user?.name ??
              returnItem?.customer?.name ??
              returnItem?.order?.customerName ??
              "",
            status: String(returnItem?.status ?? ""),
            requestedAt: parseTimestamp(requestedRaw),
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
  const visibleRowIds = useMemo(() => sortedTableRows.map(getReturnRowId).filter(Boolean), [sortedTableRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(sortedTableRows, getReturnRowId)
        : sortedTableRows;
    exportListToCsv({
      filename: `returns-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: RETURN_EXPORT_COLUMNS,
      rows: rowsToExport,
    });
  };

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
          <AdminFilterSelect
            labelId="return-status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            options={STATUS_OPTIONS}
            minWidth={220}
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
          columns={RETURN_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={sortedTableRows.length === 0}
          emptyMessage="No returns found."
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
            const rowId = getReturnRowId(row);
            const checked = selection.isSelected(rowId);
            return (
            <TableRow
              key={rowId || JSON.stringify(row.raw)}
              hover
              selected={checked}
              sx={{ cursor: rowId ? "pointer" : "default" }}
              onClick={() => openReturn(row.returnNumber)}
            >
              <AdminRowSelectCell
                checked={checked}
                disabled={!rowId}
                onChange={() => selection.toggleRow(rowId)}
              />
              <TableCell sx={{ color: "#1f2a24", fontWeight: 600 }}>{row.returnNumber || "—"}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.orderNumber}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.customer}</TableCell>
              <TableCell sx={{ color: "#1f2a24", textTransform: "capitalize" }}>{row.status}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.requestedAt}</TableCell>
            </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default AdminReturns;

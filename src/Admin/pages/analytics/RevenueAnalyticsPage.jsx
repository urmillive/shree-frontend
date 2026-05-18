import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Stack, TableCell, TablePagination, TableRow, Typography } from "@mui/material";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import AdminActiveFilterChips from "../../components/AdminActiveFilterChips";
import AdminFilterDateField from "../../components/AdminFilterDateField";
import AdminFilterSelect from "../../components/AdminFilterSelect";
import AdminListTable from "../../components/AdminListTable";
import AdminListSelectionToolbar from "../../components/AdminListSelectionToolbar";
import AdminRowSelectCell from "../../components/AdminRowSelectCell";
import { pageBg } from "../../components/adminListTheme";
import { useAdminRowSelection } from "../../hooks/useAdminRowSelection";
import { useAdminTableSort } from "../../hooks/useAdminTableSort";
import { exportListToCsv } from "../../utils/exportAdminListCsv";
import { fetchRevenueReport } from "../../services/analyticsService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { formatCount, formatCurrency } from "./AnalyticsShared";
import { buildDateFilterChips, getAnalyticsDefaultDateRange, getAnalyticsSortValue, useClientPagedSortedRows } from "./analyticsListUtils";

const { from: DEFAULT_FROM, to: DEFAULT_TO } = getAnalyticsDefaultDateRange();

const GROUP_BY_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
];

const TABLE_COLUMNS = [
  { id: "period", label: "Period" },
  { id: "orders", label: "Orders" },
  { id: "revenue", label: "Revenue" },
];

const getRowId = (row) => String(row?.period ?? "");

const RevenueAnalyticsPage = () => {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [groupBy, setGroupBy] = useState("day");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { sortBy, sortOrder, handleSort } = useAdminTableSort({ defaultSortBy: "period", defaultSortOrder: "asc" });
  const selection = useAdminRowSelection();

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchRevenueReport({ from, to, groupBy });
        const reportRows = Array.isArray(payload) ? payload : payload?.breakdown || payload?.items || [];
        if (!isMounted) return;
        setRows(
          reportRows.map((row) => ({
            period: row.period || row.date || row.day || row.month || "—",
            orders: Number(row.orders ?? row.orderCount ?? 0),
            revenue: Number(row.revenue ?? row.amount ?? 0),
          }))
        );
        setPage(0);
      } catch (e) {
        if (isMounted) {
          setRows([]);
          setError(getApiErrorMessage(e, "Failed to load revenue report."));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [from, to, groupBy]);

  const totalRevenue = useMemo(() => rows.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0), [rows]);

  const { sortedRows, paginatedRows, total } = useClientPagedSortedRows(rows, {
    sortBy,
    sortOrder,
    getSortValue: getAnalyticsSortValue,
    page,
    rowsPerPage,
  });

  const activeFilters = useMemo(() => {
    const chips = buildDateFilterChips({
      from,
      to,
      defaultFrom: DEFAULT_FROM,
      defaultTo: DEFAULT_TO,
      onClearFrom: () => {
        setFrom(getAnalyticsDefaultDateRange().from);
        setPage(0);
      },
      onClearTo: () => {
        setTo(getAnalyticsDefaultDateRange().to);
        setPage(0);
      },
    });
    if (groupBy !== "day") {
      const label = GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label ?? groupBy;
      chips.push({
        key: "groupBy",
        label: `Group by: ${label}`,
        onRemove: () => {
          setGroupBy("day");
          setPage(0);
        },
      });
    }
    return chips;
  }, [from, to, groupBy]);

  const exportColumns = useMemo(
    () => [
      { id: "period", label: "Period" },
      { id: "orders", label: "Orders", getValue: (row) => formatCount(row.orders) },
      { id: "revenue", label: "Revenue", getValue: (row) => formatCurrency(row.revenue) },
    ],
    []
  );

  const handleExport = useCallback(() => {
    const rowsToExport =
      selection.selectedCount > 0 ? selection.filterSelectedRows(sortedRows, getRowId) : sortedRows;
    exportListToCsv({
      filename: `revenue-report-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns,
      rows: rowsToExport,
    });
  }, [exportColumns, selection, sortedRows]);

  const visibleRowIds = useMemo(() => paginatedRows.map(getRowId).filter(Boolean), [paginatedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);

  const renderCell = (row, col) => {
    if (col === "orders") return formatCount(row.orders);
    if (col === "revenue") return formatCurrency(row.revenue);
    return row[col] ?? "—";
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Analytics", to: "/admin/analytics" },
            { label: "Revenue" },
          ]}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Revenue Breakdown
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f6d66", mb: 2 }}>
          Total revenue: {formatCurrency(totalRevenue)} ({formatCount(rows.length)} periods)
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
          <AdminFilterDateField
            label="From"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
          <AdminFilterDateField
            label="To"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
          <AdminFilterSelect
            labelId="revenue-group-by-label"
            label="Group by"
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value);
              setPage(0);
            }}
            options={GROUP_BY_OPTIONS}
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
          totalVisible={paginatedRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />

        <AdminListTable
          columns={TABLE_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={!loading && paginatedRows.length === 0}
          emptyMessage="No revenue entries for selected range."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || paginatedRows.length === 0}
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
          {paginatedRows.map((row) => {
            const rowId = getRowId(row);
            const checked = selection.isSelected(rowId);
            return (
              <TableRow key={rowId} hover selected={checked}>
                <AdminRowSelectCell checked={checked} disabled={!rowId} onChange={() => selection.toggleRow(rowId)} />
                {TABLE_COLUMNS.map((col) => (
                  <TableCell key={col.id} sx={{ color: "#1f2a24" }}>
                    {renderCell(row, col.id)}
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

export default RevenueAnalyticsPage;

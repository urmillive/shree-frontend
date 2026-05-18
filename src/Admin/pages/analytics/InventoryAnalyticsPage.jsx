import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, TableCell, TableRow, Typography } from "@mui/material";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import AdminListTable from "../../components/AdminListTable";
import AdminListSelectionToolbar from "../../components/AdminListSelectionToolbar";
import AdminRowSelectCell from "../../components/AdminRowSelectCell";
import { pageBg } from "../../components/adminListTheme";
import { useAdminRowSelection } from "../../hooks/useAdminRowSelection";
import { useAdminTableSort } from "../../hooks/useAdminTableSort";
import { exportListToCsv } from "../../utils/exportAdminListCsv";
import { fetchInventoryReport } from "../../services/analyticsService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { formatCount, formatCurrency } from "./AnalyticsShared";
import { getAnalyticsSortValue, useClientPagedSortedRows } from "./analyticsListUtils";

const TABLE_COLUMNS = [
  { id: "metric", label: "Metric" },
  { id: "value", label: "Value" },
];

const getRowId = (row) => String(row?.metric ?? "");

const InventoryAnalyticsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { sortBy, sortOrder, handleSort } = useAdminTableSort({ defaultSortBy: "metric", defaultSortOrder: "asc" });
  const selection = useAdminRowSelection();

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchInventoryReport();
        if (!isMounted) return;
        const payload = data || {};
        setRows([
          { metric: "Out of Stock", value: Number(payload?.outOfStock ?? 0), type: "count" },
          { metric: "Low Stock", value: Number(payload?.lowStock ?? 0), type: "count" },
          { metric: "Total Active Products", value: Number(payload?.totalActiveProducts ?? 0), type: "count" },
          { metric: "Total Active Variants", value: Number(payload?.totalActiveVariants ?? 0), type: "count" },
          { metric: "Estimated Stock Value", value: Number(payload?.estimatedStockValue ?? 0), type: "currency" },
        ]);
      } catch (e) {
        if (isMounted) {
          setRows([]);
          setError(getApiErrorMessage(e, "Failed to load inventory snapshot."));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const { sortedRows } = useClientPagedSortedRows(rows, {
    sortBy,
    sortOrder,
    getSortValue: getAnalyticsSortValue,
    page: 0,
    rowsPerPage: rows.length || 1,
  });

  const exportColumns = useMemo(
    () => [
      { id: "metric", label: "Metric" },
      {
        id: "value",
        label: "Value",
        getValue: (row) => (row.type === "currency" ? formatCurrency(row.value) : formatCount(row.value)),
      },
    ],
    []
  );

  const handleExport = useCallback(() => {
    const rowsToExport =
      selection.selectedCount > 0 ? selection.filterSelectedRows(sortedRows, getRowId) : sortedRows;
    exportListToCsv({
      filename: `inventory-health-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns,
      rows: rowsToExport,
    });
  }, [exportColumns, selection, sortedRows]);

  const visibleRowIds = useMemo(() => sortedRows.map(getRowId).filter(Boolean), [sortedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);

  const formatValue = (row) => (row.type === "currency" ? formatCurrency(row.value) : formatCount(row.value));

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Analytics", to: "/admin/analytics" },
            { label: "Inventory" },
          ]}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Inventory Health Snapshot
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f6d66", mb: 2 }}>
          Current stock health and estimated inventory value.
        </Typography>

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
          columns={TABLE_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={!loading && sortedRows.length === 0}
          emptyMessage="No inventory data available."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || sortedRows.length === 0}
        >
          {sortedRows.map((row) => {
            const rowId = getRowId(row);
            const checked = selection.isSelected(rowId);
            return (
              <TableRow key={rowId} hover selected={checked}>
                <AdminRowSelectCell checked={checked} disabled={!rowId} onChange={() => selection.toggleRow(rowId)} />
                <TableCell sx={{ color: "#1f2a24" }}>{row.metric}</TableCell>
                <TableCell sx={{ color: "#1f2a24" }}>{formatValue(row)}</TableCell>
              </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default InventoryAnalyticsPage;

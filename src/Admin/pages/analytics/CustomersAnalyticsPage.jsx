import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Paper, Stack, TableCell, TablePagination, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import AdminActiveFilterChips from "../../components/AdminActiveFilterChips";
import AdminFilterDateField from "../../components/AdminFilterDateField";
import AdminListTable from "../../components/AdminListTable";
import AdminListSelectionToolbar from "../../components/AdminListSelectionToolbar";
import AdminMergedSearchField from "../../components/AdminMergedSearchField";
import AdminRowSelectCell from "../../components/AdminRowSelectCell";
import { pageBg } from "../../components/adminListTheme";
import { useAdminMergedSearch } from "../../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../../hooks/useAdminRowSelection";
import { useAdminTableSort } from "../../hooks/useAdminTableSort";
import { exportListToCsv } from "../../utils/exportAdminListCsv";
import { fetchCustomersReport } from "../../services/analyticsService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { formatCount, formatCurrency } from "./analyticsFormatters";
import { buildDateFilterChips, getAnalyticsDefaultDateRange, getAnalyticsSortValue, useClientPagedSortedRows } from "./analyticsListUtils";

const { from: DEFAULT_FROM, to: DEFAULT_TO } = getAnalyticsDefaultDateRange();

const SEARCH_BY_OPTIONS = [{ value: "customer", label: "Customer", placeholder: "Enter customer name or email" }];

const TABLE_COLUMNS = [
  { id: "customer", label: "Customer" },
  { id: "orders", label: "Orders" },
  { id: "spend", label: "Spend" },
];

const getRowId = (row) => String(row?.customer ?? "");

const CustomersAnalyticsPage = () => {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [summary, setSummary] = useState({ newCustomers: 0, returningCustomers: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { sortBy, sortOrder, handleSort } = useAdminTableSort({ defaultSortBy: "spend", defaultSortOrder: "desc" });
  const selection = useAdminRowSelection();

  const {
    searchTypeInput,
    setSearchTypeInput,
    searchInput,
    setSearchInput,
    searchApplied,
    handleSearch,
    getSearchChip,
    searchPlaceholder,
  } = useAdminMergedSearch({
    defaultSearchType: "customer",
    searchOptions: SEARCH_BY_OPTIONS,
    onApply: () => setPage(0),
  });

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchCustomersReport({ from, to });
        const top = payload?.topCustomers || payload?.items || payload?.customers || [];
        if (!isMounted) return;
        setSummary({
          newCustomers: Number(payload?.newCustomers ?? payload?.new ?? 0),
          returningCustomers: Number(payload?.returningCustomers ?? payload?.returning ?? 0),
        });
        setRows(
          (Array.isArray(top) ? top : []).map((row) => ({
            customer: row.customerName || row.name || row.email || row.customerId || "Unknown",
            orders: Number(row.orders ?? row.orderCount ?? 0),
            spend: Number(row.spend ?? row.totalSpend ?? row.revenue ?? 0),
          }))
        );
        setPage(0);
      } catch (e) {
        if (isMounted) {
          setRows([]);
          setSummary({ newCustomers: 0, returningCustomers: 0 });
          setError(getApiErrorMessage(e, "Failed to load customer stats."));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [from, to]);

  const matchesSearch = useMemo(() => {
    const term = searchApplied.trim().toLowerCase();
    if (!term) return null;
    return (row) => String(row.customer ?? "").toLowerCase().includes(term);
  }, [searchApplied]);

  const { sortedRows, paginatedRows, total } = useClientPagedSortedRows(rows, {
    sortBy,
    sortOrder,
    getSortValue: getAnalyticsSortValue,
    page,
    rowsPerPage,
    matchesSearch,
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
    const searchChip = getSearchChip(() => setPage(0));
    if (searchChip) chips.push(searchChip);
    return chips;
  }, [from, to, getSearchChip]);

  const exportColumns = useMemo(
    () => [
      { id: "customer", label: "Customer" },
      { id: "orders", label: "Orders", getValue: (row) => formatCount(row.orders) },
      { id: "spend", label: "Spend", getValue: (row) => formatCurrency(row.spend) },
    ],
    []
  );

  const handleExport = useCallback(() => {
    const rowsToExport =
      selection.selectedCount > 0 ? selection.filterSelectedRows(sortedRows, getRowId) : sortedRows;
    exportListToCsv({
      filename: `customer-stats-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns,
      rows: rowsToExport,
    });
  }, [exportColumns, selection, sortedRows]);

  const visibleRowIds = useMemo(() => paginatedRows.map(getRowId).filter(Boolean), [paginatedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);

  const renderCell = (row, col) => {
    if (col === "orders") return formatCount(row.orders);
    if (col === "spend") return formatCurrency(row.spend);
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
            { label: "Customers" },
          ]}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Customer Stats
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f6d66", mb: 2 }}>
          Track new/returning users and top spenders.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
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
        </Stack>

        <AdminActiveFilterChips filters={activeFilters} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, flex: 1 }}>
            <Typography variant="body2" sx={{ color: "#5c6a64" }}>
              New Customers
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {formatCount(summary.newCustomers)}
            </Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, flex: 1 }}>
            <Typography variant="body2" sx={{ color: "#5c6a64" }}>
              Returning Customers
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {formatCount(summary.returningCustomers)}
            </Typography>
          </Paper>
        </Stack>

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
          emptyMessage="No top customer data available for selected range."
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

export default CustomersAnalyticsPage;

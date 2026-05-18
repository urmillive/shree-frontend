import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Stack, TableCell, TablePagination, TableRow, Typography } from "@mui/material";
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
import { fetchReturnsReport } from "../../services/analyticsService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { formatCount } from "./AnalyticsShared";
import { buildDateFilterChips, getAnalyticsDefaultDateRange, getAnalyticsSortValue, useClientPagedSortedRows } from "./analyticsListUtils";

const { from: DEFAULT_FROM, to: DEFAULT_TO } = getAnalyticsDefaultDateRange();

const SEARCH_BY_OPTIONS = [{ value: "status", label: "Status", placeholder: "Enter return status" }];

const TABLE_COLUMNS = [
  { id: "status", label: "Return Status" },
  { id: "count", label: "Count" },
];

const getRowId = (row) => String(row?.status ?? "");

const ReturnsAnalyticsPage = () => {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { sortBy, sortOrder, handleSort } = useAdminTableSort({ defaultSortBy: "count", defaultSortOrder: "desc" });
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
    defaultSearchType: "status",
    searchOptions: SEARCH_BY_OPTIONS,
    onApply: () => setPage(0),
  });

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchReturnsReport({ from, to });
        const list = Array.isArray(payload) ? payload : payload?.breakdown || payload?.statuses || payload?.items || [];
        if (!isMounted) return;
        setRows(
          (Array.isArray(list) ? list : []).map((row) => ({
            status: row.status || row.returnStatus || "unknown",
            count: Number(row.count ?? row.total ?? row.returns ?? 0),
          }))
        );
        setPage(0);
      } catch (e) {
        if (isMounted) {
          setRows([]);
          setError(getApiErrorMessage(e, "Failed to load returns report."));
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
    return (row) => String(row.status ?? "").toLowerCase().includes(term);
  }, [searchApplied]);

  const { sortedRows, paginatedRows, total } = useClientPagedSortedRows(rows, {
    sortBy,
    sortOrder,
    getSortValue: getAnalyticsSortValue,
    page,
    rowsPerPage,
    matchesSearch,
  });

  const totalReturns = useMemo(() => sortedRows.reduce((acc, row) => acc + row.count, 0), [sortedRows]);

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
      { id: "status", label: "Return Status" },
      { id: "count", label: "Count", getValue: (row) => formatCount(row.count) },
    ],
    []
  );

  const handleExport = useCallback(() => {
    const rowsToExport =
      selection.selectedCount > 0 ? selection.filterSelectedRows(sortedRows, getRowId) : sortedRows;
    exportListToCsv({
      filename: `returns-report-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns,
      rows: rowsToExport,
    });
  }, [exportColumns, selection, sortedRows]);

  const visibleRowIds = useMemo(() => paginatedRows.map(getRowId).filter(Boolean), [paginatedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Analytics", to: "/admin/analytics" },
            { label: "Returns" },
          ]}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Return Stats Breakdown
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f6d66", mb: 2 }}>
          Total returns: {formatCount(totalReturns)}
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
          emptyMessage="No returns data for selected range."
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
                <TableCell sx={{ color: "#1f2a24" }}>{row.status}</TableCell>
                <TableCell sx={{ color: "#1f2a24" }}>{formatCount(row.count)}</TableCell>
              </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default ReturnsAnalyticsPage;

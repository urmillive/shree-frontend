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
import { pageBg } from "../components/adminListTheme";
import { useAdminMergedSearch } from "../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";
import { normalizeListPayload } from "../utils/adminListUtils";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "customer", label: "customer" },
  { value: "super_admin", label: "super_admin" },
  { value: "manager", label: "manager" },
];

const SEARCH_BY_OPTIONS = [
  { value: "name", label: "Name", placeholder: "Enter user name" },
  { value: "email", label: "Email", placeholder: "Enter email address" },
  { value: "id", label: "User ID", placeholder: "Enter user ID" },
];

function pickUserId(row) {
  return row?._id ?? row?.id ?? row?.userId ?? null;
}
const getUserRowId = (row) => {
  const id = pickUserId(row);
  return id == null ? "" : String(id);
};

function formatUserCell(row, key) {
  const v = row?.[key];
  if (v == null || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function getSortValue(row, key) {
  const v = row?.[key];
  if (v == null || v === "") return "";
  if (typeof v === "object") return JSON.stringify(v);
  if (key === "createdAt" || key === "updatedAt") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const n = Number(v);
  if (Number.isFinite(n) && String(v).trim() !== "") return n;
  return String(v);
}
const AdminUsers = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState("");
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
  const tableColumns = useMemo(
    () =>
      columns.map((col) => ({
        id: col,
        label: col.replace(/([A-Z])/g, " $1").trim(),
      })),
    [columns]
  );
  const apiOrder = sortBy === "createdAt" ? sortOrder : "desc";
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        order: apiOrder,
      };
      if (roleFilter) params.role = roleFilter;
      if (searchApplied.trim()) {
        params.search = searchApplied.trim();
        params.searchBy = searchTypeApplied;
      }
      const { data } = await client.get("/admin/users", { params });
      const { items, total: t } = normalizeListPayload(data);
      setRows(items);
      setTotal(t);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(getApiErrorMessage(e, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, apiOrder, roleFilter, searchApplied, searchTypeApplied]);
  useEffect(() => {
    fetchList();
  }, [fetchList]);
  const activeFilters = useMemo(() => {
    const chips = [];
    const searchChip = getSearchChip(() => setPage(0));
    if (searchChip) chips.push(searchChip);
    if (roleFilter) {
      const roleLabel = ROLE_OPTIONS.find((o) => o.value === roleFilter)?.label ?? roleFilter;
      chips.push({
        key: "role",
        label: `Role: ${roleLabel}`,
        onRemove: () => {
          setRoleFilter("");
          setPage(0);
        },
      });
    }
    return chips;
  }, [getSearchChip, roleFilter]);
  const sortedRows = useMemo(() => {
    if (sortBy === "createdAt") return rows;
    return sortRows(rows, sortBy, sortOrder, getSortValue);
  }, [rows, sortBy, sortOrder]);
  const userExportColumns = useMemo(
    () =>
      columns.map((col) => ({
        id: col,
        label: col.replace(/([A-Z])/g, " $1").trim(),
        getValue: (row) => formatUserCell(row, col),
      })),
    [columns]
  );
  const selection = useAdminRowSelection();
  const visibleRowIds = useMemo(() => sortedRows.map(getUserRowId).filter(Boolean), [sortedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(sortedRows, getUserRowId)
        : sortedRows;
    exportListToCsv({
      filename: `users-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: userExportColumns,
      rows: rowsToExport,
    });
  };

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
            labelId="role-filter-label"
            label="Role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            options={ROLE_OPTIONS}
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
          totalVisible={sortedRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />
        <AdminListTable
          columns={tableColumns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(col) => {
            handleSort(col);
            setPage(0);
          }}
          loading={loading}
          isEmpty={sortedRows.length === 0}
          emptyMessage="No users found."
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
            const rowId = getUserRowId(row);
            const checked = selection.isSelected(rowId);
            return (
              <TableRow
                key={rowId || JSON.stringify(row)}
                hover
                selected={checked}
                sx={{ cursor: rowId ? "pointer" : "default" }}
                onClick={() => goToUser(pickUserId(row))}
              >
                <AdminRowSelectCell
                  checked={checked}
                  disabled={!rowId}
                  onChange={() => selection.toggleRow(rowId)}
                />
                {columns.map((col) => (
                  <TableCell key={col} sx={{ color: "#1f2a24" }}>
                    {formatUserCell(row, col)}
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

export default AdminUsers;

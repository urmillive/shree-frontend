import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Stack, TableCell, TableRow, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";
import AdminActiveFilterChips from "../components/AdminActiveFilterChips";
import AdminListTable from "../components/AdminListTable";
import AdminListSelectionToolbar from "../components/AdminListSelectionToolbar";
import AdminMergedSearchField from "../components/AdminMergedSearchField";
import AdminRowSelectCell from "../components/AdminRowSelectCell";
import { accent, pageBg } from "../components/adminListTheme";
import { getApiErrorMessage } from "../../utils/apiError";
import { fetchAdminCategories, flattenCategories } from "../services/adminCategoriesService";
import { useAdminMergedSearch } from "../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";

const SEARCH_BY_OPTIONS = [
  { value: "name", label: "Name", placeholder: "Enter category name" },
  { value: "id", label: "Category ID", placeholder: "Enter category ID" },
  { value: "path", label: "Path", placeholder: "Enter path" },
];

const CATEGORY_COLUMNS = [
  { id: "name", label: "Name" },
  { id: "path", label: "Path" },
  { id: "createdAt", label: "Created At" },
  { id: "level", label: "Level" },
  { id: "status", label: "Status" },
  { id: "displayOrder", label: "Display Order" },
];

const CATEGORY_EXPORT_COLUMNS = [
  { id: "name", label: "Name", getValue: (row) => row.name },
  { id: "path", label: "Path", getValue: (row) => row.path },
  { id: "createdAt", label: "Created At", getValue: (row) => row.createdAt },
  { id: "level", label: "Level", getValue: (row) => row.level },
  { id: "status", label: "Status", getValue: (row) => row.status },
  { id: "displayOrder", label: "Display Order", getValue: (row) => row.displayOrder },
];

const getCategoryId = (category) => String(category?._id || category?.id || category?._uiId || "").trim();
const getCategoryRowId = (row) => row?.id ?? "";
const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const getCategoryTimestamp = (category, field) =>
  category?.[field] ?? category?.[field === "createdAt" ? "created_at" : "updated_at"];
const parseTimestamp = (value) => {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const AdminCategories = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const { sortBy, sortOrder, handleSort } = useAdminTableSort({ defaultSortBy: "displayOrder", defaultSortOrder: "asc" });
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
  });
  const loadCategories = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await fetchAdminCategories();
      setCategoriesFlat(flattenCategories(data));
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load categories."),
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAdminAllowed) {
      loadCategories();
    }
  }, [isAdminAllowed]);
  const activeFilters = useMemo(() => {
    const searchChip = getSearchChip();
    return searchChip ? [searchChip] : [];
  }, [getSearchChip]);
  const filteredRows = useMemo(() => {
    const search = searchApplied.trim().toLowerCase();
    if (!search) return categoriesFlat;
    return categoriesFlat.filter((category) => {
      const id = getCategoryId(category).toLowerCase();
      const name = String(category?.name || "").toLowerCase();
      const pathLabel = String(category?._uiPathLabel || "").toLowerCase();
      if (searchTypeApplied === "id") return id.includes(search);
      if (searchTypeApplied === "name") return name.includes(search);
      if (searchTypeApplied === "path") return pathLabel.includes(search);
      return id.includes(search) || name.includes(search) || pathLabel.includes(search);
    });
  }, [categoriesFlat, searchApplied, searchTypeApplied]);
  const tableRows = useMemo(
    () =>
      filteredRows.map((category) => ({
        raw: category,
        id: getCategoryId(category),
        name: category?.name || "-",
        path: category?._uiPathLabel || "-",
        createdAt: formatDate(getCategoryTimestamp(category, "createdAt")),
        level: category?.level ?? 0,
        status: category?.isActive ? "active" : "inactive",
        displayOrder: category?.displayOrder ?? 0,
        _sort: {
          name: String(category?.name || ""),
          path: String(category?._uiPathLabel || ""),
          createdAt: parseTimestamp(getCategoryTimestamp(category, "createdAt")),
          level: Number(category?.level ?? 0),
          status: category?.isActive ? 1 : 0,
          displayOrder: Number(category?.displayOrder ?? 0),
        },
      })),
    [filteredRows]
  );
  const sortedRows = useMemo(
    () => sortRows(tableRows, sortBy, sortOrder, (row, col) => row._sort?.[col]),
    [tableRows, sortBy, sortOrder]
  );
  const selection = useAdminRowSelection();
  const visibleRowIds = useMemo(() => sortedRows.map(getCategoryRowId).filter(Boolean), [sortedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(sortedRows, getCategoryRowId)
        : sortedRows;
    exportListToCsv({
      filename: `categories-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: CATEGORY_EXPORT_COLUMNS,
      rows: rowsToExport,
    });
  };
  if (!isAdminAllowed) {
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
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Categories" }]} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Categories
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate("/admin/categories/create")}>
              Create Category
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent }} onClick={loadCategories}>
              Refresh
            </Button>
          </Stack>
        </Stack>
        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}
        <AdminMergedSearchField
          searchOptions={SEARCH_BY_OPTIONS}
          searchTypeInput={searchTypeInput}
          onSearchTypeChange={setSearchTypeInput}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearch}
          placeholder={searchPlaceholder}
          sx={{ maxWidth: { sm: 420 }, mb: 2 }}
        />
        <AdminActiveFilterChips filters={activeFilters} />
        <AdminListSelectionToolbar
          selectedCount={selection.selectedCount}
          totalVisible={sortedRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />
        <AdminListTable
          columns={CATEGORY_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={sortedRows.length === 0}
          emptyMessage="No categories found."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || sortedRows.length === 0}
        >
          {sortedRows.map((row, index) => {
            const rowId = getCategoryRowId(row);
            const checked = selection.isSelected(rowId);
            return (
            <TableRow
              key={rowId || `category-${index}`}
              hover
              selected={checked}
              sx={{ cursor: rowId ? "pointer" : "default" }}
              onClick={() => rowId && navigate(`/admin/categories/${encodeURIComponent(rowId)}`)}
            >
              <AdminRowSelectCell
                checked={checked}
                disabled={!rowId}
                onChange={() => selection.toggleRow(rowId)}
              />
              <TableCell sx={{ color: "#1f2a24", fontWeight: 600 }}>{row.name}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.path}</TableCell>
              <TableCell sx={{ color: "#1f2a24", whiteSpace: "nowrap" }}>{row.createdAt}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.level}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>
                <Chip label={row.status} size="small" color={row.raw?.isActive ? "success" : "default"} />
              </TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.displayOrder}</TableCell>
            </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default AdminCategories;

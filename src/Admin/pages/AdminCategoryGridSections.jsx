import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, TableCell, TableRow, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";
import AdminActiveFilterChips from "../components/AdminActiveFilterChips";
import AdminListTable from "../components/AdminListTable";
import AdminListSelectionToolbar from "../components/AdminListSelectionToolbar";
import AdminMergedSearchField from "../components/AdminMergedSearchField";
import AdminRowSelectCell from "../components/AdminRowSelectCell";
import { accent, pageBg } from "../components/adminListTheme";
import { useAdminMergedSearch } from "../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";

const SEARCH_BY_OPTIONS = [
  { value: "title", label: "Title", placeholder: "Enter title" },
  { value: "id", label: "Section ID", placeholder: "Enter section ID" },
  { value: "subtitle", label: "Subtitle", placeholder: "Enter subtitle" },
];

const SECTION_COLUMNS = [
  { id: "title", label: "Title" },
  { id: "status", label: "Status" },
  { id: "displayOrder", label: "Display Order" },
  { id: "categories", label: "Categories" },
];

const SECTION_EXPORT_COLUMNS = [
  { id: "title", label: "Title", getValue: (row) => row.title },
  { id: "status", label: "Status", getValue: (row) => row.status },
  { id: "displayOrder", label: "Display Order", getValue: (row) => row.displayOrder },
  { id: "categories", label: "Categories", getValue: (row) => row.categories },
];

const getSectionRowId = (row) => String(row?.id || "");
const normalizeSections = (payload) => {
  const levelOne = payload?.data ?? payload;
  if (!levelOne) return [];
  const list = levelOne.sections ?? levelOne.items ?? levelOne.data ?? levelOne;
  return Array.isArray(list) ? list : [];
};

const AdminCategoryGridSections = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [sections, setSections] = useState([]);
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
    defaultSearchType: "title",
    searchOptions: SEARCH_BY_OPTIONS,
  });
  const loadSections = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get("/admin/sections");
      const allSections = normalizeSections(data);
      setSections(allSections.filter((section) => section?.type === "category_grid"));
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load category grid sections."),
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAdminAllowed) {
      loadSections();
    }
  }, [isAdminAllowed]);
  const activeFilters = useMemo(() => {
    const searchChip = getSearchChip();
    return searchChip ? [searchChip] : [];
  }, [getSearchChip]);
  const filteredRows = useMemo(() => {
    const search = searchApplied.trim().toLowerCase();
    if (!search) return sections;
    return sections.filter((section) => {
      const id = String(section?._id || section?.id || "").toLowerCase();
      const title = String(section?.title || "").toLowerCase();
      const subtitle = String(section?.subtitle || "").toLowerCase();
      if (searchTypeApplied === "id") return id.includes(search);
      if (searchTypeApplied === "title") return title.includes(search);
      if (searchTypeApplied === "subtitle") return subtitle.includes(search);
      return id.includes(search) || title.includes(search) || subtitle.includes(search);
    });
  }, [sections, searchApplied, searchTypeApplied]);
  const tableRows = useMemo(
    () =>
      filteredRows.map((section) => {
        const categoryIds = Array.isArray(section?.categoryIds) ? section.categoryIds : [];
        return {
          raw: section,
          id: section?._id || section?.id || "",
          title: section?.title || "-",
          status: section?.isActive ? "Active" : "Inactive",
          displayOrder: section?.displayOrder ?? 0,
          categories: categoryIds.length,
          _sort: {
            title: String(section?.title || ""),
            status: section?.isActive ? 1 : 0,
            displayOrder: Number(section?.displayOrder ?? 0),
            categories: categoryIds.length,
          },
        };
      }),
    [filteredRows]
  );
  const sortedRows = useMemo(
    () => sortRows(tableRows, sortBy, sortOrder, (row, col) => row._sort?.[col]),
    [tableRows, sortBy, sortOrder]
  );
  const selection = useAdminRowSelection();
  const visibleRowIds = useMemo(() => sortedRows.map(getSectionRowId).filter(Boolean), [sortedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(sortedRows, getSectionRowId)
        : sortedRows;
    exportListToCsv({
      filename: `category-grid-sections-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: SECTION_EXPORT_COLUMNS,
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
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Homepage CMS", to: "/admin/homepage-cms" },
            { label: "Category Grid Sections" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Category Grid Sections
          </Typography>
          <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate("/admin/homepage-cms/category-grid-sections/create")}>
            Create Category Grid Section
          </Button>
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
          sx={{ maxWidth: { sm: 400 }, mb: 2 }}
        />
        <AdminActiveFilterChips filters={activeFilters} />
        <AdminListSelectionToolbar
          selectedCount={selection.selectedCount}
          totalVisible={sortedRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />
        <AdminListTable
          columns={SECTION_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={sortedRows.length === 0}
          emptyMessage="No category grid sections found."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || sortedRows.length === 0}
        >
          {sortedRows.map((row, index) => {
            const rowId = getSectionRowId(row);
            const checked = selection.isSelected(rowId);
            return (
            <TableRow
              key={rowId || `section-${index}`}
              hover
              selected={checked}
              sx={{ cursor: rowId ? "pointer" : "default" }}
              onClick={() => rowId && navigate(`/admin/homepage-cms/category-grid-sections/${encodeURIComponent(rowId)}`)}
            >
              <AdminRowSelectCell
                checked={checked}
                disabled={!rowId}
                onChange={() => selection.toggleRow(rowId)}
              />
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1f2a24" }}>
                  {row.title}
                </Typography>
              </TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.status}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.displayOrder}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.categories}</TableCell>
            </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default AdminCategoryGridSections;

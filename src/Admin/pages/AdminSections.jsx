import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminActiveFilterChips from "../components/AdminActiveFilterChips";
import AdminFilterSelect from "../components/AdminFilterSelect";
import AdminListTable from "../components/AdminListTable";
import AdminListSelectionToolbar from "../components/AdminListSelectionToolbar";
import AdminMergedSearchField from "../components/AdminMergedSearchField";
import AdminNavbar from "../components/AdminNavbar";
import AdminRowSelectCell from "../components/AdminRowSelectCell";
import { accent, pageBg } from "../components/adminListTheme";
import { getApiErrorMessage } from "../../utils/apiError";
import { useAdminMergedSearch } from "../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";

const SEARCH_BY_OPTIONS = [
  { value: "title", label: "Title", placeholder: "Enter title" },
  { value: "id", label: "Section ID", placeholder: "Enter section ID" },
  { value: "subtitle", label: "Subtitle", placeholder: "Enter subtitle" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "product_list", label: "product_list" },
  { value: "category_grid", label: "category_grid" },
];

const SECTION_COLUMNS = [
  { id: "title", label: "Title" },
  { id: "type", label: "Type" },
  { id: "status", label: "Status" },
  { id: "displayOrder", label: "Display Order" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
];

const SECTION_EXPORT_COLUMNS = [
  { id: "title", label: "Title", getValue: (row) => row.title },
  { id: "type", label: "Type", getValue: (row) => row.type },
  { id: "status", label: "Status", getValue: (row) => row.status },
  { id: "displayOrder", label: "Display Order", getValue: (row) => row.displayOrder },
  { id: "products", label: "Products", getValue: (row) => row.products },
  { id: "categories", label: "Categories", getValue: (row) => row.categories },
];

const getSectionRowId = (row) => String(row?.sectionId || "");

const defaultCreateForm = {
  title: "",
  subtitle: "",
  type: "product_list",
  displayOrder: 0,
  isActive: true,
};

const normalizeSections = (payload) => {
  const levelOne = payload?.data ?? payload;
  if (!levelOne) return [];
  const list = levelOne.sections ?? levelOne.items ?? levelOne.data ?? levelOne;
  return Array.isArray(list) ? list : [];
};

const AdminSections = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [sections, setSections] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [createForm, setCreateForm] = useState(defaultCreateForm);

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
      setSections(normalizeSections(data));
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load sections."),
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
    const chips = [];
    const searchChip = getSearchChip();
    if (searchChip) chips.push(searchChip);
    if (typeFilter) {
      const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter;
      chips.push({
        key: "type",
        label: `Type: ${typeLabel}`,
        onRemove: () => setTypeFilter(""),
      });
    }
    return chips;
  }, [getSearchChip, typeFilter]);

  const filteredRows = useMemo(() => {
    const search = searchApplied.trim().toLowerCase();
    return sections.filter((section) => {
      if (typeFilter && section?.type !== typeFilter) return false;
      if (!search) return true;
      const id = String(section?._id || section?.id || "").toLowerCase();
      const title = String(section?.title || "").toLowerCase();
      const subtitle = String(section?.subtitle || "").toLowerCase();
      if (searchTypeApplied === "id") return id.includes(search);
      if (searchTypeApplied === "title") return title.includes(search);
      if (searchTypeApplied === "subtitle") return subtitle.includes(search);
      return id.includes(search) || title.includes(search) || subtitle.includes(search);
    });
  }, [sections, searchApplied, searchTypeApplied, typeFilter]);

  const tableRows = useMemo(() => {
    const mapped = filteredRows.map((section) => {
      const productIds = Array.isArray(section?.productIds) ? section.productIds : [];
      const categoryIds = Array.isArray(section?.categoryIds) ? section.categoryIds : [];
      return {
        raw: section,
        sectionId: section?._id || section?.id || "",
        title: section?.title || "-",
        type: section?.type || "-",
        status: section?.isActive ? "Active" : "Inactive",
        displayOrder: Number(section?.displayOrder) || 0,
        products: productIds.length,
        categories: categoryIds.length,
      };
    });
    return sortRows(mapped, sortBy, sortOrder, (row, columnId) => row[columnId]);
  }, [filteredRows, sortBy, sortOrder]);

  const selection = useAdminRowSelection();
  const visibleRowIds = useMemo(() => tableRows.map(getSectionRowId).filter(Boolean), [tableRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(tableRows, getSectionRowId)
        : tableRows;
    exportListToCsv({
      filename: `sections-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: SECTION_EXPORT_COLUMNS,
      rows: rowsToExport,
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        title: createForm.title.trim(),
        subtitle: createForm.subtitle.trim() || undefined,
        type: createForm.type,
        displayOrder: Number(createForm.displayOrder) || 0,
        isActive: Boolean(createForm.isActive),
      };
      const { data } = await client.post("/admin/sections", payload);
      const created = data?.data?.section ?? data?.section ?? data?.data ?? data;
      const id = created?._id ?? created?.id ?? "";
      setFeedback({ type: "success", message: "Section created successfully." });
      setCreateForm(defaultCreateForm);
      await loadSections();
      if (id) navigate(`/admin/homepage-cms/sections/${encodeURIComponent(String(id))}`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to create section."),
      });
    } finally {
      setCreating(false);
    }
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
            { label: "Sections" },
          ]}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Homepage Sections
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms")}>
              Back to CMS
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={loadSections}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Paper
          component="form"
          onSubmit={handleCreate}
          elevation={0}
          sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}`, boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)" }}
        >
          <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 1.5 }}>Create new section</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField label="Title" size="small" required value={createForm.title} onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))} fullWidth />
            <TextField label="Subtitle" size="small" value={createForm.subtitle} onChange={(event) => setCreateForm((prev) => ({ ...prev, subtitle: event.target.value }))} fullWidth />
            <TextField select label="Type" size="small" value={createForm.type} onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value }))} sx={{ minWidth: 170 }}>
              <MenuItem value="product_list">product_list</MenuItem>
              <MenuItem value="category_grid">category_grid</MenuItem>
            </TextField>
            <TextField
              label="Display Order"
              type="number"
              size="small"
              value={createForm.displayOrder}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
              sx={{ minWidth: 130 }}
            />
            <Button type="submit" variant="contained" disabled={creating} sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </Stack>
        </Paper>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <AdminMergedSearchField
            searchOptions={SEARCH_BY_OPTIONS}
            searchTypeInput={searchTypeInput}
            onSearchTypeChange={setSearchTypeInput}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            placeholder={searchPlaceholder}
            sx={{ maxWidth: { sm: 400 }, mb: { xs: 0, sm: 0 } }}
          />
          <AdminFilterSelect
            label="Type"
            labelId="sections-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={TYPE_OPTIONS}
            minWidth={180}
          />
        </Stack>

        <AdminActiveFilterChips filters={activeFilters} />

        <AdminListSelectionToolbar
          selectedCount={selection.selectedCount}
          totalVisible={tableRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />

        <AdminListTable
          columns={SECTION_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={!loading && tableRows.length === 0}
          emptyMessage="No sections found."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || tableRows.length === 0}
        >
          {tableRows.map((row, index) => {
            const rowId = getSectionRowId(row);
            const checked = selection.isSelected(rowId);
            return (
            <TableRow
              key={rowId || `section-${index}`}
              hover
              selected={checked}
              sx={{ cursor: rowId ? "pointer" : "default" }}
              onClick={() => rowId && navigate(`/admin/homepage-cms/sections/${encodeURIComponent(rowId)}`)}
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
              <TableCell sx={{ color: "#1f2a24" }}>{row.type}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.status}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.displayOrder}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.products}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.categories}</TableCell>
            </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default AdminSections;

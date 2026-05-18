import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, TableCell, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
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
import { accent, pageBg } from "../components/adminListTheme";
import { useAdminMergedSearch } from "../hooks/useAdminMergedSearch";
import { useAdminRowSelection } from "../hooks/useAdminRowSelection";
import { sortRows, useAdminTableSort } from "../hooks/useAdminTableSort";
import { exportListToCsv } from "../utils/exportAdminListCsv";

const SEARCH_BY_OPTIONS = [
  { value: "title", label: "Title", placeholder: "Enter title" },
  { value: "id", label: "Banner ID", placeholder: "Enter banner ID" },
  { value: "subtitle", label: "Subtitle", placeholder: "Enter subtitle" },
  { value: "cta", label: "CTA", placeholder: "Enter CTA text" },
];

const PLACEMENT_LABELS = { hero: "Hero", promo_strip: "Promo strip" };
const BANNER_COLUMNS = [
  { id: "title", label: "Title" },
  { id: "createdAt", label: "Created At" },
  { id: "placement", label: "Placement" },
  { id: "displayOrder", label: "Display Order" },
  { id: "status", label: "Status" },
];

const BANNER_EXPORT_COLUMNS = [
  { id: "title", label: "Title", getValue: (row) => row.title },
  { id: "createdAt", label: "Created At", getValue: (row) => row.createdAt },
  { id: "placement", label: "Placement", getValue: (row) => row.placement },
  { id: "displayOrder", label: "Display Order", getValue: (row) => row.displayOrder },
  { id: "status", label: "Status", getValue: (row) => row.status },
];

const getBannerRowId = (row) => String(row?.id || "");
const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatText = (value) => {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
};

const parseTimestamp = (value) => {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const AdminBannerList = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [banners, setBanners] = useState([]);
  const [placementFilter, setPlacementFilter] = useState("");
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
  const loadBanners = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const { data } = await client.get("/admin/banners");
      const list = data?.data?.banners ?? data?.data?.items ?? data?.data ?? data?.items ?? data?.banners ?? [];
      setBanners(Array.isArray(list) ? list : []);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Failed to load banners."),
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAdminAllowed) {
      loadBanners();
    }
  }, [isAdminAllowed]);
  const activeFilters = useMemo(() => {
    const chips = [];
    const searchChip = getSearchChip();
    if (searchChip) chips.push(searchChip);
    if (placementFilter) {
      chips.push({
        key: "placement",
        label: `Placement: ${PLACEMENT_LABELS[placementFilter] ?? placementFilter}`,
        onRemove: () => setPlacementFilter(""),
      });
    }
    return chips;
  }, [getSearchChip, placementFilter]);
  const filteredRows = useMemo(() => {
    const search = searchApplied.trim().toLowerCase();
    return banners.filter((banner) => {
      if (placementFilter && banner?.placement !== placementFilter) return false;
      if (!search) return true;
      const id = String(banner?._id || banner?.id || "").toLowerCase();
      const title = String(banner?.title || "").toLowerCase();
      const subtitle = String(banner?.subtitle || "").toLowerCase();
      const ctaText = String(banner?.ctaText || "").toLowerCase();
      if (searchTypeApplied === "id") return id.includes(search);
      if (searchTypeApplied === "title") return title.includes(search);
      if (searchTypeApplied === "subtitle") return subtitle.includes(search);
      if (searchTypeApplied === "cta") return ctaText.includes(search);
      return id.includes(search) || title.includes(search) || subtitle.includes(search) || ctaText.includes(search);
    });
  }, [banners, searchApplied, searchTypeApplied, placementFilter]);
  const tableRows = useMemo(
    () =>
      filteredRows.map((banner) => ({
        raw: banner,
        id: banner?._id || banner?.id || "",
        title: formatText(banner?.title),
        createdAt: formatDate(banner?.createdAt),
        placement: formatText(banner?.placement),
        displayOrder: banner?.displayOrder ?? 0,
        status: banner?.isActive ? "Active" : "Inactive",
        _sort: {
          title: String(banner?.title || ""),
          createdAt: parseTimestamp(banner?.createdAt),
          placement: String(banner?.placement || ""),
          displayOrder: Number(banner?.displayOrder ?? 0),
          status: banner?.isActive ? 1 : 0,
        },
      })),
    [filteredRows]
  );
  const sortedRows = useMemo(
    () => sortRows(tableRows, sortBy, sortOrder, (row, col) => row._sort?.[col]),
    [tableRows, sortBy, sortOrder]
  );
  const selection = useAdminRowSelection();
  const visibleRowIds = useMemo(() => sortedRows.map(getBannerRowId).filter(Boolean), [sortedRows]);
  const headerCheckbox = selection.getHeaderCheckboxState(visibleRowIds);
  const handleExport = () => {
    const rowsToExport =
      selection.selectedCount > 0
        ? selection.filterSelectedRows(sortedRows, getBannerRowId)
        : sortedRows;
    exportListToCsv({
      filename: `banners-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns: BANNER_EXPORT_COLUMNS,
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
            { label: "Banner Section" },
          ]}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Banner Section
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={() => navigate("/admin/homepage-cms")}>
              Back to CMS
            </Button>
            <Button variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }} onClick={() => navigate("/admin/homepage-cms/create?placement=hero")}>
              Create Hero Banner
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }} onClick={() => navigate("/admin/homepage-cms/create?placement=promo_strip")}>
              Create Stripe Banner
            </Button>
            <Button variant="text" sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }} onClick={loadBanners}>
              Refresh
            </Button>
          </Stack>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <AdminMergedSearchField
            searchOptions={SEARCH_BY_OPTIONS}
            searchTypeInput={searchTypeInput}
            onSearchTypeChange={setSearchTypeInput}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            placeholder={searchPlaceholder}
            sx={{ maxWidth: { sm: 420 }, flex: { sm: "1 1 300px" } }}
          />
          <AdminFilterSelect
            labelId="placement-filter-label"
            label="Placement"
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            options={[
              { value: "", label: "All" },
              { value: "hero", label: "hero" },
              { value: "promo_strip", label: "promo_strip" },
            ]}
          />
        </Stack>
        <AdminActiveFilterChips filters={activeFilters} />
        {feedback.message ? (
          <Alert severity={feedback.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}
        <AdminListSelectionToolbar
          selectedCount={selection.selectedCount}
          totalVisible={sortedRows.length}
          onExport={handleExport}
          onClearSelection={selection.clearSelection}
        />
        <AdminListTable
          columns={BANNER_COLUMNS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          isEmpty={sortedRows.length === 0}
          emptyMessage="No banners found."
          selectable
          allSelected={headerCheckbox.checked}
          indeterminate={headerCheckbox.indeterminate}
          onToggleSelectAll={() => selection.selectAllVisible(visibleRowIds)}
          selectAllDisabled={loading || sortedRows.length === 0}
        >
          {sortedRows.map((row, index) => {
            const rowId = getBannerRowId(row);
            const checked = selection.isSelected(rowId);
            return (
            <TableRow
              key={rowId || `banner-${index}`}
              hover
              selected={checked}
              sx={{ cursor: rowId ? "pointer" : "default" }}
              onClick={() => rowId && navigate(`/admin/homepage-cms/${encodeURIComponent(rowId)}`)}
            >
              <AdminRowSelectCell
                checked={checked}
                disabled={!rowId}
                onChange={() => selection.toggleRow(rowId)}
              />
              <TableCell sx={{ color: "#1f2a24", minWidth: 180 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.title}
                </Typography>
              </TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.createdAt}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.placement}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.displayOrder}</TableCell>
              <TableCell sx={{ color: "#1f2a24" }}>{row.status}</TableCell>
            </TableRow>
            );
          })}
        </AdminListTable>
      </Box>
    </Box>
  );
};

export default AdminBannerList;

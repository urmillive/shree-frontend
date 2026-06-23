import { useMemo } from "react";
import { sortRows } from "../../hooks/useAdminTableSort";

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** First day of current month through today (YYYY-MM-DD for date inputs). */
export function getAnalyticsDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(now),
  };
}

export function useClientPagedSortedRows(rows, { sortBy, sortOrder, getSortValue, page, rowsPerPage, matchesSearch }) {
  const filteredRows = useMemo(() => {
    if (!matchesSearch) return rows;
    return rows.filter(matchesSearch);
  }, [rows, matchesSearch]);

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortBy, sortOrder, getSortValue),
    [filteredRows, sortBy, sortOrder, getSortValue]
  );

  const total = sortedRows.length;

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, page, rowsPerPage]);

  return { sortedRows, paginatedRows, total };
}

export function buildDateFilterChips({ from, to, defaultFrom, defaultTo, onClearFrom, onClearTo }) {
  const chips = [];
  if (from && from !== defaultFrom) {
    chips.push({
      key: "from",
      label: `From: ${from}`,
      onRemove: onClearFrom,
    });
  }
  if (to && to !== defaultTo) {
    chips.push({
      key: "to",
      label: `To: ${to}`,
      onRemove: onClearTo,
    });
  }
  return chips;
}

export function getAnalyticsSortValue(row, key) {
  const v = row?.[key];
  if (v == null || v === "") return "";
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return String(v);
}

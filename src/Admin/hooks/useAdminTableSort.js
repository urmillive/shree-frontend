import { useCallback, useState } from "react";

function compareSortValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const aNum = typeof a === "number" ? a : Number(a);
  const bNum = typeof b === "number" ? b : Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }

  const aDate = a instanceof Date ? a : new Date(a);
  const bDate = b instanceof Date ? b : new Date(b);
  if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
    return aDate.getTime() - bDate.getTime();
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function sortRows(rows, sortBy, sortOrder, getValue) {
  if (!sortBy || !Array.isArray(rows)) return rows ?? [];
  const direction = sortOrder === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = getValue ? getValue(left, sortBy) : left?.[sortBy];
    const b = getValue ? getValue(right, sortBy) : right?.[sortBy];
    return compareSortValues(a, b) * direction;
  });
}

export function useAdminTableSort({ defaultSortBy = "", defaultSortOrder = "desc" } = {}) {
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  const handleSort = useCallback(
    (columnId) => {
      if (!columnId) return;
      if (sortBy === columnId) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(columnId);
        setSortOrder("asc");
      }
    },
    [sortBy]
  );

  return {
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    handleSort,
    sortRows: (rows, getValue) => sortRows(rows, sortBy, sortOrder, getValue),
  };
}

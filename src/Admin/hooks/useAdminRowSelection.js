import { useCallback, useMemo, useState } from "react";

export function useAdminRowSelection() {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const selectedCount = selectedIds.size;

  const isSelected = useCallback((id) => {
    if (id == null || id === "") return false;
    return selectedIds.has(String(id));
  }, [selectedIds]);

  const toggleRow = useCallback((id) => {
    if (id == null || id === "") return;
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAllVisible = useCallback((visibleIds = []) => {
    const ids = visibleIds.map((id) => String(id)).filter(Boolean);
    if (!ids.length) return;

    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const getHeaderCheckboxState = useCallback(
    (visibleIds = []) => {
      const ids = visibleIds.map((id) => String(id)).filter(Boolean);
      if (!ids.length) return { checked: false, indeterminate: false };

      const selectedOnPage = ids.filter((id) => selectedIds.has(id)).length;
      return {
        checked: selectedOnPage === ids.length,
        indeterminate: selectedOnPage > 0 && selectedOnPage < ids.length,
      };
    },
    [selectedIds]
  );

  const filterSelectedRows = useCallback(
    (rows, getRowId) => {
      if (!selectedCount) return rows;
      return rows.filter((row) => {
        const id = getRowId(row);
        return id != null && id !== "" && selectedIds.has(String(id));
      });
    },
    [selectedCount, selectedIds]
  );

  const pruneSelection = useCallback((visibleIds = []) => {
    const allowed = new Set(visibleIds.map((id) => String(id)).filter(Boolean));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, []);

  return useMemo(
    () => ({
      selectedIds,
      selectedCount,
      isSelected,
      toggleRow,
      clearSelection,
      selectAllVisible,
      getHeaderCheckboxState,
      filterSelectedRows,
      pruneSelection,
    }),
    [
      selectedIds,
      selectedCount,
      isSelected,
      toggleRow,
      clearSelection,
      selectAllVisible,
      getHeaderCheckboxState,
      filterSelectedRows,
      pruneSelection,
    ]
  );
}

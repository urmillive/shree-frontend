import { useCallback, useMemo, useState } from "react";

export function useAdminMergedSearch({ defaultSearchType = "", searchOptions = [], onApply } = {}) {
  const [searchTypeInput, setSearchTypeInput] = useState(defaultSearchType);
  const [searchTypeApplied, setSearchTypeApplied] = useState(defaultSearchType);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  const handleSearch = useCallback(() => {
    setSearchTypeApplied(searchTypeInput);
    setSearchApplied(searchInput.trim());
    onApply?.();
  }, [searchTypeInput, searchInput, onApply]);

  const resetSearch = useCallback(
    (nextType = defaultSearchType) => {
      setSearchInput("");
      setSearchApplied("");
      setSearchTypeInput(nextType);
      setSearchTypeApplied(nextType);
    },
    [defaultSearchType]
  );

  const searchPlaceholder = useMemo(
    () => searchOptions.find((o) => o.value === searchTypeInput)?.placeholder ?? "Enter search value",
    [searchOptions, searchTypeInput]
  );

  const getSearchChip = useCallback(
    (onRemoveExtra) => {
      const trimmedSearch = searchApplied.trim();
      if (!trimmedSearch) return null;
      const searchLabel = searchOptions.find((o) => o.value === searchTypeApplied)?.label ?? "Search";
      return {
        key: "search",
        label: `${searchLabel}: ${trimmedSearch}`,
        onRemove: () => {
          resetSearch(defaultSearchType);
          onRemoveExtra?.();
        },
      };
    },
    [searchApplied, searchTypeApplied, searchOptions, resetSearch, defaultSearchType]
  );

  return {
    searchTypeInput,
    setSearchTypeInput,
    searchTypeApplied,
    searchInput,
    setSearchInput,
    searchApplied,
    handleSearch,
    getSearchChip,
    searchPlaceholder,
    resetSearch,
  };
}

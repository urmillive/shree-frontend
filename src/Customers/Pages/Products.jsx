import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { FiX } from "react-icons/fi";
import { alpha } from "@mui/material/styles";
import ProductCard from "../components/ProductCard";
import { colors } from "../../theme/theme";
import {
  fetchPublicCategoryTree,
  flattenPublicCategoryTree,
  getPublicCategorySlug,
  normalizePublicCategoryTreePayload,
} from "../services/publicCategoriesService";
import { getApiErrorMessage } from "../../utils/apiError";
import { fetchPublicProducts, normalizeProductsPayload } from "../services/publicProductsService";

const LIMIT = 12;

const sortOptions = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Popularity" },
];

const flagOptions = [
  { value: "isTrending", label: "Trending" },
  { value: "isFeatured", label: "Featured" },
];

const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL"];

const fabricOptions = ["Cotton", "Linen", "Silk", "Organic Cotton", "Other"];

const filterClearIconSx = {
  flexShrink: 0,
  alignSelf: "flex-start",
  mt: "2px",
  color: alpha(colors.text, 0.55),
  "&:hover": { color: colors.text, bgcolor: alpha(colors.text, 0.06) },
};

/**
 * Shared filter fields — stacked full-width on phone (drawer), grid on desktop.
 * Each active filter shows a clear (×) on the same row as the dropdown / field.
 */
function ProductFilterInputs({
  variant,
  category,
  fabric,
  size,
  sort,
  minPrice,
  maxPrice,
  categoryOptions,
  categoriesLoading,
  selectedCategoryLabel,
  updateFilter,
  onCategoryChange,
  setFabric,
  setSize,
  setSort,
  setMinPrice,
  setMaxPrice,
}) {
  const isMobileLayout = variant === "mobile";

  const categorySelect = (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={0.5}
      sx={
        !isMobileLayout
          ? {
              width: "100%",
              minWidth: 0,
              gridColumn: { xs: "span 2", sm: "span 2", md: "span 1" },
            }
          : { width: "100%", minWidth: 0 }
      }
    >
      <FormControl fullWidth size="small" sx={{ flex: 1, minWidth: 0 }}>
        <InputLabel id="products-filter-category" shrink>
          Category
        </InputLabel>
        <Select
          labelId="products-filter-category"
          label="Category"
          value={category}
          disabled={categoriesLoading}
          displayEmpty
          onChange={(e) => onCategoryChange(e.target.value)}
          MenuProps={{ PaperProps: { sx: { maxHeight: isMobileLayout ? "50dvh" : 320 } } }}
          renderValue={(val) => {
            if (categoriesLoading) {
              return (
                <Typography variant="body2" sx={{ color: alpha(colors.text, 0.5) }}>
                  Loading…
                </Typography>
              );
            }
            if (!val) {
              return (
                <Typography variant="body2" sx={{ color: alpha(colors.text, 0.45) }}>
                  All categories
                </Typography>
              );
            }
            return (
              <Typography variant="body2" component="span" noWrap title={selectedCategoryLabel}>
                {selectedCategoryLabel}
              </Typography>
            );
          }}
        >
          <MenuItem value="">
            <em>All categories</em>
          </MenuItem>
          {categoryOptions.map(({ slug, label }) => (
            <MenuItem key={slug} value={slug} title={label}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {category && !categoriesLoading ? (
        <IconButton size="small" aria-label="Clear category filter" onClick={() => onCategoryChange("")} sx={filterClearIconSx}>
          <FiX size={18} />
        </IconButton>
      ) : null}
    </Stack>
  );

  const fabricSelect = (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={0.5}
      sx={
        !isMobileLayout
          ? {
              width: "100%",
              minWidth: 0,
              gridColumn: { xs: "span 2", sm: "span 1", md: "auto" },
            }
          : { width: "100%", minWidth: 0 }
      }
    >
      <FormControl fullWidth size="small" sx={{ flex: 1, minWidth: 0 }}>
        <InputLabel id="products-filter-fabric" shrink>
          Fabric
        </InputLabel>
        <Select labelId="products-filter-fabric" label="Fabric" value={fabric} onChange={(e) => updateFilter(setFabric, e.target.value)}>
          <MenuItem value="">
            <em>All fabrics</em>
          </MenuItem>
          {fabricOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {fabric ? (
        <IconButton size="small" aria-label="Clear fabric filter" onClick={() => updateFilter(setFabric, "")} sx={filterClearIconSx}>
          <FiX size={18} />
        </IconButton>
      ) : null}
    </Stack>
  );

  const sizeSelect = (
    <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ width: "100%", minWidth: 0 }}>
      <FormControl fullWidth size="small" sx={{ flex: 1, minWidth: 0 }}>
        <InputLabel id="products-filter-size" shrink>
          Size
        </InputLabel>
        <Select labelId="products-filter-size" label="Size" value={size} onChange={(e) => updateFilter(setSize, e.target.value)}>
          <MenuItem value="">
            <em>All sizes</em>
          </MenuItem>
          {sizeOptions.map((sizeValue) => (
            <MenuItem key={sizeValue} value={sizeValue}>
              {sizeValue}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {size ? (
        <IconButton size="small" aria-label="Clear size filter" onClick={() => updateFilter(setSize, "")} sx={filterClearIconSx}>
          <FiX size={18} />
        </IconButton>
      ) : null}
    </Stack>
  );

  const priceRow = (
    <Stack direction="row" spacing={1.25} sx={{ width: "100%" }}>
      <TextField
        fullWidth
        size="small"
        label="Min price"
        value={minPrice}
        onChange={(e) => updateFilter(setMinPrice, e.target.value)}
        type="number"
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0, inputMode: "decimal" }}
        InputProps={{
          endAdornment:
            String(minPrice ?? "").trim() !== "" ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear minimum price"
                  edge="end"
                  onClick={() => updateFilter(setMinPrice, "")}
                  sx={{ color: alpha(colors.text, 0.55) }}
                >
                  <FiX size={18} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
        }}
      />
      <TextField
        fullWidth
        size="small"
        label="Max price"
        value={maxPrice}
        onChange={(e) => updateFilter(setMaxPrice, e.target.value)}
        type="number"
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0, inputMode: "decimal" }}
        InputProps={{
          endAdornment:
            String(maxPrice ?? "").trim() !== "" ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear maximum price"
                  edge="end"
                  onClick={() => updateFilter(setMaxPrice, "")}
                  sx={{ color: alpha(colors.text, 0.55) }}
                >
                  <FiX size={18} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
        }}
      />
    </Stack>
  );

  const minMaxGrid = (
    <>
      <TextField
        fullWidth
        size="small"
        label="Min"
        value={minPrice}
        onChange={(e) => updateFilter(setMinPrice, e.target.value)}
        type="number"
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0, inputMode: "decimal" }}
        InputProps={{
          endAdornment:
            String(minPrice ?? "").trim() !== "" ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear minimum price"
                  edge="end"
                  onClick={() => updateFilter(setMinPrice, "")}
                  sx={{ color: alpha(colors.text, 0.55) }}
                >
                  <FiX size={18} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
        }}
      />
      <TextField
        fullWidth
        size="small"
        label="Max"
        value={maxPrice}
        onChange={(e) => updateFilter(setMaxPrice, e.target.value)}
        type="number"
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: 0, inputMode: "decimal" }}
        InputProps={{
          endAdornment:
            String(maxPrice ?? "").trim() !== "" ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear maximum price"
                  edge="end"
                  onClick={() => updateFilter(setMaxPrice, "")}
                  sx={{ color: alpha(colors.text, 0.55) }}
                >
                  <FiX size={18} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
        }}
      />
    </>
  );

  const sortSelect = (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={0.5}
      sx={
        !isMobileLayout
          ? {
              width: "100%",
              minWidth: 0,
              gridColumn: { xs: "span 2", sm: "span 2", md: "auto" },
            }
          : { width: "100%", minWidth: 0 }
      }
    >
      <FormControl fullWidth size="small" sx={{ flex: 1, minWidth: 0 }}>
        <InputLabel id="products-filter-sort" shrink>
          Sort
        </InputLabel>
        <Select labelId="products-filter-sort" label="Sort" value={sort} onChange={(e) => updateFilter(setSort, e.target.value)}>
          {sortOptions.map((opt) => (
            <MenuItem key={opt.value || "default"} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {sort ? (
        <IconButton size="small" aria-label="Clear sort" onClick={() => updateFilter(setSort, "")} sx={filterClearIconSx}>
          <FiX size={18} />
        </IconButton>
      ) : null}
    </Stack>
  );

  if (isMobileLayout) {
    return (
      <Stack spacing={2.25} sx={{ width: "100%" }}>
        {categorySelect}
        {fabricSelect}
        {sizeSelect}
        {priceRow}
        {sortSelect}
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr 1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 0.75fr) minmax(0, 0.65fr) minmax(0, 0.65fr) minmax(0, 1fr)",
        },
        gap: { xs: 1, sm: 1.1 },
        alignItems: "flex-start",
      }}
    >
      {categorySelect}
      {fabricSelect}
      {sizeSelect}
      {minMaxGrid}
      {sortSelect}
    </Box>
  );
}

const renderSkeletonCards = () =>
  Array.from({ length: 8 }).map((_, idx) => (
    <Grid key={idx} size={{ xs: 6, sm: 6, md: 4, lg: 3 }}>
      <Skeleton variant="rounded" height={360} />
    </Grid>
  ));

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category") ?? "";

  const theme = useTheme();
  const isMobileLayout = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [category, setCategory] = useState(categoryFromUrl);
  const [fabric, setFabric] = useState("");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    let cancelled = false;

    setCategoriesLoading(true);
    fetchPublicCategoryTree()
      .then((res) => {
        if (cancelled) return;
        const tree = normalizePublicCategoryTreePayload(res?.data);
        const flattened = flattenPublicCategoryTree(tree);
        const bySlug = new Map();
        for (const { node, trail } of flattened) {
          const slug = getPublicCategorySlug(node);
          if (!slug || bySlug.has(slug)) continue;
          bySlug.set(slug, { slug, label: trail.filter(Boolean).join(" › ") || slug });
        }
        setCategoryOptions([...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })));
      })
      .catch(() => {
        if (!cancelled) setCategoryOptions([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCategory(categoryFromUrl);
    setPage(1);
  }, [categoryFromUrl]);

  const selectedCategoryLabel = useMemo(() => {
    if (!category) return "";
    return categoryOptions.find((o) => o.slug === category)?.label || category;
  }, [category, categoryOptions]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (category) n += 1;
    if (fabric) n += 1;
    if (size) n += 1;
    if (sort) n += 1;
    if (String(minPrice ?? "").trim() !== "") n += 1;
    if (String(maxPrice ?? "").trim() !== "") n += 1;
    n += flags.length;
    return n;
  }, [category, fabric, size, sort, minPrice, maxPrice, flags]);

  const query = useMemo(
    () => ({
      page,
      limit: LIMIT,
      category,
      fabric,
      size,
      minPrice,
      maxPrice,
      sort,
      flags: flags.length > 0 ? flags.join(",") : "",
    }),
    [page, category, fabric, size, minPrice, maxPrice, sort, flags]
  );

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchPublicProducts(query);
        if (cancelled) return;
        const normalized = normalizeProductsPayload(response?.data);
        setProducts(normalized.products);
        setPage(normalized.page || 1);
        setTotalPages(normalized.totalPages || 1);
        setTotalProducts(normalized.total || normalized.products.length);
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Unable to load products."));
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const updateFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const applyCategoryFilter = useCallback(
    (nextSlug) => {
      const value = String(nextSlug ?? "").trim();
      setCategory(value);
      setPage(1);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set("category", value);
          else next.delete("category");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const toggleFlag = (flagValue) => {
    setFlags((prev) => {
      const hasFlag = prev.includes(flagValue);
      const next = hasFlag ? prev.filter((item) => item !== flagValue) : [...prev, flagValue];
      return next;
    });
    setPage(1);
  };

  const removeFlag = (flagValue) => {
    setFlags((prev) => prev.filter((item) => item !== flagValue));
    setPage(1);
  };

  const clearAll = () => {
    applyCategoryFilter("");
    setFabric("");
    setSize("");
    setSort("");
    setMinPrice("");
    setMaxPrice("");
    setFlags([]);
    setPage(1);
  };

  return (
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="xl">
        <Stack spacing={1}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.4 }}>
              All Products
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(colors.text, 0.65), mt: 0.5 }}>
              Explore trending and featured products with smart filters
              {!loading && !error && totalProducts > 0 ? ` · ${totalProducts} products` : ""}
              {!loading && !error && category
                ? ` · Category filter: ${selectedCategoryLabel || category}`
                : ""}.
            </Typography>
          </Box>

          {isMobileLayout ? (
            <>
              <Paper
                elevation={0}
                // sx={{
                //   overflow: "hidden",
                //   borderRadius: 2,
                //   border: `1px solid ${alpha(colors.text, 0.1)}`,
                //   background: `linear-gradient(118deg, ${primaryAlpha(0.14)} 0%, ${colors.background} 52%, ${alpha(colors.text, 0.02)} 100%)`,
                //   p: 1.5,
                // }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 800, letterSpacing: 1, color: colors.primary, textTransform: "uppercase", display: "block" }}
                    >
                      Filters
                    </Typography>
                    {/* <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.35 }} noWrap>
                      {activeFilterCount === 0
                        ? "All products — tap to refine"
                        : `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`}
                    </Typography> */}
                  </Box>
                  <Badge
                    overlap="circular"
                    badgeContent={activeFilterCount}
                    invisible={activeFilterCount === 0}
                    sx={{
                      flexShrink: 0,
                      "& .MuiBadge-badge": {
                        fontWeight: 800,
                        bgcolor: colors.primary,
                        color: colors.onPrimary,
                      },
                    }}
                  >
                    <Button
                      variant="text"
                      disableElevation
                      onClick={() => setMobileFiltersOpen(true)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 2,
                        px: 2.25,
                        py: 1.15,
                      }}
                    >
                      Add Filter
                    </Button>
               
                  </Badge>
                </Stack>
              </Paper>

              <Drawer
                anchor="bottom"
                open={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                slotProps={{ backdrop: { sx: { backdropFilter: "blur(3px)" } } }}
                ModalProps={{ keepMounted: false }}
                PaperProps={{
                  sx: {
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    maxHeight: "min(92dvh, 720px)",
                    bgcolor: colors.background,
                    pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
                    display: "flex",
                    flexDirection: "column",
                  },
                }}
              >
                <Stack sx={{ flex: 1, minHeight: 0, maxHeight: "inherit", display: "flex", flexDirection: "column" }}>
                  <Box sx={{ px: 2.25, pt: 1.5, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 4,
                        bgcolor: alpha(colors.text, 0.12),
                        borderRadius: 2,
                        mx: "auto",
                        mb: 1.25,
                      }}
                    />
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.35 }}>
                        Refine products
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setMobileFiltersOpen(false)}
                        sx={{ textTransform: "none", fontWeight: 600, color: alpha(colors.text, 0.65) }}
                      >
                        Close
                      </Button>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      WebkitOverflowScrolling: "touch",
                      px: 2.25,
                      pb: 1,
                    }}
                  >
                    <ProductFilterInputs
                      variant="mobile"
                      category={category}
                      fabric={fabric}
                      size={size}
                      sort={sort}
                      minPrice={minPrice}
                      maxPrice={maxPrice}
                      categoryOptions={categoryOptions}
                      categoriesLoading={categoriesLoading}
                      selectedCategoryLabel={selectedCategoryLabel}
                      updateFilter={updateFilter}
                      onCategoryChange={applyCategoryFilter}
                      setFabric={setFabric}
                      setSize={setSize}
                      setSort={setSort}
                      setMinPrice={setMinPrice}
                      setMaxPrice={setMaxPrice}
                    />

                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 2.5,
                        mb: 1,
                        fontWeight: 800,
                        letterSpacing: 1.1,
                        color: alpha(colors.text, 0.48),
                      }}
                    >
                      QUICK TAGS
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pb: 0.5 }} alignItems="center">
                      {flagOptions.map((flag) => {
                        const active = flags.includes(flag.value);
                        return (
                          <Stack key={flag.value} direction="row" alignItems="center" spacing={0} sx={{ flexShrink: 0 }}>
                            <Button
                              size="medium"
                              variant={active ? "contained" : "outlined"}
                              onClick={() => toggleFlag(flag.value)}
                              sx={{
                                textTransform: "none",
                                minHeight: 40,
                                px: 1.75,
                                borderRadius: 999,
                                fontWeight: 600,
                                ...(active
                                  ? {
                                      bgcolor: colors.buttonBackground,
                                      color: colors.buttonText,
                                      "&:hover": { bgcolor: colors.buttonBackground },
                                    }
                                  : { borderColor: alpha(colors.text, 0.16) }),
                              }}
                            >
                              {flag.label}
                            </Button>
                            {active ? (
                              <IconButton
                                size="small"
                                aria-label={`Remove ${flag.label} filter`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFlag(flag.value);
                                }}
                                sx={{ ml: 0.25, color: alpha(colors.text, 0.55) }}
                              >
                                <FiX size={18} />
                              </IconButton>
                            ) : null}
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      flexShrink: 0,
                      px: 2.25,
                      pt: 2,
                      pb: 0.25,
                      borderTop: `1px solid ${alpha(colors.text, 0.08)}`,
                      display: "flex",
                      gap: 1.25,
                      bgcolor: alpha(colors.text, 0.02),
                    }}
                  >
                    <Button fullWidth variant="outlined" onClick={clearAll} sx={{ textTransform: "none", fontWeight: 600, py: 1.2 }}>
                      Reset all
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      disableElevation
                      onClick={() => setMobileFiltersOpen(false)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        py: 1.2,
                        bgcolor: colors.buttonBackground,
                        color: colors.buttonText,
                        "&:hover": { bgcolor: colors.buttonBackground, filter: "brightness(0.96)" },
                      }}
                    >
                      View results
                    </Button>
                  </Box>
                </Stack>
              </Drawer>
            </>
          ) : (
            <Paper
              elevation={0}
              // sx={{
              //   overflow: "hidden",
              //   borderRadius: 2,
              //   border: `1px solid ${alpha(colors.text, 0.08)}`,
              //   background: `linear-gradient(145deg, ${primaryAlpha(0.07)} 0%, ${alpha(colors.text, 0.02)} 48%, ${colors.background} 100%)`,
              // }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1.75} sx={{ p: 1.5, pb: 1.25 }}>
                {/* <Box sx={{ flexShrink: 0, minWidth: 100, pt: 0.5 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 800, letterSpacing: 1.2, color: colors.primary, lineHeight: 1.2, display: "block" }}
                  >
                    Refine
                  </Typography>
                  <Typography variant="caption" sx={{ color: alpha(colors.text, 0.52), display: "block", mt: 0.25 }}>
                    Narrow your search
                  </Typography>
                </Box> */}

                <ProductFilterInputs
                  variant="desktop"
                  category={category}
                  fabric={fabric}
                  size={size}
                  sort={sort}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  categoryOptions={categoryOptions}
                  categoriesLoading={categoriesLoading}
                  selectedCategoryLabel={selectedCategoryLabel}
                  updateFilter={updateFilter}
                  onCategoryChange={applyCategoryFilter}
                  setFabric={setFabric}
                  setSize={setSize}
                  setSort={setSort}
                  setMinPrice={setMinPrice}
                  setMaxPrice={setMaxPrice}
                />
              </Stack>

              <Box sx={{ px: 1.5, pb: 1.25, pt: 0, borderTop: `1px solid ${alpha(colors.text, 0.06)}` }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                  {flagOptions.map((flag) => {
                    const active = flags.includes(flag.value);
                    return (
                      <Stack key={flag.value} direction="row" alignItems="center" spacing={0} sx={{ flexShrink: 0 }}>
                        <Button
                          size="small"
                          variant={active ? "contained" : "outlined"}
                          onClick={() => toggleFlag(flag.value)}
                          sx={{
                            textTransform: "none",
                            minHeight: 30,
                            px: 1.25,
                            py: 0.25,
                            borderRadius: 999,
                            fontSize: "0.8125rem",
                            ...(active
                              ? {
                                  bgcolor: colors.buttonBackground,
                                  color: colors.buttonText,
                                  "&:hover": { bgcolor: colors.buttonBackground },
                                }
                              : { borderColor: alpha(colors.text, 0.18) }),
                          }}
                        >
                          {flag.label}
                        </Button>
                        {active ? (
                          <IconButton
                            size="small"
                            aria-label={`Remove ${flag.label} filter`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFlag(flag.value);
                            }}
                            sx={{ ml: 0.25, color: alpha(colors.text, 0.55) }}
                          >
                            <FiX size={16} />
                          </IconButton>
                        ) : null}
                      </Stack>
                    );
                  })}
                  <Button
                    size="small"
                    onClick={clearAll}
                    sx={{ textTransform: "none", minHeight: 30, color: alpha(colors.text, 0.65) }}
                  >
                    Reset
                  </Button>
                </Stack>
              </Box>
            </Paper>
          )}

          {error ? <Alert severity="error">{error}</Alert> : null}

         
          <Grid container spacing={2}>
            {loading
              ? renderSkeletonCards()
              : products.map((product) => (
                  <Grid key={product?._id || product?.id || product?.slug || product?.name} size={{ xs: 6, sm: 6, md: 4, lg: 3 }}>
                    <ProductCard product={product} quickActions />
                  </Grid>
                ))}
          </Grid>

          {!loading && products.length === 0 && !error ? (
            <Typography variant="body1" sx={{ color: alpha(colors.text, 0.7) }}>
              No products matched the selected filters.
            </Typography>
          ) : null}

          <Stack alignItems="center" sx={{ pt: 1 }}>
            <Pagination
              page={page}
              count={Math.max(totalPages, 1)}
              onChange={(_, nextPage) => setPage(nextPage)}
              color="primary"
              shape="rounded"
              size={isMobileLayout ? "small" : "medium"}
              siblingCount={isMobileLayout ? 0 : 1}
              boundaryCount={isMobileLayout ? 1 : 1}
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

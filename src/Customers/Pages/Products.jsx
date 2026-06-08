import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Container,
  FormControl,
  Grid,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ProductCard from "../components/ProductCard";
import { colors, fonts } from "../../theme/theme";
import {
  fetchPublicCategoryTree,
  flattenPublicCategoryTree,
} from "../services/publicCategoriesService";
import {
  fetchPublicProducts,
  normalizeProductsPayload,
} from "../services/publicProductsService";

const LIMIT = 12;

const sortOptions = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Loved" },
];

const flagOptions = [
  { value: "isTrending", label: "Trending" },
  { value: "isFeatured", label: "Featured" },
];

const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL"];

const sectionLabelSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.ink,
  mb: 1.5,
  display: "block",
};

const filterChipSx = (active) => ({
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 500,
  cursor: "pointer",
  border: `1px solid ${active ? colors.ink : colors.line}`,
  bgcolor: active ? colors.ink : "transparent",
  color: active ? colors.ivory : colors.ink,
  px: 1.5,
  py: 0.85,
  transition: "all 200ms cubic-bezier(0.2,0.7,0.2,1)",
  "&:hover": {
    borderColor: colors.ink,
    bgcolor: active ? colors.ink : colors.mutedSurface,
  },
});

const renderSkeletonCards = () =>
  Array.from({ length: 8 }).map((_, idx) => (
    <Grid key={idx} size={{ xs: 6, sm: 6, md: 4, lg: 3 }}>
      <Skeleton
        variant="rectangular"
        sx={{
          aspectRatio: "3 / 4",
          borderRadius: 0,
          bgcolor: colors.stone,
        }}
      />
      <Skeleton sx={{ mt: 1.5, bgcolor: colors.stone }} width="60%" />
      <Skeleton sx={{ bgcolor: colors.stone }} width="30%" />
    </Grid>
  ));

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [fabric, setFabric] = useState("");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchPublicCategoryTree()
      .then((res) => {
        if (cancelled) return;
        const flattened = flattenPublicCategoryTree(
          res?.data?.data || res?.data || []
        );
        const slugs = flattened
          .map((item) => item?.node?.slug)
          .filter((slug) => slug != null && String(slug).trim() !== "");
        setCategories([...new Set(slugs)]);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        setError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "Unable to load products."
        );
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

  const toggleFlag = (flagValue) => {
    setFlags((prev) => {
      const hasFlag = prev.includes(flagValue);
      return hasFlag
        ? prev.filter((item) => item !== flagValue)
        : [...prev, flagValue];
    });
    setPage(1);
  };

  const clearAll = () => {
    setCategory("");
    setFabric("");
    setSize("");
    setSort("");
    setMinPrice("");
    setMaxPrice("");
    setFlags([]);
    setPage(1);
  };

  const sidebar = (
    <Stack spacing={4.5} sx={{ pr: { md: 4 } }}>
      <Box>
        <Typography sx={sectionLabelSx}>Category</Typography>
        <FormControl fullWidth size="small">
          <Select
            value={category}
            displayEmpty
            onChange={(e) => updateFilter(setCategory, e.target.value)}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((slug) => (
              <MenuItem key={slug} value={slug}>
                {slug}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography sx={sectionLabelSx}>Fabric</Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="e.g. Cotton, Silk"
          value={fabric}
          onChange={(e) => updateFilter(setFabric, e.target.value)}
        />
      </Box>

      <Box>
        <Typography sx={sectionLabelSx}>Size</Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
          <Box
            onClick={() => updateFilter(setSize, "")}
            sx={filterChipSx(size === "")}
          >
            All
          </Box>
          {sizeOptions.map((s) => (
            <Box
              key={s}
              onClick={() => updateFilter(setSize, s)}
              sx={filterChipSx(size === s)}
            >
              {s}
            </Box>
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography sx={sectionLabelSx}>Price ₹</Typography>
        <Stack direction="row" spacing={1.5}>
          <TextField
            size="small"
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => updateFilter(setMinPrice, e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => updateFilter(setMaxPrice, e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ flex: 1 }}
          />
        </Stack>
      </Box>

      <Box>
        <Typography sx={sectionLabelSx}>Highlights</Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
          {flagOptions.map((flag) => (
            <Box
              key={flag.value}
              onClick={() => toggleFlag(flag.value)}
              sx={filterChipSx(flags.includes(flag.value))}
            >
              {flag.label}
            </Box>
          ))}
        </Stack>
      </Box>

      <Box
        component="button"
        type="button"
        onClick={clearAll}
        sx={{
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: fonts.body,
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: colors.muted,
          borderBottom: `1px solid ${colors.muted}`,
          alignSelf: "flex-start",
          pb: 0.5,
          width: "fit-content",
          transition: "color 200ms",
          "&:hover": {
            color: colors.wine,
            borderBottomColor: colors.wine,
          },
        }}
      >
        Reset filters
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1440, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        {/* Editorial header */}
        <Stack
          spacing={1.5}
          sx={{ mb: { xs: 5, sm: 7 }, textAlign: "center" }}
        >
          <Typography sx={sectionLabelSx}>The Shop</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 36, sm: 56 },
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
              color: colors.ink,
            }}
          >
            All pieces
          </Typography>
          <Typography
            sx={{
              color: colors.muted,
              fontSize: 13.5,
              maxWidth: 480,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            Browse the full collection. Filter by fabric, size, and price.
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 0, md: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Box
              sx={{
                position: { md: "sticky" },
                top: { md: 120 },
                mb: { xs: 4, md: 0 },
                pb: { xs: 4, md: 0 },
                borderBottom: {
                  xs: `1px solid ${colors.line}`,
                  md: "none",
                },
              }}
            >
              {sidebar}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 9 }}>
            {/* Sort + count bar */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              sx={{ mb: 3.5 }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  color: colors.muted,
                }}
              >
                {loading
                  ? "Loading…"
                  : `${totalProducts} ${totalProducts === 1 ? "piece" : "pieces"}`}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Sort</Typography>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <Select
                    value={sort}
                    onChange={(e) => updateFilter(setSort, e.target.value)}
                  >
                    {sortOptions.map((opt) => (
                      <MenuItem key={opt.value || "default"} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Stack>

            {error ? (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 0, border: `1px solid ${colors.danger}` }}
              >
                {error}
              </Alert>
            ) : null}

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {loading
                ? renderSkeletonCards()
                : products.map((product) => (
                    <Grid
                      key={
                        product?._id ||
                        product?.id ||
                        product?.slug ||
                        product?.name
                      }
                      size={{ xs: 6, sm: 6, md: 4, lg: 3 }}
                    >
                      <ProductCard product={product} />
                    </Grid>
                  ))}
            </Grid>

            {!loading && products.length === 0 && !error ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: 24,
                    color: colors.ink,
                    mb: 1,
                  }}
                >
                  Nothing here yet
                </Typography>
                <Typography sx={{ color: colors.muted, fontSize: 14 }}>
                  No pieces matched your filters. Try resetting.
                </Typography>
              </Box>
            ) : null}

            {totalPages > 1 ? (
              <Stack alignItems="center" sx={{ pt: 6 }}>
                <Pagination
                  page={page}
                  count={Math.max(totalPages, 1)}
                  onChange={(_, nextPage) => setPage(nextPage)}
                  shape="rounded"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      fontFamily: fonts.body,
                      fontSize: 12,
                      letterSpacing: "0.1em",
                      color: colors.ink,
                      borderRadius: 0,
                      "&.Mui-selected": {
                        bgcolor: colors.ink,
                        color: colors.ivory,
                        "&:hover": { bgcolor: colors.ink },
                      },
                    },
                  }}
                />
              </Stack>
            ) : null}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

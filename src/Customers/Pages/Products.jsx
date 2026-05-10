import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ProductCard from "../components/ProductCard";
import { colors } from "../../theme/theme";
import { fetchPublicCategoryTree, flattenPublicCategoryTree } from "../services/publicCategoriesService";
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

const renderSkeletonCards = () =>
  Array.from({ length: 8 }).map((_, idx) => (
    <Grid key={idx} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
      <Skeleton variant="rounded" height={360} />
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
        const flattened = flattenPublicCategoryTree(res?.data?.data || res?.data || []);
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
        setError(err?.response?.data?.message || err?.message || "Unable to load products.");
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
      const next = hasFlag ? prev.filter((item) => item !== flagValue) : [...prev, flagValue];
      return next;
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

  return (
    <Box sx={{ py: { xs: 2.5, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="xl">
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.4 }}>
              All Products
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(colors.text, 0.65), mt: 0.5 }}>
              Explore trending and featured products with smart filters.
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(colors.text, 0.12)}` }}>
            <Grid container spacing={1.4}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select value={category} label="Category" onChange={(e) => updateFilter(setCategory, e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {categories.map((slug) => (
                      <MenuItem key={slug} value={slug}>
                        {slug}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Fabric"
                  value={fabric}
                  onChange={(e) => updateFilter(setFabric, e.target.value)}
                  placeholder="Cotton"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Size</InputLabel>
                  <Select value={size} label="Size" onChange={(e) => updateFilter(setSize, e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {sizeOptions.map((sizeValue) => (
                      <MenuItem key={sizeValue} value={sizeValue}>
                        {sizeValue}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Min"
                  value={minPrice}
                  onChange={(e) => updateFilter(setMinPrice, e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Max"
                  value={maxPrice}
                  onChange={(e) => updateFilter(setMaxPrice, e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort</InputLabel>
                  <Select value={sort} label="Sort" onChange={(e) => updateFilter(setSort, e.target.value)}>
                    {sortOptions.map((opt) => (
                      <MenuItem key={opt.value || "default"} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {flagOptions.map((flag) => {
                const active = flags.includes(flag.value);
                return (
                  <Button
                    key={flag.value}
                    size="small"
                    variant={active ? "contained" : "outlined"}
                    onClick={() => toggleFlag(flag.value)}
                    sx={{
                      textTransform: "none",
                      ...(active
                        ? { bgcolor: colors.buttonBackground, color: colors.buttonText, "&:hover": { bgcolor: colors.buttonBackground } }
                        : {}),
                    }}
                  >
                    {flag.label}
                  </Button>
                );
              })}
              <Button size="small" onClick={clearAll} sx={{ textTransform: "none" }}>
                Clear all
              </Button>
            </Stack>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
            <Typography variant="body2" sx={{ color: alpha(colors.text, 0.66) }}>
              {loading ? "Loading products..." : `${totalProducts} products found`}
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            {loading
              ? renderSkeletonCards()
              : products.map((product) => (
                  <Grid key={product?._id || product?.id || product?.slug || product?.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <ProductCard product={product} />
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
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

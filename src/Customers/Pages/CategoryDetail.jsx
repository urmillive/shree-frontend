import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Pagination,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import CategoryBreadcrumb from "../components/CategoryBreadcrumb";
import ProductCard from "../components/ProductCard";
import {
  fetchPublicCategoryBySlug,
  fetchPublicCategoryChildren,
  getPublicCategoryName,
  getPublicCategorySlug,
  normalizePublicCategoryChildrenPayload,
  normalizePublicCategoryDetailPayload,
} from "../services/publicCategoriesService";
import {
  fetchPublicProducts,
  normalizeProductsPayload,
} from "../services/publicProductsService";
import { colors, fonts } from "../../theme/theme";

const PRODUCTS_LIMIT = 12;

const renderProductSkeletons = () =>
  Array.from({ length: 8 }).map((_, idx) => (
    <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={idx}>
      <Skeleton
        variant="rectangular"
        sx={{ aspectRatio: "3 / 4", borderRadius: 0, bgcolor: colors.stone }}
      />
      <Skeleton sx={{ mt: 1.5, bgcolor: colors.stone }} width="60%" />
      <Skeleton sx={{ bgcolor: colors.stone }} width="30%" />
    </Grid>
  ));

const CategoryDetail = () => {
  const { slug: slugParam = "" } = useParams();
  const slug = String(slugParam || "").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [children, setChildren] = useState([]);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const load = useCallback(async () => {
    if (!slug) {
      setError("Missing category.");
      setCategory(null);
      setBreadcrumb([]);
      setChildren([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setCategory(null);
    setBreadcrumb([]);
    setChildren([]);
    try {
      const [detailRes, childrenRes] = await Promise.all([
        fetchPublicCategoryBySlug(slug),
        fetchPublicCategoryChildren(slug).catch(() => ({ data: null })),
      ]);

      const { category: cat, breadcrumb: crumbs } =
        normalizePublicCategoryDetailPayload(detailRes?.data);
      if (!cat || typeof cat !== "object") {
        setError("Category not found.");
        setCategory(null);
        setBreadcrumb([]);
        setChildren([]);
        return;
      }

      setCategory(cat);
      setBreadcrumb(Array.isArray(crumbs) ? crumbs : []);

      const childList = normalizePublicCategoryChildrenPayload(childrenRes?.data);
      setChildren(childList);
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 404
          ? "This category does not exist or is no longer available."
          : err?.response?.data?.error?.message ||
              err?.response?.data?.message ||
              err?.message ||
              "Could not load category."
      );
      setCategory(null);
      setBreadcrumb([]);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    if (!slug || !category) {
      setProducts([]);
      setProductsError("");
      setTotalPages(1);
      setTotalProducts(0);
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError("");
      try {
        const response = await fetchPublicProducts({
          page,
          limit: PRODUCTS_LIMIT,
          category: slug,
        });
        if (cancelled) return;
        const normalized = normalizeProductsPayload(response?.data);
        setProducts(normalized.products);
        setTotalPages(Number(normalized.totalPages) || 1);
        setTotalProducts(
          Number(normalized.total) || normalized.products.length
        );
      } catch (err) {
        if (cancelled) return;
        setProductsError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "Unable to load products."
        );
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [slug, category, page]);

  const title = category ? getPublicCategoryName(category) : "Category";
  const description =
    category?.description != null && String(category.description).trim()
      ? String(category.description).trim()
      : null;
  const imageUrl =
    category?.imageUrl ||
    category?.image?.url ||
    category?.thumbnailUrl ||
    category?.coverImage ||
    null;

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink }}>
      {/* Hero with optional image */}
      {!loading && category && imageUrl ? (
        <Box
          sx={{
            position: "relative",
            height: { xs: 320, sm: 420, md: 480 },
            overflow: "hidden",
            bgcolor: colors.stone,
          }}
        >
          <Box
            component="img"
            src={imageUrl}
            alt=""
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              left: { xs: 24, sm: 64 },
              right: { xs: 24, sm: 64 },
              bottom: { xs: 32, sm: 64 },
              color: colors.ivory,
              maxWidth: 720,
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: colors.ivory,
                opacity: 0.92,
                mb: 1.5,
              }}
            >
              Category
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: fonts.display,
                fontSize: { xs: 36, sm: 56, md: 68 },
                fontWeight: 500,
                color: colors.ivory,
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </Typography>
          </Box>
        </Box>
      ) : null}

      <Container
        maxWidth={false}
        sx={{ maxWidth: 1440, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        {error ? (
          <Alert
            severity="error"
            action={
              <Button
                component={RouterLink}
                to="/categories"
                color="inherit"
                size="small"
              >
                All categories
              </Button>
            }
            sx={{ borderRadius: 0, border: `1px solid ${colors.danger}`, mb: 3 }}
          >
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={400}
              sx={{ bgcolor: colors.stone }}
            />
          </Box>
        ) : category ? (
          <Stack spacing={{ xs: 5, sm: 7 }}>
            <CategoryBreadcrumb items={breadcrumb} />

            {/* Title block (only shown when no hero image) */}
            {!imageUrl ? (
              <Box sx={{ textAlign: "center", py: { xs: 2, sm: 4 } }}>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: colors.muted,
                    mb: 1.5,
                  }}
                >
                  Category
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: { xs: 34, sm: 52 },
                    fontWeight: 500,
                    color: colors.ink,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.05,
                  }}
                >
                  {title}
                </Typography>
                {description ? (
                  <Typography
                    sx={{
                      mt: 2,
                      color: colors.muted,
                      fontSize: 14,
                      maxWidth: 600,
                      mx: "auto",
                      lineHeight: 1.7,
                    }}
                  >
                    {description}
                  </Typography>
                ) : null}
              </Box>
            ) : description ? (
              <Box sx={{ textAlign: "center", maxWidth: 720, mx: "auto" }}>
                <Typography
                  sx={{
                    color: colors.muted,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {description}
                </Typography>
              </Box>
            ) : null}

            {/* Subcategory chips */}
            {children.length > 0 ? (
              <Box>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: colors.ink,
                    mb: 2,
                  }}
                >
                  Subcategories
                </Typography>
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  useFlexGap
                  spacing={1.5}
                >
                  {children.map((child, index) => {
                    const childSlug = getPublicCategorySlug(child);
                    const childName = getPublicCategoryName(child);
                    const key = childSlug || `${childName}-${index}`;
                    if (!childSlug) {
                      return (
                        <Box
                          key={key}
                          sx={{
                            border: `1px solid ${colors.line}`,
                            color: colors.muted,
                            px: 2,
                            py: 0.85,
                            fontFamily: fonts.body,
                            fontSize: 11,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                          }}
                        >
                          {childName}
                        </Box>
                      );
                    }
                    return (
                      <Box
                        key={key}
                        component={RouterLink}
                        to={`/categories/${encodeURIComponent(childSlug)}`}
                        sx={{
                          border: `1px solid ${colors.line}`,
                          color: colors.ink,
                          textDecoration: "none",
                          px: 2,
                          py: 0.85,
                          fontFamily: fonts.body,
                          fontSize: 11,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          fontWeight: 500,
                          transition: "all 200ms cubic-bezier(0.2,0.7,0.2,1)",
                          "&:hover": {
                            bgcolor: colors.ink,
                            color: colors.ivory,
                            borderColor: colors.ink,
                          },
                        }}
                      >
                        {childName}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ) : null}

            {/* Product grid */}
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                sx={{ mb: 3 }}
              >
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: { xs: 24, sm: 32 },
                    fontWeight: 500,
                    color: colors.ink,
                  }}
                >
                  Pieces in {title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    color: colors.muted,
                  }}
                >
                  {productsLoading
                    ? "Loading…"
                    : `${totalProducts} ${totalProducts === 1 ? "piece" : "pieces"}`}
                </Typography>
              </Stack>

              {productsError ? (
                <Alert
                  severity="error"
                  sx={{ mb: 3, borderRadius: 0, border: `1px solid ${colors.danger}` }}
                >
                  {productsError}
                </Alert>
              ) : null}

              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {productsLoading
                  ? renderProductSkeletons()
                  : products.map((product) => (
                      <Grid
                        size={{ xs: 6, sm: 6, md: 4, lg: 3 }}
                        key={
                          product?._id ||
                          product?.id ||
                          product?.slug ||
                          product?.name
                        }
                      >
                        <ProductCard product={product} />
                      </Grid>
                    ))}
              </Grid>

              {!productsLoading && products.length === 0 && !productsError ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography
                    sx={{
                      fontFamily: fonts.display,
                      fontSize: 22,
                      color: colors.ink,
                    }}
                  >
                    No pieces in this category yet.
                  </Typography>
                </Box>
              ) : null}

              {totalPages > 1 ? (
                <Stack alignItems="center" sx={{ pt: 5 }}>
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
            </Box>
          </Stack>
        ) : !error ? (
          <Typography sx={{ color: colors.muted, textAlign: "center" }}>
            Nothing to show.
          </Typography>
        ) : null}
      </Container>
    </Box>
  );
};

export default CategoryDetail;

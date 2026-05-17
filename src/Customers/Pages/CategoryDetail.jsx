import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Pagination,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
import { fetchPublicProducts, normalizeProductsPayload } from "../services/publicProductsService";
import { colors, primaryAlpha } from "../../theme/theme";

const PRODUCTS_LIMIT = 12;

const renderProductSkeletons = () =>
  Array.from({ length: 8 }).map((_, idx) => (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={idx}>
      <Skeleton variant="rounded" height={360} />
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

      const { category: cat, breadcrumb: crumbs } = normalizePublicCategoryDetailPayload(detailRes?.data);
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
          : err?.response?.data?.message || err?.message || "Could not load category."
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
        setTotalProducts(Number(normalized.total) || normalized.products.length);
      } catch (err) {
        if (cancelled) return;
        setProductsError(err?.response?.data?.message || err?.message || "Unable to load products.");
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
    <Box
      sx={{
        flex: 1,
        width: "100%",
        minHeight: "100%",
        bgcolor: colors.background,
        color: colors.text,
        py: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          {error ? (
            <Alert
              severity="error"
              action={
                <Button component={RouterLink} to="/categories" color="inherit" size="small">
                  All categories
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress size={40} sx={{ color: colors.primary }} aria-label="Loading category" />
            </Box>
          ) : category ? (
            <>
              <CategoryBreadcrumb items={breadcrumb} />

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={3}
                alignItems={{ xs: "stretch", md: "flex-start" }}
              >
                {imageUrl ? (
                  <Box
                    component="img"
                    src={imageUrl}
                    alt=""
                    sx={{
                      width: { xs: "100%", md: 280 },
                      maxHeight: 280,
                      objectFit: "cover",
                      borderRadius: 2,
                      border: `1px solid ${primaryAlpha(0.25)}`,
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.5, mb: 1 }}>
                    {title}
                  </Typography>
                  {slug ? (
                    <Typography variant="caption" sx={{ color: alpha(colors.text, 0.5), display: "block", mb: 1 }}>
                      /{slug}
                    </Typography>
                  ) : null}
                  {description ? (
                    <Typography variant="body1" sx={{ color: alpha(colors.text, 0.78), lineHeight: 1.65 }}>
                      {description}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: alpha(colors.text, 0.55) }}>
                      Explore subcategories below.
                    </Typography>
                  )}
                </Box>
              </Stack>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Subcategories
                </Typography>
                {children.length === 0 ? (
                  <Typography variant="body2" sx={{ color: alpha(colors.text, 0.55) }}>
                    No subcategories in this section yet.
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {children.map((child, index) => {
                      const childSlug = getPublicCategorySlug(child);
                      const childName = getPublicCategoryName(child);
                      const key = childSlug || `${childName}-${index}`;
                      return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                          <Card
                            elevation={0}
                            sx={{
                              border: `1px solid ${primaryAlpha(0.3)}`,
                              borderRadius: 2,
                              bgcolor: colors.background,
                            }}
                          >
                            <CardActionArea
                              component={childSlug ? RouterLink : "div"}
                              to={childSlug ? `/categories/${encodeURIComponent(childSlug)}` : undefined}
                              disabled={!childSlug}
                              sx={{ alignItems: "stretch", height: "100%" }}
                            >
                              <CardContent>
                                <Typography variant="subtitle1" fontWeight={700}>
                                  {childName}
                                </Typography>
                                {!childSlug ? (
                                  <Typography variant="caption" color="text.secondary">
                                    No slug
                                  </Typography>
                                ) : null}
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Products in this category
                </Typography>
                {productsError ? <Alert severity="error">{productsError}</Alert> : null}
                <Typography variant="body2" sx={{ color: alpha(colors.text, 0.66), mb: 2 }}>
                  {productsLoading ? "Loading products..." : `${totalProducts} product${totalProducts === 1 ? "" : "s"} found`}
                </Typography>
                <Grid container spacing={2}>
                  {productsLoading
                    ? renderProductSkeletons()
                    : products.map((product) => (
                        <Grid
                          size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                          key={product?._id || product?.id || product?.slug || product?.name}
                        >
                          <ProductCard product={product} />
                        </Grid>
                      ))}
                </Grid>
                {!productsLoading && products.length === 0 && !productsError ? (
                  <Typography variant="body2" sx={{ color: alpha(colors.text, 0.55), mt: 1 }}>
                    No products in this category yet.
                  </Typography>
                ) : null}
                {totalPages > 1 ? (
                  <Stack alignItems="center" sx={{ pt: 2 }}>
                    <Pagination
                      page={page}
                      count={Math.max(totalPages, 1)}
                      onChange={(_, nextPage) => setPage(nextPage)}
                      color="primary"
                      shape="rounded"
                    />
                  </Stack>
                ) : null}
              </Box>
            </>
          ) : !error ? (
            <Typography color="text.secondary">Nothing to show.</Typography>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
};

export default CategoryDetail;

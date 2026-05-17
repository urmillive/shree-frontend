import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Breadcrumbs,
  Container,
  Divider,
  Grid,
  Link as MuiLink,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FiSearch } from "react-icons/fi";
import {
  fetchPublicCategoryTree,
  normalizePublicCategoryTreePayload,
  getPublicCategoryImageUrl,
  getPublicCategoryName,
  getPublicCategorySlug,
} from "../services/publicCategoriesService";
import { buildCategoryTree, getCategoryNodeId } from "../services/categoryTreeUtils";
import { getApiErrorMessage } from "../../utils/apiError";
import { colors } from "../../theme/theme";

const renderLoadingSkeletons = () =>
  Array.from({ length: 8 }).map((_, idx) => (
    <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
      <Skeleton variant="rounded" height={200} sx={{ borderRadius: 1 }} />
    </Grid>
  ));

const sortCategorySiblings = (items) =>
  [...(items ?? [])].sort(
    (a, b) =>
      Number(a?.displayOrder ?? Number.MAX_SAFE_INTEGER) -
        Number(b?.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
      String(getPublicCategoryName(a)).localeCompare(
        String(getPublicCategoryName(b)),
        undefined,
        { sensitivity: "base" }
      )
  );

const filterInactiveSubtree = (nodes) =>
  (nodes ?? [])
    .filter((n) => n && n.isActive !== false)
    .map((n) => ({
      ...n,
      children: filterInactiveSubtree(n.children ?? []),
    }));

const sortTree = (nodes) =>
  sortCategorySiblings(nodes).map((node) => ({
    ...node,
    children: sortTree(node.children ?? []),
  }));

const filterBySearchQuery = (nodes, queryRaw) => {
  const query = queryRaw.trim().toLowerCase();
  if (!query) return nodes ?? [];
  const walk = (list) =>
    (list ?? []).flatMap((node) => {
      const name = String(getPublicCategoryName(node)).toLowerCase();
      const slug = String(getPublicCategorySlug(node) ?? "").toLowerCase();
      const hitsSelf = name.includes(query) || slug.includes(query);
      if (hitsSelf) return [{ ...node }];
      const nextChildren = walk(node.children);
      if (nextChildren.length === 0) return [];
      return [{ ...node, children: nextChildren }];
    });
  return walk(nodes);
};

/** Products listing with category filter applied */
const productsWithCategoryHref = (slug) =>
  slug ? `/products?category=${encodeURIComponent(slug)}` : "/products";

export default function ShopByCategoryPage() {
  const [rawCategories, setRawCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchPublicCategoryTree();
        if (cancelled) return;
        const treeData = normalizePublicCategoryTreePayload(response?.data);
        setRawCategories(Array.isArray(treeData) ? treeData : []);
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Failed to load categories."));
        setRawCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryTree = useMemo(() => {
    const built = buildCategoryTree(rawCategories);
    const filtered = filterInactiveSubtree(built);
    return sortTree(filtered);
  }, [rawCategories]);

  const topLevelCategories = useMemo(() => categoryTree.filter((n) => Number(n?.level ?? 0) === 0), [categoryTree]);

  const visibleRoots = useMemo(() => filterBySearchQuery(topLevelCategories, search), [topLevelCategories, search]);

  const borderMuted = alpha(colors.text, 0.1);
  const textMuted = alpha(colors.text, 0.62);
  const textSubtle = alpha(colors.text, 0.5);

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ "& .MuiBreadcrumbs-li": { fontSize: "0.875rem" } }}>
            <MuiLink component={RouterLink} to="/" underline="hover" color="inherit">
              Home
            </MuiLink>
            <Typography color="text.primary">Categories</Typography>
          </Breadcrumbs>

          <Stack spacing={0.75}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, letterSpacing: -0.35 }}>
              Shop by category
            </Typography>
            <Typography variant="body2" sx={{ color: textMuted, maxWidth: 560 }}>
              Pick a department, then open the product catalog with that category selected in the filters.
            </Typography>
          </Stack>

          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name"
            aria-label="Search categories"
            size="small"
            fullWidth
            sx={{ maxWidth: 400 }}
            slotProps={{
              input: {
                startAdornment: (
                  <Box component="span" sx={{ mr: 1, display: "flex", color: textSubtle, fontSize: 18 }}>
                    <FiSearch aria-hidden />
                  </Box>
                ),
              },
            }}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Grid container spacing={2}>
              {renderLoadingSkeletons()}
            </Grid>
          ) : visibleRoots.length === 0 ? (
            <Typography sx={{ py: 3, color: textSubtle }}>
              {search.trim() ? "No categories match your search." : "No categories are available yet."}
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {visibleRoots.map((category) => {
                const cid =
                  getCategoryNodeId(category) || getPublicCategorySlug(category) || getPublicCategoryName(category);
                const slug = getPublicCategorySlug(category);
                const title = getPublicCategoryName(category);
                const catalogHref = productsWithCategoryHref(slug);
                const imgUrl = getPublicCategoryImageUrl(category);
                const childrenSorted = sortCategorySiblings(category.children ?? []).filter(
                  (c) => c?.isActive !== false
                );

                const desc =
                  typeof category.description === "string" && category.description.trim()
                    ? category.description.trim()
                    : "";

                return (
                  <Grid key={String(cid)} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                      component="article"
                      elevation={0}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        border: `1px solid ${borderMuted}`,
                        borderRadius: 1,
                        bgcolor: colors.background,
                        overflow: "hidden",
                      }}
                    >
                      <Stack direction="row" spacing={1.75} sx={{ p: 2 }}>
                        {imgUrl ? (
                          <Box
                            component="img"
                            src={imgUrl}
                            alt=""
                            sx={{
                              width: 72,
                              height: 72,
                              objectFit: "cover",
                              borderRadius: 0.75,
                              flexShrink: 0,
                              border: `1px solid ${borderMuted}`,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              flexShrink: 0,
                              borderRadius: 0.75,
                              border: `1px dashed ${borderMuted}`,
                              bgcolor: alpha(colors.text, 0.03),
                            }}
                          />
                        )}
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                            {slug ? (
                              <MuiLink
                                component={RouterLink}
                                to={catalogHref}
                                underline="hover"
                                color="inherit"
                                sx={{ fontWeight: "inherit" }}
                              >
                                {title}
                              </MuiLink>
                            ) : (
                              title
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: textSubtle, display: "block", mt: 0.35 }}>
                            {slug || "—"}
                          </Typography>
                        </Box>
                      </Stack>

                      <Divider />

                      <Stack spacing={1.25} sx={{ p: 2, flex: 1 }}>
                        {desc ? (
                          <Typography variant="body2" sx={{ color: textMuted, lineHeight: 1.55 }}>
                            {desc}
                          </Typography>
                        ) : null}

                        {childrenSorted.length > 0 ? (
                          <Box>
                            <Typography variant="caption" sx={{ color: textSubtle, fontWeight: 600 }}>
                              Also shop
                            </Typography>
                            <Stack component="ul" sx={{ m: 0, pl: 2, mt: 0.75, "& li": { py: 0.15 } }}>
                              {childrenSorted.map((child) => {
                                const cs = getPublicCategorySlug(child);
                                const label = getPublicCategoryName(child);
                                const childHref = productsWithCategoryHref(cs);
                                return (
                                  <Typography key={getCategoryNodeId(child) || cs || label} component="li" variant="body2">
                                    {cs ? (
                                      <MuiLink component={RouterLink} to={childHref} underline="hover" color="inherit">
                                        {label}
                                      </MuiLink>
                                    ) : (
                                      label
                                    )}
                                  </Typography>
                                );
                              })}
                            </Stack>
                          </Box>
                        ) : null}

                        <Box sx={{ mt: "auto", pt: 0.5 }}>
                          {slug ? (
                            <Typography variant="body2">
                              <MuiLink
                                component={RouterLink}
                                to={catalogHref}
                                underline="always"
                                color="inherit"
                                sx={{ fontWeight: 600 }}
                              >
                                View products in {title}
                              </MuiLink>
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: textSubtle }}>
                              Category slug missing — cannot open catalog filter.
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}

          <Typography variant="body2" sx={{ color: textSubtle }}>
            <MuiLink component={RouterLink} to="/products" underline="hover" color="inherit">
              View full catalog without a category filter
            </MuiLink>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Container,
  Grid,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import BreadcrumbNav from "../components/BreadcrumbNav";
import CategoryGrid from "../components/CategoryGrid";
import CategorySidebar from "../components/CategorySidebar";
import {
  fetchPublicCategoryTree,
  normalizePublicCategoryTreePayload,
} from "../services/publicCategoriesService";
import { buildCategoryTree, flattenDescendants } from "../services/categoryTreeUtils";
import { colors, fonts } from "../../theme/theme";

const renderLoadingCards = () =>
  Array.from({ length: 6 }).map((_, idx) => (
    <Grid key={idx} size={{ xs: 6, sm: 6, md: 4 }}>
      <Skeleton
        variant="rectangular"
        sx={{ aspectRatio: "4 / 5", borderRadius: 0, bgcolor: colors.stone }}
      />
    </Grid>
  ));

export default function ShopByCategoryPage() {
  const [rawCategories, setRawCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMainId, setSelectedMainId] = useState("");
  const [navigationStack, setNavigationStack] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
        setError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load categories."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryTree = useMemo(
    () => buildCategoryTree(rawCategories),
    [rawCategories]
  );
  const mainCategories = useMemo(
    () => categoryTree.filter((category) => Number(category?.level ?? 0) === 0),
    [categoryTree]
  );

  useEffect(() => {
    if (mainCategories.length === 0) return;
    if (
      !selectedMainId ||
      !mainCategories.some((category) => category._id === selectedMainId)
    ) {
      const first = mainCategories[0];
      setSelectedMainId(first._id);
      setNavigationStack([first]);
      setShowAll(false);
    }
  }, [mainCategories, selectedMainId]);

  const currentNode = navigationStack[navigationStack.length - 1] || null;

  const visibleCategories = useMemo(() => {
    if (!currentNode) return [];
    if (showAll) return flattenDescendants(currentNode);
    return Array.isArray(currentNode.children) ? currentNode.children : [];
  }, [currentNode, showAll]);

  const handleSelectMain = (category) => {
    setSelectedMainId(category._id);
    setNavigationStack([category]);
    setShowAll(false);
  };

  const handleCategoryClick = (category) => {
    if (!Array.isArray(category?.children) || category.children.length === 0) return;
    setNavigationStack((prev) => [...prev, category]);
    setShowAll(false);
  };

  const handleBreadcrumbNavigate = (index) => {
    if (index === -1) {
      if (mainCategories.length > 0) {
        const main =
          mainCategories.find((category) => category._id === selectedMainId) ||
          mainCategories[0];
        setSelectedMainId(main._id);
        setNavigationStack([main]);
      } else {
        setNavigationStack([]);
      }
      setShowAll(false);
      return;
    }
    setNavigationStack((prev) => prev.slice(0, index + 1));
    setShowAll(false);
  };

  const pageTitle = currentNode?.name || "Shop by category";

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        {/* Editorial title */}
        <Stack spacing={1.5} sx={{ mb: { xs: 4, sm: 6 }, textAlign: "center" }}>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: colors.muted,
            }}
          >
            Discover
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 34, sm: 52 },
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
              color: colors.ink,
            }}
          >
            Shop by category
          </Typography>
          <Typography
            sx={{
              color: colors.muted,
              fontSize: 13.5,
              maxWidth: 560,
              mx: "auto",
              lineHeight: 1.65,
            }}
          >
            Curated departments — explore the edit.
          </Typography>
        </Stack>

        <BreadcrumbNav
          stack={navigationStack}
          onNavigate={handleBreadcrumbNavigate}
        />

        {error ? (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 0, border: `1px solid ${colors.danger}` }}
          >
            {error}
          </Alert>
        ) : null}

        <Grid container spacing={{ xs: 0, md: 4 }}>
          {!isMobile ? (
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ position: "sticky", top: 120 }}>
                <CategorySidebar
                  categories={mainCategories}
                  selectedCategoryId={selectedMainId}
                  onSelect={handleSelectMain}
                />
              </Box>
            </Grid>
          ) : null}

          <Grid size={{ xs: 12, md: 9 }}>
            {loading ? (
              <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
                {renderLoadingCards()}
              </Grid>
            ) : (
              <Stack spacing={4}>
                {isMobile && mainCategories.length > 0 ? (
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
                      Departments
                    </Typography>
                    <CategoryGrid
                      categories={mainCategories}
                      title="Main categories"
                      onCategoryClick={handleSelectMain}
                    />
                  </Box>
                ) : null}

                {currentNode ? (
                  <Box>
                    <Typography
                      component="h2"
                      sx={{
                        fontFamily: fonts.display,
                        fontSize: { xs: 24, sm: 32 },
                        fontWeight: 500,
                        color: colors.ink,
                        mb: 3,
                      }}
                    >
                      {pageTitle}
                    </Typography>
                    <CategoryGrid
                      categories={visibleCategories}
                      title={pageTitle}
                      onCategoryClick={handleCategoryClick}
                      onViewAll={
                        showAll ? undefined : () => setShowAll(true)
                      }
                    />
                  </Box>
                ) : (
                  <Typography sx={{ color: colors.muted }}>
                    No categories found.
                  </Typography>
                )}
              </Stack>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

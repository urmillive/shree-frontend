import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import { fetchPublicCategoryTree, normalizePublicCategoryTreePayload } from "../services/publicCategoriesService";
import { buildCategoryTree, flattenDescendants } from "../services/categoryTreeUtils";
import { colors } from "../../theme/theme";

const renderLoadingCards = () =>
  Array.from({ length: 6 }).map((_, idx) => (
    <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
      <Skeleton variant="rounded" height={230} />
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
        setError(err?.response?.data?.message || err?.message || "Failed to load categories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryTree = useMemo(() => buildCategoryTree(rawCategories), [rawCategories]);
  const mainCategories = useMemo(
    () => categoryTree.filter((category) => Number(category?.level ?? 0) === 0),
    [categoryTree]
  );

  useEffect(() => {
    if (mainCategories.length === 0) return;
    if (!selectedMainId || !mainCategories.some((category) => category._id === selectedMainId)) {
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

  const handleBack = () => {
    if (showAll) {
      setShowAll(false);
      return;
    }
    setNavigationStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const handleBreadcrumbNavigate = (index) => {
    if (index === -1) {
      if (mainCategories.length > 0) {
        const main = mainCategories.find((category) => category._id === selectedMainId) || mainCategories[0];
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

  const canGoBack = showAll || navigationStack.length > 1;
  const pageTitle = currentNode?.name || "Shop by Categories";

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, minHeight: "100vh", bgcolor: colors.background }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Shop by Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Explore curated departments and discover products faster.
          </Typography>

          <BreadcrumbNav stack={navigationStack} onNavigate={handleBreadcrumbNavigate} />

          <Button variant="outlined" onClick={handleBack} disabled={!canGoBack} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
            Back
          </Button>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Grid container spacing={3}>
            {!isMobile ? (
              <Grid size={{ xs: 12, md: 3 }}>
                <CategorySidebar categories={mainCategories} selectedCategoryId={selectedMainId} onSelect={handleSelectMain} />
              </Grid>
            ) : null}

            <Grid size={{ xs: 12, md: 9 }}>
              {loading ? (
                <Grid container spacing={2}>
                  {renderLoadingCards()}
                </Grid>
              ) : (
                <Stack spacing={2}>
                  {isMobile ? (
                    <CategoryGrid categories={mainCategories} title="Main categories" onCategoryClick={handleSelectMain} />
                  ) : null}

                  {currentNode ? (
                    <CategoryGrid
                      categories={visibleCategories}
                      title={pageTitle}
                      onCategoryClick={handleCategoryClick}
                      onViewAll={showAll ? undefined : () => setShowAll(true)}
                    />
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No categories found.
                    </Typography>
                  )}
                </Stack>
              )}
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}

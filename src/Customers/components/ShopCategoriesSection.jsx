import React, { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  fetchPublicCategoryTree,
  getPublicCategoryImageUrl,
  getPublicCategoryName,
  getPublicCategorySlug,
  normalizePublicCategoryTreePayload,
} from "../services/publicCategoriesService";
import { getApiErrorMessage } from "../../utils/apiError";
import { colors, primaryAlpha } from "../../theme/theme";

export function CategoryCircleItem({ node, subtitle = null, size = "default" }) {
  const slug = getPublicCategorySlug(node);
  const name = getPublicCategoryName(node);
  const imageUrl = getPublicCategoryImageUrl(node);
  const initial = name.charAt(0).toUpperCase() || "?";
  const dim = size === "compact" ? { xs: 72, sm: 80 } : { xs: 88, sm: 96 };
  const itemW = size === "compact" ? { xs: 92, sm: 100 } : { xs: 100, sm: 108 };

  const circle = (
    <Box
      sx={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        border: `2px solid ${primaryAlpha(0.35)}`,
        bgcolor: colors.mutedSurface,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        boxShadow: `0 2px 8px ${primaryAlpha(0.12)}`,
        // "&:hover": slug
        //   ? {
        //       transform: "translateY(-2px)",
        //       borderColor: primaryAlpha(0.55),
        //       boxShadow: `0 6px 16px ${primaryAlpha(0.2)}`,
        //     }
        //   : {},
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Typography
          sx={{
            fontSize: size === "compact" ? "1.35rem" : "1.75rem",
            fontWeight: 700,
            color: alpha(colors.primary, 0.85),
            userSelect: "none",
          }}
        >
          {initial}
        </Typography>
      )}
    </Box>
  );

  const label = (
    <Typography
      variant="caption"
      sx={{
        mt: 1,
        textAlign: "center",
        maxWidth: size === "compact" ? { xs: 92, sm: 100 } : { xs: 96, sm: 104 },
        fontWeight: 600,
        lineHeight: 1.25,
        color: alpha(colors.text, 0.88),
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {name}
    </Typography>
  );

  const sub =
    subtitle != null && String(subtitle).trim() ? (
      <Typography
        variant="caption"
        sx={{
          mt: 0.25,
          textAlign: "center",
          maxWidth: itemW,
          fontSize: "0.65rem",
          lineHeight: 1.2,
          color: alpha(colors.text, 0.5),
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          px: 0.25,
        }}
      >
        {String(subtitle).trim()}
      </Typography>
    ) : null;

  if (!slug) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: itemW,
          flexShrink: 0,
          scrollSnapAlign: "start",
          opacity: 0.65,
        }}
      >
        {circle}
        {label}
        {sub}
      </Box>
    );
  }

  return (
    <Box
      component={RouterLink}
      to={`/categories/${encodeURIComponent(slug)}`}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: itemW,
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
        scrollSnapAlign: "start",
      }}
    >
      {circle}
      {label}
      {sub}
    </Box>
  );
}

export default function ShopCategoriesSection() {
  const scrollerRef = useRef(null);
  /** Start true: first fetch runs without sync setState in effect (eslint react-hooks/set-state-in-effect). */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainCategories, setMainCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicCategoryTree()
      .then((res) => {
        if (cancelled) return;
        setError("");
        const roots = normalizePublicCategoryTreePayload(res?.data);
        setMainCategories(Array.isArray(roots) ? roots : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Could not load categories."));
        setMainCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box
        component="section"
        id="shop-categories"
        sx={{ py: { xs: 2, sm: 3 }, bgcolor: alpha(colors.primary, 0.04), borderRadius: 2 }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={36} sx={{ color: colors.primary }} aria-label="Loading categories" />
        </Box>
      </Box>
    );
  }

  if (error || mainCategories.length === 0) {
    return (
      <Box component="section" id="shop-categories" sx={{ py: { xs: 2, sm: 3 } }}>
        {error ? (
          <Typography variant="body2" sx={{ color: alpha(colors.text, 0.62), textAlign: "center" }}>
            {error}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: alpha(colors.text, 0.55), textAlign: "center" }}>
            Categories will appear here soon.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box component="section" id="shop-categories" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, gap: 1 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
          Shop by category
        </Typography>
      </Stack>

      <Box sx={{ position: "relative", mx: { xs: -1, sm: -1.5 } }}>
        <Box
          ref={scrollerRef}
          sx={{
            display: "flex",
            gap: { xs: 2, sm: 2.5 },
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
            scrollSnapType: "x proximity",
            scrollBehavior: "smooth",
            pb: 1,
            px: { xs: 1, sm: 1.5 },
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {mainCategories.map((node, idx) => {
            const key = getPublicCategorySlug(node) || `cat-${idx}`;
            return <CategoryCircleItem key={key} node={node} />;
          })}
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Button
          component={RouterLink}
          to="/categories"
          variant="outlined"
          size="medium"
          sx={{
            borderColor: primaryAlpha(0.5),
            color: colors.text,
            fontWeight: 700,
            textTransform: "none",
            borderRadius: 2,
            px: 3,
            // "&:hover": { borderColor: colors.primary, bgcolor: alpha(colors.primary, 0.06) },
          }}
        >
          Show all categories
        </Button>
      </Box>
    </Box>
  );
}

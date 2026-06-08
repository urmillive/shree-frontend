import React, { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import {
  fetchPublicCategoryTree,
  getPublicCategoryImageUrl,
  getPublicCategoryName,
  getPublicCategorySlug,
  normalizePublicCategoryTreePayload,
} from "../services/publicCategoriesService";
import { colors, fonts } from "../../theme/theme";

export function CategoryCircleItem({ node, subtitle = null, size = "default" }) {
  const slug = getPublicCategorySlug(node);
  const name = getPublicCategoryName(node);
  const imageUrl = getPublicCategoryImageUrl(node);
  const initial = name.charAt(0).toUpperCase() || "?";
  const dim = size === "compact" ? { xs: 84, sm: 92 } : { xs: 104, sm: 120 };
  const itemW = size === "compact" ? { xs: 110, sm: 120 } : { xs: 124, sm: 140 };

  const circle = (
    <Box
      sx={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        bgcolor: colors.stone,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 240ms cubic-bezier(0.2,0.7,0.2,1)",
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 240ms cubic-bezier(0.2,0.7,0.2,1)",
          }}
        />
      ) : (
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: size === "compact" ? "1.5rem" : "2rem",
            fontWeight: 500,
            color: colors.muted,
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
      sx={{
        mt: 1.5,
        textAlign: "center",
        maxWidth: itemW,
        fontFamily: fonts.body,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 500,
        color: colors.ink,
        lineHeight: 1.4,
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
        sx={{
          mt: 0.25,
          textAlign: "center",
          maxWidth: itemW,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.muted,
          lineHeight: 1.3,
          px: 0.25,
        }}
      >
        {String(subtitle).trim()}
      </Typography>
    ) : null;

  const inner = (
    <>
      {circle}
      {label}
      {sub}
    </>
  );

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
          opacity: 0.6,
        }}
      >
        {inner}
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
        "&:hover img": { transform: "scale(1.06)" },
        "&:hover .sg-cat-circle-label": { color: colors.wine },
      }}
    >
      {circle}
      <Box className="sg-cat-circle-label" sx={{ transition: "color 200ms" }}>
        {label}
      </Box>
      {sub}
    </Box>
  );
}

export default function ShopCategoriesSection() {
  const scrollerRef = useRef(null);
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
        setError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "Could not load categories."
        );
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
        sx={{ py: { xs: 5, sm: 8 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} sx={{ color: colors.ink }} />
        </Box>
      </Box>
    );
  }

  if (error || mainCategories.length === 0) {
    return (
      <Box component="section" id="shop-categories" sx={{ py: { xs: 5, sm: 7 } }}>
        <Typography
          sx={{
            color: colors.muted,
            textAlign: "center",
            fontSize: 13,
          }}
        >
          {error || "Categories will appear here soon."}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="section"
      id="shop-categories"
      sx={{ py: { xs: 6, sm: 10 } }}
    >
      <Stack
        spacing={1}
        sx={{ mb: { xs: 4, sm: 6 }, alignItems: "center", textAlign: "center" }}
      >
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: colors.muted,
            fontWeight: 500,
          }}
        >
          The Edit
        </Typography>
        <Typography
          component="h2"
          sx={{
            fontFamily: fonts.display,
            fontSize: { xs: 32, sm: 44 },
            fontWeight: 500,
            color: colors.ink,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          Shop by category
        </Typography>
      </Stack>

      <Box sx={{ position: "relative", mx: { xs: -2, sm: -3 } }}>
        <Box
          ref={scrollerRef}
          sx={{
            display: "flex",
            gap: { xs: 2.5, sm: 4 },
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
            scrollSnapType: "x proximity",
            scrollBehavior: "smooth",
            pb: 1,
            px: { xs: 2, sm: 3 },
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

      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <Button
          component={RouterLink}
          to="/categories"
          variant="outlined"
          size="medium"
        >
          View all categories
        </Button>
      </Box>
    </Box>
  );
}

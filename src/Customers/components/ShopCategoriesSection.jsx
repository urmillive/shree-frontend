import React, { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import {
  fetchPublicCategoryTree,
  getPublicCategoryImageUrl,
  getPublicCategoryName,
  getPublicCategorySlug,
  normalizePublicCategoryTreePayload,
} from "../services/publicCategoriesService";
import { colors, fonts } from "../../theme/theme";

const CARD_W = { xs: 260, sm: 320, md: 380 };
const CARD_H = { xs: 260, sm: 320, md: 380 };

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

function CategoryCard({ node }) {
  const slug = getPublicCategorySlug(node);
  const name = getPublicCategoryName(node);
  const imageUrl = getPublicCategoryImageUrl(node);
  const initial = name.charAt(0).toUpperCase() || "?";

  const cardContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexShrink: 0,
        scrollSnapAlign: "start",
        textDecoration: "none",
        color: "inherit",
        cursor: slug ? "pointer" : "default",
        "&:hover .cat-card-img": { transform: "scale(1.04)" },
        "&:hover .cat-card-name": { color: colors.wine },
      }}
      component={slug ? RouterLink : "div"}
      {...(slug ? { to: `/categories/${encodeURIComponent(slug)}` } : {})}
    >
      <Box
        sx={{
          width: CARD_W,
          height: CARD_H,
          overflow: "hidden",
          bgcolor: colors.stone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <Box
            className="cat-card-img"
            component="img"
            src={imageUrl}
            alt={name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 360ms cubic-bezier(0.2,0.7,0.2,1)",
              display: "block",
            }}
          />
        ) : (
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: "3.5rem",
              fontWeight: 500,
              color: colors.muted,
              userSelect: "none",
            }}
          >
            {initial}
          </Typography>
        )}
      </Box>

      <Typography
        className="cat-card-name"
        sx={{
          mt: 2,
          fontFamily: fonts.body,
          fontSize: { xs: 12, sm: 13 },
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: colors.ink,
          textAlign: "center",
          transition: "color 220ms",
          lineHeight: 1.3,
        }}
      >
        {name}
      </Typography>
    </Box>
  );

  return cardContent;
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
      {/* Heading */}
      <Typography
        component="h2"
        sx={{
          textAlign: "center",
          fontFamily: fonts.body,
          fontSize: { xs: 14, sm: 16 },
          fontWeight: 700,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: colors.ink,
          mb: { xs: 4, sm: 6 },
          lineHeight: 1.4,
        }}
      >
        Explore Our{" "}
        <Box component="span" sx={{ color: colors.wine }}>
          Collections
        </Box>
      </Typography>

      {/* Cards scroller */}
      <Box sx={{ position: "relative", mx: { xs: -2, sm: -3 } }}>
        <Box
          ref={scrollerRef}
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: { xs: 2, sm: 3 },
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
            return <CategoryCard key={key} node={node} />;
          })}
        </Box>
      </Box>

      {/* CTA button */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 4, sm: 6 } }}>
        <Button
          component={RouterLink}
          to="/categories"
          sx={{
            bgcolor: colors.wine,
            color: "#fff",
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            px: { xs: 4, sm: 5 },
            py: 1.5,
            borderRadius: "2px",
            "&:hover": {
              bgcolor: "#8a2535",
            },
          }}
        >
          View All Categories
        </Button>
      </Box>
    </Box>
  );
}

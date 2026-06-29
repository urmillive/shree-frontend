import React, { useEffect, useRef, useState } from "react";
import { Box, Container, IconButton, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { colors, fonts } from "../../theme/theme";
import { resolveProductImage } from "../services/publicProductsService";

const normaliseProduct = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string" || typeof raw === "number") return { _id: raw };
  return { ...raw, ...(raw.flags || {}) };
};

// ── Nav arrow (identical to HomepageSectionsGrid) ─────────────────────────────

function NavArrow({ direction, onClick }) {
  const isLeft = direction === "left";
  return (
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [isLeft ? "left" : "right"]: { xs: -8, sm: -20 },
        zIndex: 2,
      }}
    >
      <IconButton
        onClick={onClick}
        size="small"
        sx={{
          width: 36,
          height: 36,
          bgcolor: colors.paper,
          border: `1px solid ${colors.line}`,
          boxShadow: "0 2px 8px rgba(17,17,17,0.08)",
          color: colors.ink,
          "&:hover": { bgcolor: colors.ivory },
        }}
      >
        <Box component="span" sx={{ fontSize: 16, lineHeight: 1, userSelect: "none" }}>
          {isLeft ? "‹" : "›"}
        </Box>
      </IconButton>
    </Box>
  );
}

// ── Single gallery image tile ─────────────────────────────────────────────────

function GalleryTile({ product, sx = {} }) {
  const image = resolveProductImage(product);
  const slug = product?.slug || product?.id || product?._id || "";

  return (
    <Box
      component={slug ? RouterLink : "div"}
      {...(slug ? { to: `/products/${slug}` } : {})}
      sx={{
        display: "block",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        "&:hover img": { transform: "scale(1.06)" },
        ...sx,
      }}
    >
      <Box
        component="img"
        src={image}
        alt={product?.name || "Gallery item"}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transition: "transform 600ms cubic-bezier(0.2,0.7,0.2,1)",
        }}
      />
    </Box>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ShreeGallerySection({ section }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const products = (section?.productIds || [])
    .map(normaliseProduct)
    .filter(Boolean)
    .slice(0, 5);

  // Mobile slider scroll state
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [products.length]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  if (!section || products.length === 0) return null;

  const [hero, ...rest] = products;

  return (
    <Box component="section" sx={{ bgcolor: colors.ivory, py: { xs: 5, sm: 8 } }}>
      <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 2, sm: 4 } }}>

        {/* ── Section heading ── */}
        <Typography
          component="h2"
          sx={{
            textAlign: "center",
            fontFamily: fonts.body,
            fontSize: { xs: 12, sm: 16 },
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: colors.ink,
            mb: { xs: 3, sm: 5 },
            lineHeight: 1.4,
          }}
        >
          Shree{" "}
          <Box component="span" sx={{ color: colors.wine }}>
            Gallery
          </Box>
        </Typography>

        {/* ── DESKTOP: masonry-style grid (sm and up) ── */}
        <Box
          sx={{
            display: { xs: "none", sm: "grid" },
            gridTemplateColumns: "1.3fr 1fr 1fr",
            gridTemplateRows: { sm: "260px 260px", md: "300px 300px" },
            gap: { sm: 1.5, md: 2 },
          }}
        >
          {/* Hero — spans both rows */}
          <Box sx={{ gridRow: "span 2" }}>
            <GalleryTile product={hero} />
          </Box>

          {/* 4 smaller tiles */}
          {rest.slice(0, 4).map((product, idx) => (
            <GalleryTile key={product._id || product.id || idx} product={product} />
          ))}
        </Box>

        {/* ── MOBILE: horizontal scroll slider (xs only) ── */}
        <Box sx={{ display: { xs: "block", sm: "none" }, position: "relative" }}>
          {canLeft && <NavArrow direction="left" onClick={() => scroll(-1)} />}

          <Box
            ref={scrollRef}
            sx={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              pb: 1,
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            {products.map((product, idx) => (
              <Box
                key={product._id || product.id || idx}
                sx={{
                  flex: "0 0 auto",
                  width: { xs: "clamp(200px, 72vw, 280px)", sm: 260 },
                  height: { xs: "clamp(240px, 86vw, 340px)", sm: 320 },
                  scrollSnapAlign: "start",
                }}
              >
                <GalleryTile product={product} />
              </Box>
            ))}
          </Box>

          {canRight && <NavArrow direction="right" onClick={() => scroll(1)} />}
        </Box>

        {/* ── View all button ── */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 3, sm: 4 } }}>
          <Box
            component={RouterLink}
            to="/products"
            sx={{
              fontFamily: fonts.body,
              fontSize: { xs: 10, sm: 11 },
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: colors.ivory,
              textDecoration: "none",
              bgcolor: colors.wine,
              px: { xs: 4, sm: 5 },
              py: { xs: 1.25, sm: 1.5 },
              borderRadius: "2px",
              transition: "background-color 200ms",
              "&:hover": { bgcolor: "#8a2535" },
            }}
          >
            View All
          </Box>
        </Box>

      </Container>

      {/* Thin divider */}
      <Box sx={{ mt: { xs: 5, sm: 7 }, borderBottom: `1px solid ${colors.line}` }} />
    </Box>
  );
}

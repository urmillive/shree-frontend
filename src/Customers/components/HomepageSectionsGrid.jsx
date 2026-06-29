import React, { useEffect, useRef, useState } from "react";
import { Box, Container, IconButton, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ProductCard from "./ProductCard";
import { colors, fonts } from "../../theme/theme";

// Flatten flags object onto the product so ProductCard can read them directly
const normaliseProduct = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string" || typeof raw === "number") return { _id: raw };
  return { ...raw, ...(raw.flags || {}) };
};

// ── Nav arrow ─────────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function HomepageSectionsGrid({ section }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const products = (section?.productIds || [])
    .map(normaliseProduct)
    .filter(Boolean);

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
    el.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  if (!section || products.length === 0) return null;

  const title = section?.title || section?.name || "";

  return (
    <Box sx={{ py: { xs: 5, sm: 8 } }}>
      <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 2, sm: 4 } }}>

        {/* Section header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: title ? "space-between" : "flex-end",
            mb: { xs: 3, sm: 5 },
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {title ? (
            <Typography
              component="h2"
              sx={{
                fontFamily: fonts.body,
                fontSize: { xs: 12, sm: 16 },
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: colors.ink,
                lineHeight: 1.4,
              }}
            >
              {title.split(" ").map((word, i) => (
                <Box
                  key={i}
                  component="span"
                  sx={{ color: i === 0 ? colors.ink : colors.wine, mr: i < title.split(" ").length - 1 ? "0.25em" : 0 }}
                >
                  {word}
                </Box>
              ))}
            </Typography>
          ) : null}

          <Box
            component={RouterLink}
            to="/products"
            sx={{
              display: { xs: "none", sm: "inline-block" },
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: colors.ink,
              borderBottom: `1px solid ${colors.ink}`,
              pb: 0.5,
              whiteSpace: "nowrap",
              textDecoration: "none",
              transition: "color 200ms, border-color 200ms",
              "&:hover": { color: colors.wine, borderBottomColor: colors.wine },
            }}
          >
            View all →
          </Box>
        </Box>

        {/* Scroll container */}
        <Box sx={{ position: "relative" }}>
          {canLeft && <NavArrow direction="left" onClick={() => scroll(-1)} />}

          <Box
            ref={scrollRef}
            sx={{
              display: "flex",
              gap: { xs: 2, sm: 2.5 },
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
                  width: { xs: "clamp(150px, 44vw, 220px)", sm: 230, md: 270 },
                  scrollSnapAlign: "start",
                }}
              >
                <ProductCard product={product} imageRadius={0} />
              </Box>
            ))}
          </Box>

          {canRight && <NavArrow direction="right" onClick={() => scroll(1)} />}
        </Box>

        {/* Mobile "View all" */}
        <Box
          sx={{
            display: { xs: "flex", sm: "none" },
            justifyContent: "center",
            mt: 3,
          }}
        >
          <Box
            component={RouterLink}
            to="/products"
            sx={{
              fontFamily: fonts.body,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: colors.ivory,
              textDecoration: "none",
              bgcolor: colors.wine,
              px: 4,
              py: 1.25,
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
      {/* <Box sx={{ mt: { xs: 5, sm: 7 }, borderBottom: `1px solid ${colors.line}` }} /> */}
    </Box>
  );
}

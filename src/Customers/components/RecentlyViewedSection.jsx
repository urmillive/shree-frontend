import { useRef, useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { colors, fonts } from "../../theme/theme";
import ProductCard from "./ProductCard";
import { useRecentlyViewed } from "../context/useRecentlyViewed";

const sameId = (a, b) => String(a ?? "") === String(b ?? "");

function ChevronIcon({ direction = "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      style={{
        transform: direction === "left" ? "rotate(180deg)" : undefined,
      }}
    >
      <path
        d="M7.5 4.5L13 10L7.5 15.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RecentlyViewedSection({
  excludeProductId = "",
  title = "Recently Viewed",
  showClear = false,
  dense = false,
}) {
  const { products, loading, busy, clearAllRecentlyViewed } =
    useRecentlyViewed();

  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const visible = excludeProductId
    ? products.filter(
        (p) => !sameId(p?.id ?? p?._id ?? p?.productId, excludeProductId)
      )
    : products;

  const syncButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncButtons();
    el.addEventListener("scroll", syncButtons, { passive: true });
    const ro = new ResizeObserver(syncButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncButtons);
      ro.disconnect();
    };
  }, [syncButtons, visible.length]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-rv-card]")?.offsetWidth ?? 260;
    const gap = 16;
    el.scrollBy({
      left: dir === "next" ? (cardWidth + gap) * 4 : -(cardWidth + gap) * 4,
      behavior: "smooth",
    });
  };

  const handleClear = async () => {
    try {
      await clearAllRecentlyViewed();
    } catch {
      /* surfaced via context error if needed */
    }
  };

  if (!loading && visible.length === 0) return null;

  const showArrows = !loading && visible.length > 4;

  const [word1, ...rest] = title.toUpperCase().split(" ");
  const word2 = rest.join(" ");

  return (
    <Box sx={{ bgcolor: "#FAF7F2", py: { xs: 5, sm: 8 }, mt: dense ? 0 : 0 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 4 } }}>
      {/* ── Header ── */}
      <Box sx={{ textAlign: "center", mb: { xs: 3, sm: 4 }, position: "relative" }}>
        <Typography
          component="h2"
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 17, sm: 20 },
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            lineHeight: 1,
            display: "inline",
          }}
        >
          <Box component="span" sx={{ color: colors.ink }}>
            {word1}
          </Box>
          {word2 && (
            <>
              {" "}
              <Box component="span" sx={{ color: colors.wine }}>
                {word2}
              </Box>
            </>
          )}
        </Typography>

        {/* Clear + arrows positioned absolutely to the right */}
        <Stack
          direction="row"
          alignItems="center"
          gap={0.75}
          sx={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {showClear && visible.length > 0 && (
            <Button
              variant="text"
              disabled={busy}
              onClick={() => void handleClear()}
              sx={{
                fontFamily: fonts.body,
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: colors.muted,
                minWidth: 0,
                p: "2px 6px",
                "&:hover": {
                  color: colors.wine,
                  backgroundColor: "transparent",
                },
              }}
            >
              Clear
            </Button>
          )}

          {showArrows && (
            <>
              <IconButton
                onClick={() => scroll("prev")}
                disabled={!canPrev}
                size="small"
                aria-label="Previous"
                sx={{
                  border: "1px solid",
                  borderColor: canPrev ? colors.ink : colors.stone,
                  color: canPrev ? colors.ink : colors.muted,
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: colors.ink,
                    color: "#fff",
                    borderColor: colors.ink,
                  },
                  "&.Mui-disabled": { opacity: 0.3 },
                }}
              >
                <ChevronIcon direction="left" />
              </IconButton>
              <IconButton
                onClick={() => scroll("next")}
                disabled={!canNext}
                size="small"
                aria-label="Next"
                sx={{
                  border: "1px solid",
                  borderColor: canNext ? colors.ink : colors.stone,
                  color: canNext ? colors.ink : colors.muted,
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: colors.ink,
                    color: "#fff",
                    borderColor: colors.ink,
                  },
                  "&.Mui-disabled": { opacity: 0.3 },
                }}
              >
                <ChevronIcon direction="right" />
              </IconButton>
            </>
          )}
        </Stack>
      </Box>

      {/* ── Slider track ── */}
      <Box
        ref={trackRef}
        sx={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: {
            xs: "calc((100% - 16px) / 2)",
            sm: "calc((100% - 16px) / 2)",
            md: "calc((100% - 32px) / 3)",
            lg: "calc((100% - 48px) / 4)",
          },
          gap: "16px",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          pb: 0.5,
          px: { xs: 0, sm: 0 },
        }}
      >
        {loading
          ? [1, 2, 3, 4].map((key) => (
              <Box
                key={key}
                data-rv-card
                sx={{ scrollSnapAlign: "start", minWidth: 0 }}
              >
                <Skeleton
                  variant="rectangular"
                  sx={{
                    aspectRatio: "3 / 4",
                    borderRadius: "6px",
                    bgcolor: colors.stone,
                    width: "100%",
                  }}
                />
                <Skeleton sx={{ mt: 1.5, bgcolor: colors.stone }} width="65%" />
                <Skeleton sx={{ bgcolor: colors.stone }} width="35%" />
              </Box>
            ))
          : visible.map((product, index) => {
              const key =
                product?.id ||
                product?._id ||
                product?.productId ||
                product?.slug ||
                `rv-${index}`;
              return (
                <Box
                  key={String(key)}
                  data-rv-card
                  sx={{ scrollSnapAlign: "start", minWidth: 0 }}
                >
                  <ProductCard product={product} priceColor={colors.wine} imageRadius="6px" />
                </Box>
              );
            })}
      </Box>
      </Box>
    </Box>
  );
}

import { Box, Button, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { colors, fonts } from "../../theme/theme";
import ProductCard from "./ProductCard";
import { useRecentlyViewed } from "../context/useRecentlyViewed";

const sameId = (a, b) => String(a ?? "") === String(b ?? "");

export default function RecentlyViewedSection({
  excludeProductId = "",
  title = "Recently viewed",
  showClear = false,
  dense = false,
}) {
  const { products, loading, busy, clearAllRecentlyViewed } = useRecentlyViewed();

  const visible = excludeProductId
    ? products.filter(
        (p) => !sameId(p?.id ?? p?._id ?? p?.productId, excludeProductId)
      )
    : products;

  if (!loading && visible.length === 0) {
    return null;
  }

  const handleClear = async () => {
    try {
      await clearAllRecentlyViewed();
    } catch {
      /* surfaced via context error if needed */
    }
  };

  return (
    <Box sx={{ mt: dense ? 0 : { xs: 5, sm: 9 } }}>
      <Stack
        direction="row"
        alignItems="flex-end"
        justifyContent="space-between"
        sx={{ mb: { xs: 3, sm: 4 } }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: colors.muted,
              fontWeight: 500,
              mb: 1,
            }}
          >
            For you
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 26, sm: 36 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {title}
          </Typography>
        </Box>
        {showClear && visible.length > 0 ? (
          <Button
            variant="text"
            disabled={busy}
            onClick={() => void handleClear()}
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: colors.muted,
              "&:hover": { color: colors.wine, backgroundColor: "transparent" },
            }}
          >
            Clear
          </Button>
        ) : null}
      </Stack>

      {loading ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {[1, 2, 3, 4].map((key) => (
            <Grid key={key} size={{ xs: 6, sm: 6, md: 3 }}>
              <Skeleton
                variant="rectangular"
                sx={{
                  aspectRatio: "3 / 4",
                  borderRadius: 0,
                  bgcolor: colors.stone,
                }}
              />
              <Skeleton sx={{ mt: 1.5, bgcolor: colors.stone }} width="60%" />
              <Skeleton sx={{ bgcolor: colors.stone }} width="30%" />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {visible.map((product, index) => {
            const key =
              product?.id ||
              product?._id ||
              product?.productId ||
              product?.slug ||
              `rv-${index}`;
            return (
              <Grid key={String(key)} size={{ xs: 6, sm: 6, md: 3 }}>
                <ProductCard product={product} />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

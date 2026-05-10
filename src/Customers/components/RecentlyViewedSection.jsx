import { Box, Button, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { colors } from "../../theme/theme";
import ProductCard from "./ProductCard";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";

const sameId = (a, b) => String(a ?? "") === String(b ?? "");

export default function RecentlyViewedSection({
  excludeProductId = "",
  title = "Recently viewed",
  showClear = false,
  dense = false,
}) {
  const { products, loading, busy, clearAllRecentlyViewed } = useRecentlyViewed();

  const visible = excludeProductId
    ? products.filter((p) => !sameId(p?.id ?? p?._id ?? p?.productId, excludeProductId))
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
    <Box sx={{ mt: dense ? 0 : { xs: 3, sm: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
          {title}
        </Typography>
        {showClear && visible.length > 0 ? (
          <Button
            size="small"
            variant="text"
            disabled={busy}
            onClick={() => void handleClear()}
            sx={{ textTransform: "none", fontWeight: 700, color: alpha(colors.text, 0.65) }}
          >
            Clear
          </Button>
        ) : null}
      </Stack>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((key) => (
            <Grid key={key} size={{ xs: 6, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={dense ? 260 : 300} sx={{ borderRadius: 2.5 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {visible.map((product, index) => {
            const key = product?.id || product?._id || product?.productId || product?.slug || `rv-${index}`;
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

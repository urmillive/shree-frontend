import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { colors } from "../../theme/theme";
import {
  resolveProductImage,
  resolveProductName,
  resolveProductPrice,
} from "../services/publicProductsService";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const getCategoryName = (product) =>
  product?.category?.name || product?.categoryName || product?.category?.slug || product?.category || "";

export default function ProductCard({ product }) {
  const name = resolveProductName(product);
  const image = resolveProductImage(product);
  const price = resolveProductPrice(product);
  const category = getCategoryName(product);
  const fabric = product?.fabric || "";
  const size = Array.isArray(product?.sizes) ? product.sizes.join(", ") : product?.size || "";
  const flags = [
    product?.isTrending ? "Trending" : "",
    product?.isFeatured ? "Featured" : "",
    product?.isBestSeller ? "Best Seller" : "",
  ].filter(Boolean);
  const productSlug = product?.slug || product?.id || product?._id || "";

  return (
    <Card
      elevation={2}
      sx={{
        height: "100%",
        borderRadius: 2.5,
        border: `1px solid ${alpha(colors.text, 0.08)}`,
        transition: "transform .2s ease, box-shadow .2s ease",
        "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
      }}
    >
      <CardActionArea
        component={productSlug ? RouterLink : "div"}
        to={productSlug ? `/products/${productSlug}` : undefined}
        sx={{ height: "100%" }}
      >
        {image ? (
          <CardMedia component="img" image={image} alt={name} sx={{ height: 220, objectFit: "cover" }} />
        ) : (
          <Box sx={{ height: 220, bgcolor: alpha(colors.primary, 0.08), display: "grid", placeItems: "center" }}>
            <Typography sx={{ fontWeight: 700, color: alpha(colors.text, 0.45) }}>No image</Typography>
          </Box>
        )}

        <CardContent sx={{ display: "grid", gap: 1.1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {name}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: colors.primary }}>
            {INR.format(price)}
          </Typography>

          {/* <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
            {category ? <Chip label={category} size="small" variant="outlined" /> : null}
            {fabric ? <Chip label={fabric} size="small" variant="outlined" /> : null}
            {size ? <Chip label={`Size: ${size}`} size="small" variant="outlined" /> : null}
            {flags.map((flag) => (
              <Chip
                key={flag}
                label={flag}
                size="small"
                sx={{ bgcolor: alpha(colors.primary, 0.12), color: colors.text, border: `1px solid ${alpha(colors.primary, 0.35)}` }}
              />
            ))}
          </Stack> */}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

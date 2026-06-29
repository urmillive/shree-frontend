import { Box, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { colors, fonts } from "../../theme/theme";
import {
  resolveProductImage,
  resolveProductName,
  resolveProductPrice,
} from "../services/publicProductsService";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const getCategoryName = (product) =>
  product?.category?.name ||
  product?.categoryName ||
  product?.category?.slug ||
  product?.category ||
  "";

const getFlag = (product) => {
  if (product?.isBestSeller) return "Best Seller";
  if (product?.isFeatured) return "Featured";
  if (product?.isTrending) return "Trending";
  return "";
};

export default function ProductCard({ product, priceColor, imageRadius }) {
  const name = resolveProductName(product);
  const image = resolveProductImage(product);
  const price = resolveProductPrice(product);
  const category = getCategoryName(product);
  const flag = getFlag(product);
  const productSlug = product?.slug || product?.id || product?._id || "";

  const InteractiveWrapper = productSlug ? RouterLink : "div";
  const linkProps = productSlug ? { to: `/products/${productSlug}` } : {};

  return (
    <Box
      component={InteractiveWrapper}
      {...linkProps}
      sx={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        height: "100%",
        "&:hover .sg-card-img": { transform: "scale(1.04)" },
        "&:hover .sg-card-name": { color: colors.wine },
      }}
    >
      <Box
        sx={{
          position: "relative",
          aspectRatio: "3 / 4",
          overflow: "hidden",
          bgcolor: colors.stone,
          borderRadius: imageRadius ?? 0,
          mb: 1.5,
        }}
      >
        {image ? (
          <Box
            component="img"
            className="sg-card-img"
            src={image}
            alt={name}
            loading="lazy"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 600ms cubic-bezier(0.2,0.7,0.2,1)",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontSize: 28,
                color: colors.muted,
              }}
            >
              {name?.charAt(0) || "S"}
            </Typography>
          </Box>
        )}

      
      </Box>

     
    </Box>
  );
}

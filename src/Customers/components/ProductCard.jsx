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

        {flag ? (
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              bgcolor: colors.ivory,
              color: colors.ink,
              fontFamily: fonts.body,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 500,
              px: 1.25,
              py: 0.5,
            }}
          >
            {flag}
          </Box>
        ) : null}
      </Box>

      <Stack spacing={0.5} sx={{ px: 0.25 }}>
        {category ? (
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: colors.muted,
              fontWeight: 500,
            }}
          >
            {category}
          </Typography>
        ) : null}
        <Typography
          className="sg-card-name"
          sx={{
            fontFamily: fonts.display,
            fontSize: { xs: 17, sm: 18 },
            fontWeight: 500,
            lineHeight: 1.25,
            color: colors.ink,
            transition: "color 200ms cubic-bezier(0.2,0.7,0.2,1)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: 13.5,
            fontWeight: 600,
            color: priceColor ?? colors.ink,
            letterSpacing: "0.02em",
            pt: 0.25,
          }}
        >
          {INR.format(price)}
        </Typography>
      </Stack>
    </Box>
  );
}

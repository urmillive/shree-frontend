import { Box, Grid, Typography } from "@mui/material";
import { colors, fonts } from "../../theme/theme";

const tileSx = {
  position: "relative",
  display: "block",
  aspectRatio: "4 / 5",
  overflow: "hidden",
  bgcolor: colors.stone,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  border: "none",
  p: 0,
  "&:hover .sg-cat-img": { transform: "scale(1.04)" },
  "&:hover .sg-cat-name": { color: colors.wine },
};

export default function CategoryGrid({
  categories,
  title,
  onCategoryClick,
  onViewAll,
}) {
  return (
    <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
      {onViewAll ? (
        <Grid size={{ xs: 6, sm: 6, md: 4 }}>
          <Box
            component="button"
            type="button"
            onClick={onViewAll}
            sx={{
              ...tileSx,
              bgcolor: colors.ink,
              color: colors.ivory,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={{ textAlign: "center", px: 2 }}>
              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontSize: { xs: 22, sm: 28 },
                  fontWeight: 500,
                  color: colors.ivory,
                  lineHeight: 1.15,
                }}
              >
                View all
              </Typography>
              <Typography
                sx={{
                  mt: 1,
                  fontFamily: fonts.body,
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: colors.stone,
                }}
              >
                {title}
              </Typography>
            </Box>
          </Box>
        </Grid>
      ) : null}

      {categories.map((category) => {
        const imageUrl =
          category?.image?.url ||
          category?.imageUrl ||
          category?.thumbnailUrl ||
          "";
        const name = category?.name || "Category";

        return (
          <Grid
            key={category._id || category.slug || category.name}
            size={{ xs: 6, sm: 6, md: 4 }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => onCategoryClick(category)}
              sx={tileSx}
            >
              {imageUrl ? (
                <Box
                  component="img"
                  className="sg-cat-img"
                  src={imageUrl}
                  alt={name}
                  loading="lazy"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition:
                      "transform 600ms cubic-bezier(0.2,0.7,0.2,1)",
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
                      fontSize: 36,
                      color: colors.muted,
                    }}
                  >
                    {name.charAt(0)}
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.35) 100%)",
                  pointerEvents: "none",
                }}
              />

              <Box
                sx={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  bottom: 16,
                  color: colors.ivory,
                }}
              >
                <Typography
                  className="sg-cat-name"
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: { xs: 20, sm: 24 },
                    fontWeight: 500,
                    color: colors.ivory,
                    lineHeight: 1.15,
                    transition: "color 200ms cubic-bezier(0.2,0.7,0.2,1)",
                  }}
                >
                  {name}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    fontFamily: fonts.body,
                    fontSize: 10.5,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: colors.ivory,
                    opacity: 0.85,
                  }}
                >
                  Shop now →
                </Typography>
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

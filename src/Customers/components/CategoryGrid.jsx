import { Card, CardActionArea, CardContent, CardMedia, Grid, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { colors } from "../../theme/theme";

export default function CategoryGrid({ categories, title, onCategoryClick, onViewAll }) {
  return (
    <Grid container spacing={2}>
      {onViewAll ? (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            elevation={2}
            sx={{
              height: "100%",
              borderRadius: 2,
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
              "&:hover": { transform: "translateY(-4px) scale(1.02)", boxShadow: 8 },
            }}
          >
            <CardActionArea onClick={onViewAll} sx={{ height: "100%" }}>
              <CardContent sx={{ minHeight: 180, display: "grid", placeItems: "center", textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  View All
                </Typography>
                <Typography variant="body2" sx={{ color: alpha(colors.text, 0.6) }}>
                  See all categories under {title}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ) : null}

      {categories.map((category) => {
        const imageUrl = category?.image?.url || category?.imageUrl || category?.thumbnailUrl || "";
        return (
          <Grid key={category._id || category.slug || category.name} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              elevation={2}
              sx={{
                borderRadius: 2,
                height: "100%",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                "&:hover": { transform: "translateY(-4px) scale(1.02)", boxShadow: 8 },
              }}
            >
              <CardActionArea onClick={() => onCategoryClick(category)} sx={{ height: "100%" }}>
                {imageUrl ? (
                  <CardMedia component="img" image={imageUrl} alt={category.name || "Category"} sx={{ height: 160, objectFit: "cover" }} />
                ) : (
                  <CardMedia sx={{ height: 160, bgcolor: alpha(colors.primary, 0.1) }} />
                )}
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {category.name || "Category"}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

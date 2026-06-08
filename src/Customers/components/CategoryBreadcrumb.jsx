import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { colors, fonts } from "../../theme/theme";

const linkSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
  textDecoration: "none",
  transition: "color 200ms cubic-bezier(0.2,0.7,0.2,1)",
  "&:hover": { color: colors.ink },
};

const Separator = () => (
  <Box
    component="span"
    sx={{
      mx: 1.25,
      color: colors.muted,
      opacity: 0.6,
      fontSize: 11,
    }}
  >
    /
  </Box>
);

const CategoryBreadcrumb = ({ items = [] }) => {
  const list = Array.isArray(items) ? items : [];

  return (
    <Box
      component="nav"
      aria-label="Category breadcrumb"
      sx={{
        mb: 3,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Box component={RouterLink} to="/" sx={linkSx}>
        Home
      </Box>
      <Separator />
      <Box component={RouterLink} to="/categories" sx={linkSx}>
        All categories
      </Box>

      {list.map((crumb, index) => {
        const isLast = index === list.length - 1;
        const name =
          crumb?.name != null && String(crumb.name).trim()
            ? String(crumb.name).trim()
            : "Category";
        const slug =
          crumb?.slug != null && String(crumb.slug).trim()
            ? String(crumb.slug).trim()
            : "";

        if (isLast) {
          return (
            <Box
              key={`${slug || "leaf"}-${index}`}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Separator />
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: colors.ink,
                }}
              >
                {name}
              </Typography>
            </Box>
          );
        }

        if (!slug) {
          return (
            <Box key={`n-${index}`} sx={{ display: "flex", alignItems: "center" }}>
              <Separator />
              <Typography sx={{ ...linkSx, cursor: "default" }}>{name}</Typography>
            </Box>
          );
        }

        return (
          <Box key={slug} sx={{ display: "flex", alignItems: "center" }}>
            <Separator />
            <Box
              component={RouterLink}
              to={`/categories/${encodeURIComponent(slug)}`}
              sx={linkSx}
            >
              {name}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default CategoryBreadcrumb;

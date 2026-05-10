import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { colors } from "../../theme/theme";

/**
 * Renders server breadcrumb items: [{ name, slug }, ...].
 * Last segment is the current page (not linked).
 */
const CategoryBreadcrumb = ({ items = [] }) => {
  const list = Array.isArray(items) ? items : [];

  return (
    <Breadcrumbs
      aria-label="Category breadcrumb"
      separator="›"
      sx={{
        mb: 2,
        flexWrap: "wrap",
        "& .MuiBreadcrumbs-separator": {
          color: alpha(colors.text, 0.45),
          fontSize: 15,
        },
      }}
    >
      <Link component={RouterLink} to="/" underline="hover" sx={{ color: colors.primary, fontWeight: 600, fontSize: 14 }}>
        Home
      </Link>
      <Link
        component={RouterLink}
        to="/categories"
        underline="hover"
        sx={{ color: colors.primary, fontWeight: 600, fontSize: 14 }}
      >
        All categories
      </Link>
      {list.map((crumb, index) => {
        const isLast = index === list.length - 1;
        const name = crumb?.name != null && String(crumb.name).trim() ? String(crumb.name).trim() : "Category";
        const slug =
          crumb?.slug != null && String(crumb.slug).trim() ? String(crumb.slug).trim() : "";

        if (isLast) {
          return (
            <Typography key={`${slug || "leaf"}-${index}`} sx={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
              {name}
            </Typography>
          );
        }

        if (!slug) {
          return (
            <Typography key={`n-${index}`} sx={{ fontWeight: 600, fontSize: 14, color: alpha(colors.text, 0.72) }}>
              {name}
            </Typography>
          );
        }

        return (
          <Link
            key={slug}
            component={RouterLink}
            to={`/categories/${encodeURIComponent(slug)}`}
            underline="hover"
            sx={{ color: colors.primary, fontWeight: 600, fontSize: 14 }}
          >
            {name}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default CategoryBreadcrumb;

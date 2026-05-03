import React from "react";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const accent = "#ab8a48";

const AdminBreadcrumb = ({ items = [] }) => {
  const navigate = useNavigate();

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <Breadcrumbs
      aria-label="admin breadcrumb"
      separator="›"
      sx={{
        mb: 2,
        "& .MuiBreadcrumbs-separator": {
          color: alpha("#1f2a24", 0.5),
          fontSize: 15,
          mt: "1px",
        },
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (!item?.to || isLast) {
          return (
            <Typography
              key={`${item?.label || "crumb"}-${index}`}
              sx={{
                color: isLast ? "#1f2a24" : alpha("#1f2a24", 0.7),
                fontSize: 14,
                fontWeight: isLast ? 700 : 500,
              }}
            >
              {item?.label || "Untitled"}
            </Typography>
          );
        }

        return (
          <Link
            key={`${item.label}-${index}`}
            component="button"
            type="button"
            underline="hover"
            onClick={() => navigate(item.to)}
            sx={{
              color: accent,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              border: 0,
              bgcolor: "transparent",
              p: 0,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default AdminBreadcrumb;

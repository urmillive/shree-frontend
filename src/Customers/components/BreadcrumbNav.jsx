import { Box, Typography } from "@mui/material";
import { colors, fonts } from "../../theme/theme";

const itemSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  transition: "color 200ms cubic-bezier(0.2,0.7,0.2,1)",
  "&:hover": { color: colors.ink },
};

const separator = (
  <Box
    component="span"
    sx={{
      color: colors.muted,
      mx: 1.25,
      fontSize: 11,
      fontWeight: 400,
      opacity: 0.6,
    }}
  >
    /
  </Box>
);

export default function BreadcrumbNav({ stack, onNavigate }) {
  return (
    <Box
      component="nav"
      aria-label="category breadcrumb"
      sx={{ mb: 2.5, display: "flex", flexWrap: "wrap", alignItems: "center" }}
    >
      <Box component="button" type="button" onClick={() => onNavigate(-1)} sx={itemSx}>
        Home
      </Box>
      {stack.map((node, index) => {
        const isLast = index === stack.length - 1;
        const key = node?._id || node?.slug || `crumb-${index}`;
        return (
          <Box key={key} sx={{ display: "flex", alignItems: "center" }}>
            {separator}
            {isLast ? (
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
                {node.name}
              </Typography>
            ) : (
              <Box
                component="button"
                type="button"
                onClick={() => onNavigate(index)}
                sx={itemSx}
              >
                {node.name}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

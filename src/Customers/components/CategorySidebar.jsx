import { Box, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { colors, fonts } from "../../theme/theme";

export default function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelect,
}) {
  return (
    <Box
      sx={{
        borderTop: `1px solid ${colors.line}`,
        borderBottom: `1px solid ${colors.line}`,
        bgcolor: colors.paper,
      }}
    >
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: colors.ink,
          px: 2,
          py: 2.25,
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        Categories
      </Typography>
      <List disablePadding>
        {categories.map((category) => {
          const selected = selectedCategoryId === category._id;
          return (
            <ListItemButton
              key={category._id ?? category.id}
              selected={selected}
              onClick={() => onSelect(category)}
              sx={{
                px: 2,
                py: 1.25,
                borderLeft: "2px solid transparent",
                borderRadius: 0,
                "&.Mui-selected": {
                  bgcolor: "transparent",
                  borderLeftColor: colors.ink,
                },
                "&.Mui-selected:hover": { bgcolor: "transparent" },
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              <ListItemText
                primary={category.name}
                primaryTypographyProps={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  fontWeight: selected ? 600 : 400,
                  color: selected ? colors.ink : colors.ink2,
                  textTransform: "none",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

import { List, ListItemButton, ListItemText, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { colors } from "../../theme/theme";

export default function CategorySidebar({ categories, selectedCategoryId, onSelect }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${alpha(colors.text, 0.12)}`,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, p: 2, borderBottom: `1px solid ${alpha(colors.text, 0.08)}` }}>
        Main Categories
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
                transition: "all 0.2s ease",
                "&.Mui-selected": {
                  bgcolor: alpha(colors.primary, 0.12),
                  borderLeft: `4px solid ${colors.primary}`,
                },
                "&.Mui-selected:hover": {
                  bgcolor: alpha(colors.primary, 0.18),
                },
              }}
            >
              <ListItemText
                primary={category.name}
                primaryTypographyProps={{
                  fontWeight: selected ? 700 : 500,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}

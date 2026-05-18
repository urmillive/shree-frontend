import React from "react";
import { Chip, Stack, Typography } from "@mui/material";
import { filterChipSx } from "./adminListTheme";

const AdminActiveFilterChips = ({ filters = [] }) => {
  if (!filters.length) return null;

  return (
    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ color: "#6f7f77", fontWeight: 600 }}>
        Active filters:
      </Typography>
      {filters.map((filter) => (
        <Chip key={filter.key} size="small" label={filter.label} onDelete={filter.onRemove} sx={filterChipSx} />
      ))}
    </Stack>
  );
};

export default AdminActiveFilterChips;

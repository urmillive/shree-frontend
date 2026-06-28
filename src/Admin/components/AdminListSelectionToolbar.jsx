import React from "react";
import { Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { accent } from "./adminListTheme";

const AdminListSelectionToolbar = ({
  selectedCount = 0,
  totalVisible = 0,
  onExport,
  onClearSelection,
  exportLabel = "Export",
}) => {
  if (totalVisible === 0 && selectedCount === 0) return null;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ sm: "center" }}
      justifyContent="space-between"
      sx={{ mb: 1.5 }}
    >
      <Typography variant="body2" sx={{ color: "#6f7f77", fontWeight: 600 }}>
        {selectedCount > 0
          ? `${selectedCount} row${selectedCount === 1 ? "" : "s"} selected`
          : `${totalVisible} row${totalVisible === 1 ? "" : "s"} on this page`}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {selectedCount > 0 ? (
          <Button size="small" variant="text" onClick={onClearSelection} sx={{ textTransform: "none", fontWeight: 700, color: "#2a4135" }}>
            Clear selection
          </Button>
        ) : null}
        <Button
          size="small"
          variant="contained"
          onClick={onExport}
          disabled={totalVisible === 0 && selectedCount === 0}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: accent,
            boxShadow: "none",
            "&:hover": { bgcolor: "#8f723c", boxShadow: `0 6px 18px ${alpha(accent, 0.35)}` },
          }}
        >
          {selectedCount > 0 ? `${exportLabel} selected` : `${exportLabel} all`}
        </Button>
      </Stack>
    </Stack>
  );
};

export default AdminListSelectionToolbar;

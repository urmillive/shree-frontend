import { alpha } from "@mui/material/styles";

export const accent = "#ab8a48";
export const pageBg = "#ffffff";

export const filterControlSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "20px",
    "& fieldset": { borderRadius: "20px" },
  },
};

export const filterChipSx = {
  fontWeight: 600,
  bgcolor: alpha(accent, 0.1),
  color: "#2a4135",
  border: `1px solid ${alpha(accent, 0.28)}`,
  "& .MuiChip-deleteIcon": {
    color: alpha("#2a4135", 0.55),
    "&:hover": { color: "#2a4135" },
  },
};

export const tableContainerSx = {
  borderRadius: 2,
  border: `1px solid ${alpha("#0f3828", 0.1)}`,
  boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
};

export const tableHeaderCellSx = {
  fontWeight: 700,
  color: "#2a4135",
};

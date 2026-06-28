import React from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { filterControlSx } from "./adminListTheme";

const AdminFilterSelect = ({
  labelId,
  label,
  value,
  onChange,
  options = [],
  minWidth = 160,
  sx,
  size = "small",
}) => (
  <FormControl size={size} sx={{ minWidth, ...filterControlSx, ...sx }}>
    <InputLabel id={labelId}>{label}</InputLabel>
    <Select labelId={labelId} label={label} value={value} onChange={onChange}>
      {options.map((option) => (
        <MenuItem key={option.value || "all"} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default AdminFilterSelect;

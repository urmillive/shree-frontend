import React from "react";
import { TextField } from "@mui/material";
import { filterControlSx } from "./adminListTheme";

const AdminFilterDateField = ({ label, value, onChange, sx, size = "small" }) => (
  <TextField
    label={label}
    type="date"
    size={size}
    value={value}
    onChange={onChange}
    InputLabelProps={{ shrink: true }}
    sx={{ ...filterControlSx, ...sx }}
  />
);

export default AdminFilterDateField;

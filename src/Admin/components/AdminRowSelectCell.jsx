import React from "react";
import { Checkbox, TableCell } from "@mui/material";

const AdminRowSelectCell = ({ checked, onChange, disabled = false }) => (
  <TableCell
    padding="checkbox"
    onClick={(event) => event.stopPropagation()}
    sx={{ width: 48, py: 0.5 }}
  >
    <Checkbox
      size="small"
      color="primary"
      checked={checked}
      disabled={disabled}
      onChange={(event) => {
        event.stopPropagation();
        onChange?.(event);
      }}
      onClick={(event) => event.stopPropagation()}
      inputProps={{ "aria-label": checked ? "Deselect row" : "Select row" }}
    />
  </TableCell>
);

export default AdminRowSelectCell;

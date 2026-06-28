import React from "react";
import { Checkbox, TableCell, TableHead, TableRow, TableSortLabel } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { tableHeaderCellSx } from "./adminListTheme";

const AdminSortableTableHead = ({
  columns = [],
  sortBy,
  sortOrder,
  onSort,
  selectable = false,
  allSelected = false,
  indeterminate = false,
  onToggleSelectAll,
  selectAllDisabled = false,
}) => (
  <TableHead>
    <TableRow sx={{ bgcolor: alpha("#ab8a48", 0.08) }}>
      {selectable ? (
        <TableCell padding="checkbox" sx={{ width: 48, py: 0.5 }}>
          <Checkbox
            size="small"
            color="primary"
            checked={allSelected}
            indeterminate={indeterminate}
            disabled={selectAllDisabled}
            onChange={onToggleSelectAll}
            inputProps={{ "aria-label": allSelected ? "Deselect all rows" : "Select all rows" }}
          />
        </TableCell>
      ) : null}
      {columns.map((column) => {
        const sortable = column.sortable !== false;
        const isActive = sortable && sortBy === column.id;

        return (
          <TableCell
            key={column.id}
            align={column.align}
            sx={{
              ...tableHeaderCellSx,
              textTransform: column.capitalize === false ? "none" : column.capitalize ? "capitalize" : "capitalize",
              ...column.sx,
            }}
          >
            {sortable ? (
              <TableSortLabel active={isActive} direction={isActive ? sortOrder : "asc"} onClick={() => onSort(column.id)}>
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        );
      })}
    </TableRow>
  </TableHead>
);

export default AdminSortableTableHead;

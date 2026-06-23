import React from "react";
import { CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import AdminSortableTableHead from "./AdminSortableTableHead";
import { accent, tableContainerSx } from "./adminListTheme";

const AdminListTable = ({
  columns = [],
  sortBy,
  sortOrder,
  onSort,
  loading = false,
  isEmpty = false,
  emptyMessage = "No results found.",
  children,
  pagination = null,
  selectable = false,
  allSelected = false,
  indeterminate = false,
  onToggleSelectAll,
  selectAllDisabled = false,
}) => {
  const colSpan = Math.max(columns.length, 1) + (selectable ? 1 : 0);

  return (
    <TableContainer component={Paper} elevation={0} sx={tableContainerSx}>
      <Table size="small">
        <AdminSortableTableHead
          columns={columns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
          selectable={selectable}
          allSelected={allSelected}
          indeterminate={indeterminate}
          onToggleSelectAll={onToggleSelectAll}
          selectAllDisabled={selectAllDisabled}
        />
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                <CircularProgress size={28} sx={{ color: accent }} />
              </TableCell>
            </TableRow>
          ) : isEmpty ? (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: "#6f7f77" }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
      {pagination}
    </TableContainer>
  );
};

export default AdminListTable;

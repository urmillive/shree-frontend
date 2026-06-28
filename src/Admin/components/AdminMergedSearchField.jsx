import React from "react";
import { Box, IconButton, InputAdornment, MenuItem, Select, TextField } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FiSearch } from "react-icons/fi";
import { filterControlSx } from "./adminListTheme";

const mergedSearchSx = {
  maxWidth: { md: 400 },
  flex: { md: "1 1 320px" },
  ...filterControlSx,
};

const searchBySelectSx = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#2a4135",
  minWidth: 72,
  "& .MuiSelect-select": { py: 0.5, pl: 1, pr: "24px !important" },
  "&:before, &:after": { display: "none" },
};

const searchFieldDividerSx = {
  width: "1px",
  height: 22,
  bgcolor: alpha("#0f3828", 0.12),
  mx: 0.75,
  flexShrink: 0,
};

const AdminMergedSearchField = ({
  searchOptions = [],
  searchTypeInput,
  onSearchTypeChange,
  searchInput,
  onSearchInputChange,
  onSearch,
  placeholder,
  sx,
  fullWidth = true,
}) => (
  <TextField
    size="small"
    placeholder={placeholder}
    value={searchInput}
    onChange={(e) => onSearchInputChange(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch();
      }
    }}
    fullWidth={fullWidth}
    sx={{ ...mergedSearchSx, ...sx }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start" sx={{ mr: 0, maxHeight: "unset" }}>
          <Select
            value={searchTypeInput}
            onChange={(e) => onSearchTypeChange(e.target.value)}
            variant="standard"
            disableUnderline
            sx={searchBySelectSx}
          >
            {searchOptions.map((option) => (
              <MenuItem key={option.value} value={option.value} dense>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <Box component="span" sx={searchFieldDividerSx} />
        </InputAdornment>
      ),
      endAdornment: (
        <InputAdornment position="end">
          <IconButton size="small" aria-label="Search" onClick={onSearch} edge="end" sx={{ color: "#6f7f77" }}>
            <FiSearch size={17} />
          </IconButton>
        </InputAdornment>
      ),
    }}
  />
);

export default AdminMergedSearchField;

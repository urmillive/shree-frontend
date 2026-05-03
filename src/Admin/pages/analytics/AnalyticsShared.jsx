import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { exportRowsToCsv, exportRowsToPdf } from "../../utils/reportExport";

const accent = "#ab8a48";

export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
};

export const formatCount = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN").format(amount);
};

export const DateFilterBar = ({ from, to, onFrom, onTo, extraControls }) => (
  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }}>
    <TextField label="From" type="date" size="small" value={from} onChange={(e) => onFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
    <TextField label="To" type="date" size="small" value={to} onChange={(e) => onTo(e.target.value)} InputLabelProps={{ shrink: true }} />
    {extraControls}
  </Stack>
);

export const ExportButtons = ({ csvName, pdfName, pdfTitle, columns, rows, filters }) => (
  <Stack direction="row" spacing={1}>
    <Button
      variant="outlined"
      size="small"
      onClick={() => exportRowsToCsv({ filename: csvName, columns, rows })}
      disabled={!rows.length}
      sx={{ color: accent, borderColor: alpha(accent, 0.4) }}
    >
      Export CSV
    </Button>
    <Button
      variant="contained"
      size="small"
      onClick={() => exportRowsToPdf({ filename: pdfName, title: pdfTitle, filters, columns, rows })}
      disabled={!rows.length}
      sx={{ bgcolor: accent, "&:hover": { bgcolor: "#92733b" } }}
    >
      Export PDF
    </Button>
  </Stack>
);

export const AnalyticsTable = ({ columns, rows, loading, emptyText }) => (
  <Paper elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, overflow: "hidden" }}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: alpha(accent, 0.08) }}>
          {columns.map((column) => (
            <TableCell key={column.key} sx={{ fontWeight: 700 }}>
              {column.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columns.length} align="center" sx={{ py: 5 }}>
              <CircularProgress size={26} sx={{ color: accent }} />
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, rowIndex) => (
            <TableRow key={row.id || row._id || `row-${rowIndex}`} hover>
              {columns.map((column) => (
                <TableCell key={column.key}>{column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "—")}</TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </Paper>
);

export const ReportShell = ({ title, subtitle, actions, children, error }) => (
  <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2.5, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f6d66" }}>
          {subtitle}
        </Typography>
      </Box>
      {actions}
    </Stack>
    {error ? (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    ) : null}
    {children}
  </Paper>
);

export const GroupByControl = ({ value, onChange }) => (
  <TextField
    select
    label="Group By"
    size="small"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    sx={{ minWidth: 140 }}
  >
    <MenuItem value="day">Day</MenuItem>
    <MenuItem value="month">Month</MenuItem>
  </TextField>
);

export const AnalyticsCards = ({ cards }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
      gap: 1.5,
    }}
  >
    {cards.map((card) => (
      <Paper
        key={card.title}
        component={card.to ? RouterLink : "div"}
        to={card.to}
        sx={{
          p: 2,
          textDecoration: "none",
          color: "inherit",
          border: `1px solid ${alpha("#0f3828", 0.12)}`,
          borderRadius: 2,
          transition: "all .14s ease",
          "&:hover": card.to
            ? {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 20px rgba(20,55,42,0.1)",
                borderColor: alpha(accent, 0.5),
              }
            : undefined,
        }}
      >
        <Typography sx={{ fontWeight: 700, color: "#21342b" }}>{card.title}</Typography>
        <Typography variant="body2" sx={{ color: "#5f6d66", mt: 0.5 }}>
          {card.description}
        </Typography>
      </Paper>
    ))}
  </Box>
);

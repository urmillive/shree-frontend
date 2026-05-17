import React, { useEffect, useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import { fetchCustomersReport } from "../../services/analyticsService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { AnalyticsTable, DateFilterBar, ExportButtons, ReportShell, formatCount, formatCurrency } from "./AnalyticsShared";

const CustomersAnalyticsPage = () => {
  const [from, setFrom] = useState("2024-01-01");
  const [to, setTo] = useState("2024-01-31");
  const [summary, setSummary] = useState({ newCustomers: 0, returningCustomers: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchCustomersReport({ from, to });
        const top = payload?.topCustomers || payload?.items || payload?.customers || [];
        if (isMounted) {
          setSummary({
            newCustomers: Number(payload?.newCustomers ?? payload?.new ?? 0),
            returningCustomers: Number(payload?.returningCustomers ?? payload?.returning ?? 0),
          });
          setRows(Array.isArray(top) ? top : []);
        }
      } catch (e) {
        if (isMounted) setError(getApiErrorMessage(e, "Failed to load customer stats."));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [from, to]);

  const normalizedRows = rows.map((row) => ({
    customer: row.customerName || row.name || row.email || row.customerId || "Unknown",
    orders: Number(row.orders ?? row.orderCount ?? 0),
    spend: Number(row.spend ?? row.totalSpend ?? row.revenue ?? 0),
  }));

  const columns = [
    { key: "customer", label: "Customer" },
    { key: "orders", label: "Orders", render: (value) => formatCount(value) },
    { key: "spend", label: "Spend", render: (value) => formatCurrency(value) },
  ];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "#fff" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1150, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Analytics", to: "/admin/analytics" }, { label: "Customers" }]} />
        <ReportShell
          title="Customer Stats"
          subtitle="Track new/returning users and top spenders."
          error={error}
          actions={
            <ExportButtons
              csvName="customer-stats-report.csv"
              pdfName="customer-stats-report.pdf"
              pdfTitle="Customer Stats"
              rows={normalizedRows}
              columns={columns}
              filters={[
                `From: ${from}`,
                `To: ${to}`,
                `New Customers: ${summary.newCustomers}`,
                `Returning Customers: ${summary.returningCustomers}`,
              ]}
            />
          }
        >
          <DateFilterBar from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, flex: 1 }}>
              <Typography variant="body2" sx={{ color: "#5c6a64" }}>
                New Customers
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {formatCount(summary.newCustomers)}
              </Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.12)}`, flex: 1 }}>
              <Typography variant="body2" sx={{ color: "#5c6a64" }}>
                Returning Customers
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {formatCount(summary.returningCustomers)}
              </Typography>
            </Paper>
          </Stack>
          <AnalyticsTable columns={columns} rows={normalizedRows} loading={loading} emptyText="No top customer data available for selected range." />
        </ReportShell>
      </Box>
    </Box>
  );
};

export default CustomersAnalyticsPage;

import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import { fetchRevenueReport } from "../../services/analyticsService";
import { AnalyticsTable, DateFilterBar, ExportButtons, GroupByControl, ReportShell } from "./AnalyticsShared";
import { formatCurrency, formatCount } from "./analyticsFormatters";

const RevenueAnalyticsPage = () => {
  const [from, setFrom] = useState("2024-01-01");
  const [to, setTo] = useState("2024-01-31");
  const [groupBy, setGroupBy] = useState("day");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchRevenueReport({ from, to, groupBy });
        const reportRows = Array.isArray(payload) ? payload : payload?.breakdown || payload?.items || [];
        if (isMounted) setRows(reportRows);
      } catch (e) {
        if (isMounted) setError(e?.response?.data?.message || e?.message || "Failed to load revenue report.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [from, to, groupBy]);

  const totalRevenue = useMemo(() => rows.reduce((sum, row) => sum + Number(row.revenue ?? row.amount ?? 0), 0), [rows]);

  const normalizedRows = rows.map((row) => ({
    period: row.period || row.date || row.day || row.month || "—",
    orders: Number(row.orders ?? row.orderCount ?? 0),
    revenue: Number(row.revenue ?? row.amount ?? 0),
  }));

  const columns = [
    { key: "period", label: "Period" },
    { key: "orders", label: "Orders", render: (value) => formatCount(value) },
    { key: "revenue", label: "Revenue", render: (value) => formatCurrency(value) },
  ];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "#fff" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1150, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Analytics", to: "/admin/analytics" }, { label: "Revenue" }]} />
        <ReportShell
          title="Revenue Breakdown"
          subtitle={`Total revenue: ${formatCurrency(totalRevenue)} (${formatCount(normalizedRows.length)} periods)`}
          error={error}
          actions={
            <ExportButtons
              csvName="revenue-report.csv"
              pdfName="revenue-report.pdf"
              pdfTitle="Revenue Breakdown"
              rows={normalizedRows}
              columns={columns}
              filters={[`From: ${from}`, `To: ${to}`, `Group By: ${groupBy}`]}
            />
          }
        >
          <DateFilterBar from={from} to={to} onFrom={setFrom} onTo={setTo} extraControls={<GroupByControl value={groupBy} onChange={setGroupBy} />} />
          <AnalyticsTable columns={columns} rows={normalizedRows} loading={loading} emptyText="No revenue entries for selected range." />
        </ReportShell>
      </Box>
    </Box>
  );
};

export default RevenueAnalyticsPage;

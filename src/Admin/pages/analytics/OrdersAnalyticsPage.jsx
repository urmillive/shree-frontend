import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import { fetchOrdersReport } from "../../services/analyticsService";
import { AnalyticsTable, DateFilterBar, ExportButtons, ReportShell, formatCount } from "./AnalyticsShared";

const OrdersAnalyticsPage = () => {
  const [from, setFrom] = useState("2024-01-01");
  const [to, setTo] = useState("2024-01-31");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchOrdersReport({ from, to });
        const list = Array.isArray(payload) ? payload : payload?.breakdown || payload?.statuses || payload?.items || [];
        if (isMounted) setRows(list);
      } catch (e) {
        if (isMounted) setError(e?.response?.data?.message || e?.message || "Failed to load order breakdown.");
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
    status: row.status || row.orderStatus || "unknown",
    count: Number(row.count ?? row.total ?? row.orders ?? 0),
  }));
  const totalOrders = useMemo(() => normalizedRows.reduce((acc, row) => acc + row.count, 0), [normalizedRows]);

  const columns = [
    { key: "status", label: "Order Status" },
    { key: "count", label: "Orders", render: (value) => formatCount(value) },
  ];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "#fff" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1150, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Analytics", to: "/admin/analytics" }, { label: "Orders" }]} />
        <ReportShell
          title="Order Status Breakdown"
          subtitle={`Total orders: ${formatCount(totalOrders)}`}
          error={error}
          actions={
            <ExportButtons
              csvName="order-status-report.csv"
              pdfName="order-status-report.pdf"
              pdfTitle="Order Status Breakdown"
              rows={normalizedRows}
              columns={columns}
              filters={[`From: ${from}`, `To: ${to}`]}
            />
          }
        >
          <DateFilterBar from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <AnalyticsTable columns={columns} rows={normalizedRows} loading={loading} emptyText="No order status data for selected range." />
        </ReportShell>
      </Box>
    </Box>
  );
};

export default OrdersAnalyticsPage;

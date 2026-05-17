import React, { useEffect, useState } from "react";
import { Box, TextField } from "@mui/material";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import { fetchTopProductsReport } from "../../services/analyticsService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { AnalyticsTable, DateFilterBar, ExportButtons, ReportShell, formatCurrency, formatCount } from "./AnalyticsShared";

const TopProductsAnalyticsPage = () => {
  const [from, setFrom] = useState("2024-01-01");
  const [to, setTo] = useState("2024-01-31");
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchTopProductsReport({ from, to, limit });
        const list = Array.isArray(payload) ? payload : payload?.topProducts || payload?.items || [];
        if (isMounted) setRows(list);
      } catch (e) {
        if (isMounted) setError(getApiErrorMessage(e, "Failed to load top products."));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [from, to, limit]);

  const normalizedRows = rows.map((row, index) => ({
    rank: index + 1,
    product: row.productName || row.name || row.title || row.sku || "Unknown Product",
    quantity: Number(row.quantity ?? row.unitsSold ?? row.orders ?? 0),
    revenue: Number(row.revenue ?? row.totalRevenue ?? row.amount ?? 0),
  }));

  const columns = [
    { key: "rank", label: "#" },
    { key: "product", label: "Product" },
    { key: "quantity", label: "Units Sold", render: (value) => formatCount(value) },
    { key: "revenue", label: "Revenue", render: (value) => formatCurrency(value) },
  ];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "#fff" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1150, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Analytics", to: "/admin/analytics" }, { label: "Top Products" }]} />
        <ReportShell
          title="Top Products by Revenue"
          subtitle={`Showing top ${limit} products in selected period`}
          error={error}
          actions={
            <ExportButtons
              csvName="top-products-report.csv"
              pdfName="top-products-report.pdf"
              pdfTitle="Top Products by Revenue"
              rows={normalizedRows}
              columns={columns}
              filters={[`From: ${from}`, `To: ${to}`, `Limit: ${limit}`]}
            />
          }
        >
          <DateFilterBar
            from={from}
            to={to}
            onFrom={setFrom}
            onTo={setTo}
            extraControls={
              <TextField
                type="number"
                label="Limit"
                size="small"
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value || 10))))}
                sx={{ width: 120 }}
              />
            }
          />
          <AnalyticsTable columns={columns} rows={normalizedRows} loading={loading} emptyText="No product data for selected range." />
        </ReportShell>
      </Box>
    </Box>
  );
};

export default TopProductsAnalyticsPage;

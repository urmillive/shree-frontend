import React, { useEffect, useMemo, useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import { fetchInventoryReport } from "../../services/analyticsService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { ExportButtons, ReportShell, formatCount, formatCurrency } from "./AnalyticsShared";

const InventoryAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchInventoryReport();
        if (isMounted) setData(payload || {});
      } catch (e) {
        if (isMounted) setError(getApiErrorMessage(e, "Failed to load inventory snapshot."));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(
    () => [
      { metric: "Out of Stock", value: Number(data?.outOfStock ?? 0), type: "count" },
      { metric: "Low Stock", value: Number(data?.lowStock ?? 0), type: "count" },
      { metric: "Total Active Products", value: Number(data?.totalActiveProducts ?? 0), type: "count" },
      { metric: "Total Active Variants", value: Number(data?.totalActiveVariants ?? 0), type: "count" },
      { metric: "Estimated Stock Value", value: Number(data?.estimatedStockValue ?? 0), type: "currency" },
    ],
    [data]
  );

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "#fff" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1150, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Analytics", to: "/admin/analytics" }, { label: "Inventory" }]} />
        <ReportShell
          title="Inventory Health Snapshot"
          subtitle="Current stock health and estimated inventory value."
          error={error}
          actions={
            <ExportButtons
              csvName="inventory-health-report.csv"
              pdfName="inventory-health-report.pdf"
              pdfTitle="Inventory Health Snapshot"
              rows={rows.map((row) => ({ metric: row.metric, value: row.type === "currency" ? formatCurrency(row.value) : formatCount(row.value) }))}
              columns={[
                { key: "metric", label: "Metric" },
                { key: "value", label: "Value" },
              ]}
            />
          }
        >
          {loading ? (
            <Typography sx={{ color: "#6b7972" }}>Loading inventory report...</Typography>
          ) : (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
              {rows.map((row) => (
                <Paper
                  key={row.metric}
                  elevation={0}
                  sx={{
                    p: 1.75,
                    minWidth: { xs: "100%", sm: 230 },
                    borderRadius: 2,
                    border: `1px solid ${alpha("#0f3828", 0.12)}`,
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#5c6a64" }}>
                    {row.metric}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {row.type === "currency" ? formatCurrency(row.value) : formatCount(row.value)}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </ReportShell>
      </Box>
    </Box>
  );
};

export default InventoryAnalyticsPage;

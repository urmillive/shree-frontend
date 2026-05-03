import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import AdminNavbar from "../../components/AdminNavbar";
import { fetchReturnsReport } from "../../services/analyticsService";
import { AnalyticsTable, DateFilterBar, ExportButtons, ReportShell, formatCount } from "./AnalyticsShared";

const ReturnsAnalyticsPage = () => {
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
        const payload = await fetchReturnsReport({ from, to });
        const list = Array.isArray(payload) ? payload : payload?.breakdown || payload?.statuses || payload?.items || [];
        if (isMounted) setRows(Array.isArray(list) ? list : []);
      } catch (e) {
        if (isMounted) setError(e?.response?.data?.message || e?.message || "Failed to load returns report.");
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
    status: row.status || row.returnStatus || "unknown",
    count: Number(row.count ?? row.total ?? row.returns ?? 0),
  }));
  const totalReturns = useMemo(() => normalizedRows.reduce((acc, row) => acc + row.count, 0), [normalizedRows]);

  const columns = [
    { key: "status", label: "Return Status" },
    { key: "count", label: "Count", render: (value) => formatCount(value) },
  ];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "#fff" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1150, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Analytics", to: "/admin/analytics" }, { label: "Returns" }]} />
        <ReportShell
          title="Return Stats Breakdown"
          subtitle={`Total returns: ${formatCount(totalReturns)}`}
          error={error}
          actions={
            <ExportButtons
              csvName="returns-report.csv"
              pdfName="returns-report.pdf"
              pdfTitle="Return Stats Breakdown"
              rows={normalizedRows}
              columns={columns}
              filters={[`From: ${from}`, `To: ${to}`]}
            />
          }
        >
          <DateFilterBar from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <AnalyticsTable columns={columns} rows={normalizedRows} loading={loading} emptyText="No returns data for selected range." />
        </ReportShell>
      </Box>
    </Box>
  );
};

export default ReturnsAnalyticsPage;

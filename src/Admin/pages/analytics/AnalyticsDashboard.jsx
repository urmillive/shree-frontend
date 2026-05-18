import React from "react";
import { Box, Typography } from "@mui/material";
import AdminNavbar from "../../components/AdminNavbar";
import AdminBreadcrumb from "../../components/AdminBreadcrumb";
import { pageBg } from "../../components/adminListTheme";
import { AnalyticsCards } from "./AnalyticsShared";

const AnalyticsDashboard = () => {
  const cards = [
    { title: "Revenue Breakdown", description: "Daily or monthly revenue report.", to: "/admin/analytics/revenue" },
    { title: "Top Products", description: "Best-selling products by revenue.", to: "/admin/analytics/top-products" },
    { title: "Order Status", description: "Order count by order status.", to: "/admin/analytics/orders" },
    { title: "Customer Stats", description: "New/returning customers and top spenders.", to: "/admin/analytics/customers" },
    { title: "Inventory Health", description: "Stock snapshot and inventory value.", to: "/admin/analytics/inventory" },
    { title: "Return Stats", description: "Return trends and status distribution.", to: "/admin/analytics/returns" },
  ];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1150, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Analytics" }]} />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Analytics Reports
        </Typography>
        <Typography sx={{ mb: 2.25, color: "#596861" }}>
          Choose any report below. All reports support sorting, filtering, and CSV export.
        </Typography>
        <AnalyticsCards cards={cards} />
      </Box>
    </Box>
  );
};

export default AnalyticsDashboard;

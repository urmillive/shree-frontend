import React, { useMemo } from "react";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  FiBarChart2,
  FiBell,
  FiCreditCard,
  FiGrid,
  FiHeart,
  FiImage,
  FiRotateCcw,
  FiSearch,
  FiShoppingBag,
  FiShoppingCart,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const adminModules = [
  { key: "users", title: "Users", icon: FiUsers, subtitle: "Auth & customer admin", path: "/admin/users" },
  { key: "categories", title: "Categories", icon: FiGrid, subtitle: "Category tree & SEO", path: "/admin/categories" },
  { key: "products", title: "Products", icon: FiShoppingBag, subtitle: "Catalog & inventory", path: "/admin/products" },
  { key: "homepage", title: "Homepage CMS", icon: FiImage, subtitle: "Banners & sections", path: "/admin/homepage-cms" },
  { key: "orders", title: "Orders", icon: FiShoppingCart, subtitle: "Customer order lifecycle", path: "/admin/orders" },
  { key: "returns", title: "Returns", icon: FiRotateCcw, subtitle: "Return approvals", path: "/admin/returns" },
  // { key: "cart", title: "Cart", icon: FiShoppingCart, subtitle: "Guest/auth cart" },
  // { key: "wishlist", title: "Wishlist", icon: FiHeart, subtitle: "Saved products" },
  // { key: "returns", title: "Returns", icon: FiRotateCcw, subtitle: "Return approvals", path: "/admin/returns" },
  // { key: "payments", title: "Payments", icon: FiCreditCard, subtitle: "Razorpay + refunds" },
  // { key: "shipping", title: "Shipping", icon: FiTruck, subtitle: "Shiprocket integration" },
  // { key: "notifications", title: "Notifications", icon: FiBell, subtitle: "In-app alerts" },
  // { key: "search", title: "Search", icon: FiSearch, subtitle: "Search & recommendations" },
  // { key: "analytics", title: "Analytics", icon: FiBarChart2, subtitle: "Revenue & KPIs" },
  // { key: "categories", title: "Categories", icon: FiGrid, subtitle: "Category tree & SEO" },
  // { key: "products", title: "Products", icon: FiShoppingBag, subtitle: "Catalog & inventory" },
  // { key: "homepage", title: "Homepage CMS", icon: FiImage, subtitle: "Banners & sections" },
  // { key: "orders", title: "Orders", icon: FiShoppingCart, subtitle: "Customer order lifecycle" },
  // { key: "cart", title: "Cart", icon: FiShoppingCart, subtitle: "Guest/auth cart" },
  // { key: "wishlist", title: "Wishlist", icon: FiHeart, subtitle: "Saved products" },
  // { key: "returns", title: "Returns", icon: FiRotateCcw, subtitle: "Return approvals" },
  // { key: "payments", title: "Payments", icon: FiCreditCard, subtitle: "Razorpay + refunds" },
  // { key: "shipping", title: "Shipping", icon: FiTruck, subtitle: "Shiprocket integration" },
  // { key: "notifications", title: "Notifications", icon: FiBell, subtitle: "In-app alerts" },
  // { key: "search", title: "Search", icon: FiSearch, subtitle: "Search & recommendations" },
  { key: "analytics", title: "Analytics", icon: FiBarChart2, subtitle: "Revenue & KPIs", path: "/admin/analytics" },
];

const accent = "#ab8a48";
const pageBg = "#ffffff";

const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const displayName = localStorage.getItem("user_display_name") || "Admin";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  if (!["super_admin", "manager"].includes(role || "")) {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          p: 2,
          backgroundColor: pageBg,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 440,
            width: 1,
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            textAlign: "center",
            bgcolor: "#fff",
            border: `1px solid ${alpha("#0f3828", 0.12)}`,
            boxShadow: "0 10px 30px rgba(20, 55, 42, 0.08)",
          }}
        >
          <Typography variant="h6" sx={{ color: "#1f2a24", fontWeight: 700, mb: 1 }}>
            Access restricted
          </Typography>
          <Typography variant="body2" sx={{ color: "#4e5a54", lineHeight: 1.6 }}>
            This dashboard is only available to <strong style={{ color: "#1f2a24" }}>super_admin</strong> and{" "}
            <strong style={{ color: "#1f2a24" }}>manager</strong> roles.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        position: "relative",
        boxSizing: "border-box",
        backgroundColor: pageBg,
      }}
    >
      <AdminNavbar />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 1, md: 1 }, px: { xs: 2, sm: 3 } }}>
        <AdminBreadcrumb items={[{ label: "Dashboard" }]} />
        <Stack alignItems="center" sx={{ mb: 3 }}>
          
          <Typography
            variant="h4"
            component="h1"
            sx={{
              color: "#19271f",
              fontWeight: 800,
              fontSize: { xs: "1.65rem", sm: "2rem" },
              letterSpacing: -0.5,
            }}
          >
            {greeting}, {displayName}
          </Typography>
          <Typography sx={{ color: "#4f5d56", fontSize: { xs: 15, sm: 16 }, maxWidth: 560, mt: 0.5 }}>
            Manage all Shree Fashion backend modules from one place.
          </Typography>
          <Typography
            variant="overline"
            sx={{ color: "#6f7f77", letterSpacing: 2, fontSize: 11, fontWeight: 600 }}
          >
            {todayLabel}
          </Typography>
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1 }, borderRadius: 3, bgcolor: "transparent" }}>
          

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              gap: { xs: 1.2, sm: 1.5, md: 1.8 },
            }}
          >
            {adminModules.map((moduleItem) => {
              const Icon = moduleItem.icon;

              return (
                <Box
                  key={moduleItem.key}
                  sx={{ textAlign: "center" }}
                  onClick={() => {
                    if (moduleItem.path) navigate(moduleItem.path);
                  }}
                  onKeyDown={(e) => {
                    if (!moduleItem.path) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(moduleItem.path);
                    }
                  }}
                  role={moduleItem.path ? "button" : undefined}
                  tabIndex={moduleItem.path ? 0 : undefined}
                  aria-label={moduleItem.path ? `Open ${moduleItem.title}` : undefined}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      mx: "auto",
                      width: { xs: 108, sm: 116, md: 122 },
                      height: { xs: 108, sm: 116, md: 122 },
                      borderRadius: 2.2,
                      bgcolor: "#f8f8f8",
                      border: "1px solid #e5e7e6",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 8px 16px rgba(30, 58, 44, 0.11)",
                      transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                      cursor: moduleItem.path ? "pointer" : "default",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        borderColor: alpha(accent, 0.45),
                        boxShadow: "0 12px 22px rgba(30, 58, 44, 0.17)",
                      },
                    }}
                  >
                    <Icon size={44} strokeWidth={1.8} color={alpha("#ab8a48", 0.9)} />
                  </Paper>
                  <Typography
                    sx={{
                      mt: 1,
                      px: 0.5,
                      fontSize: { xs: 14, sm: 15 },
                      fontWeight: 700,
                      color: "#2a4135",
                      lineHeight: 1.25,
                      wordBreak: "break-word",
                    }}
                  >
                    {moduleItem.title}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>


      </Container>
    </Box>
  );
};

export default Dashboard;

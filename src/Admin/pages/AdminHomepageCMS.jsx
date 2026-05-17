import React, { useMemo } from "react";
import { Box, Button, Grid, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const pageBg = "#ffffff";
const accent = "#ab8a48";

const AdminHomepageCMS = () => {
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");
  const isAdminAllowed = useMemo(() => ["super_admin", "manager"].includes(roleGate || ""), [roleGate]);

  if (!isAdminAllowed) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />
      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb items={[{ label: "Dashboard", to: "/admin/dashboard" }, { label: "Homepage CMS" }]} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Typography variant="h5" sx={{ color: "#19271f", fontWeight: 800 }}>
            Homepage CMS
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 0.75 }}>Banner Management</Typography>
              <Typography variant="body2" sx={{ color: "#4e5a54", mb: 1.25 }}>
                Open banner section to view all banners, create new hero/promo banners, and manage each banner in detail.
              </Typography>
              <Button variant="outlined" onClick={() => navigate("/admin/homepage-cms/banners")} sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                Open Banner Section
              </Button>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 0.75 }}>Product List Sections</Typography>
              <Typography variant="body2" sx={{ color: "#4e5a54", mb: 1.25 }}>
                Manage `product_list` sections separately with list, create, detail view, and product ID actions.
              </Typography>
              <Button variant="outlined" onClick={() => navigate("/admin/homepage-cms/product-list-sections")} sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                Open Product List Sections
              </Button>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha("#0f3828", 0.1)}` }}>
              <Typography sx={{ fontWeight: 700, color: "#1f2a24", mb: 0.75 }}>Category Grid Sections</Typography>
              <Typography variant="body2" sx={{ color: "#4e5a54", mb: 1.25 }}>
                Manage `category_grid` sections separately with list, create, detail view, and category ID actions.
              </Typography>
              <Button variant="outlined" onClick={() => navigate("/admin/homepage-cms/category-grid-sections")} sx={{ textTransform: "none", fontWeight: 700, color: accent, borderColor: alpha(accent, 0.45) }}>
                Open Category Grid Sections
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminHomepageCMS;

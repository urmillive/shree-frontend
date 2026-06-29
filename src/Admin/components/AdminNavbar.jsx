import React, { useState } from "react";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FiGrid, FiLogOut } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import client, { clearStoredAccessToken } from "../../Setup/Axios";
import { useToast } from "../../context/useToast";

const accent = "#ab8a48";

const AdminNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = localStorage.getItem("user_display_name") || "Admin";
  const [loggingOut, setLoggingOut] = useState(false);
  const { showSuccess, showWarning } = useToast();

  const showDashboardButton = location.pathname !== "/admin/dashboard";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await client.post("/auth/logout", {});
      showSuccess("Logged out successfully.");
    } catch {
      showWarning("Session ended locally. Redirecting to login...");
    } finally {
      clearStoredAccessToken();
      setLoggingOut(false);
      setTimeout(() => navigate("/login"), 700);
    }
  };

  return (
    <>
      <Stack
        component="header"
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          px: { xs: 2, sm: 3 },
          py: 1.75,
          borderBottom: `1px solid ${alpha("#0f3828", 0.08)}`,
          bgcolor: alpha("#ffffff", 0.9),
          backdropFilter: "blur(8px)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              background: `linear-gradient(135deg, ${alpha("#ab8a48", 0.95)} 0%, ${alpha(accent, 0.95)} 100%)`,
              boxShadow: `0 8px 20px ${alpha("#2d5b45", 0.2)}`,
            }}
          >
            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: -0.5 }}>SG</Typography>
          </Box>
          <Box>
            <Typography sx={{ color: "#1c2c24", fontWeight: 700, fontSize: { xs: 15, sm: 16 }, lineHeight: 1.2 }}>
              Shree Gallary
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1.5 }} flexShrink={0}>
          {showDashboardButton ? (
            <Button
              variant="outlined"
              onClick={() => navigate("/admin/dashboard")}
              startIcon={<FiGrid size={16} />}
              aria-label="Dashboard"
              title="Dashboard"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13,
                px: { xs: 1, sm: 1.5 },
                py: 0.75,
                minWidth: 0,
                color: "#ab8a48",
                borderColor: alpha("#ab8a48", 0.36),
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } },
                "&:hover": {
                  borderColor: alpha("#ab8a48", 0.64),
                  bgcolor: alpha("#ab8a48", 0.05),
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                Dashboard
              </Box>
            </Button>
          ) : null}

          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: 15,
                fontWeight: 700,
                bgcolor: alpha(accent, 0.35),
                color: "#fff",
                border: `1px solid ${alpha("#fff", 0.2)}`,
              }}
            >
              {displayName.trim().charAt(0).toUpperCase() || "A"}
            </Avatar>
            <Typography
              sx={{
                display: { xs: "none", md: "block" },
                color: "#ab8a48",
                fontWeight: 600,
                fontSize: 14,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            onClick={handleLogout}
            disabled={loggingOut}
            startIcon={<FiLogOut size={16} />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              px: 1.5,
              py: 0.75,
              minWidth: 0,
              color: "#ab8a48",
              borderColor: alpha("#ab8a48", 0.36),
              "&:hover": {
                borderColor: alpha("#ab8a48", 0.64),
                bgcolor: alpha("#ab8a48", 0.05),
              },
            }}
          >
            {loggingOut ? "…" : "Logout"}
          </Button>
        </Stack>
      </Stack>
    </>
  );
};

export default AdminNavbar;

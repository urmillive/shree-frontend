import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import { getStoredAccessToken, getStoredRole, refreshAccessToken } from "../Setup/Axios";
import { colors } from "../theme/theme";

const ProtectedRoute = ({ allowedRoles = null }) => {
  const [status, setStatus] = useState(() =>
    getStoredAccessToken() ? "authorized" : "checking"
  );
  const role = getStoredRole();

  useEffect(() => {
    if (status !== "checking") {
      return;
    }

    let active = true;

    const restoreSession = async () => {
      try {
        await refreshAccessToken();

        if (active) {
          setStatus("authorized");
        }
      } catch {
        if (active) {
          setStatus("unauthorized");
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [status]);

  if (status === "checking") {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: colors.background,
          color: colors.text,
          p: 2,
          minHeight: 200,
        }}
      >
        Checking session...
      </Box>
    );
  }

  if (status !== "authorized") {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

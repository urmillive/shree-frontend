import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";

function normalizeUserPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.user ?? root;
  }
  return root;
}

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError("Missing user id.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setUser(null);
      try {
        const { data } = await client.get(`/admin/users/${encodeURIComponent(userId)}`);
        if (cancelled) return;
        const body = normalizeUserPayload(data);
        setUser(body && typeof body === "object" ? body : null);
        if (!body || typeof body !== "object") {
          setError("Unexpected response from server.");
        }
      } catch (e) {
        if (cancelled) return;
        setUser(null);
        setError(e?.response?.data?.message || e?.message || "Failed to load user.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!["super_admin", "manager"].includes(roleGate || "")) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: pageBg }}>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
          Back
        </Button>
      </Box>
    );
  }

  const entries = Object.entries(user || {}).filter(([k]) => k !== "password" && k !== "passwordHash");
  const mid = Math.ceil(entries.length / 2);
  const leftEntries = entries.slice(0, mid);
  const rightEntries = entries.slice(mid);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Users", to: "/admin/users" },
            { label: String(user?.name ?? user?.fullName ?? user?.email ?? "User") },
          ]}
        />
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: accent }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : user ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              border: `1px solid ${alpha("#0f3828", 0.1)}`,
              boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
            }}
          >
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Profile
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", mb: 2, wordBreak: "break-word" }}>
              {String(user.name ?? user.fullName ?? user.email ?? "User")}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
              <Typography sx={{ color: "#6f7f77", fontWeight: 600 }}>
                Status: {user?.isActive ? "Active" : "Inactive"} | Role: {String(user?.role ?? "—")}
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate(`/admin/users/${encodeURIComponent(String(userId))}/edit`)}
                sx={{ textTransform: "none", fontWeight: 700, bgcolor: accent, "&:hover": { bgcolor: "#8f723c" } }}
              >
                Edit User
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={1.25}>
                  {leftEntries.map(([k, v]) => (
                    <Box key={k}>
                      <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        {k.replace(/([A-Z])/g, " $1").trim()}
                      </Typography>
                      <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                        {v != null && typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1.25}>
                  {rightEntries.map(([k, v]) => (
                    <Box key={k}>
                      <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        {k.replace(/([A-Z])/g, " $1").trim()}
                      </Typography>
                      <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word" }}>
                        {v != null && typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminUserDetail;

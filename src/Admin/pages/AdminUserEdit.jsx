import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";
const forest = "#0f3828";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer", hint: "Default storefront access" },
  { value: "manager", label: "Manager", hint: "Admin tools, limited scope" },
  { value: "super_admin", label: "Super admin", hint: "Full admin control" },
];

function normalizeUserPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.user ?? root;
  }
  return root;
}

function formatFieldLabel(key) {
  return key.replace(/([A-Z])/g, " $1").trim();
}

function formatFieldValue(v) {
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

const AdminUserEdit = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [roleDraft, setRoleDraft] = useState("customer");

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
        setRoleDraft(String(body?.role ?? "customer"));
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

  useEffect(() => {
    if (user?.role != null) setRoleDraft(String(user.role));
  }, [user?.role]);

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(user || {}).filter(([k]) => k !== "password" && k !== "passwordHash");
    const mid = Math.ceil(entries.length / 2);
    return {
      leftEntries: entries.slice(0, mid),
      rightEntries: entries.slice(mid),
    };
  }, [user]);

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

  const canManageUser = roleGate === "super_admin";
  const isActive = Boolean(user?.isActive);
  const displayName = String(user?.name ?? user?.fullName ?? user?.email ?? "User");

  const updateUserStatus = async (nextStatus) => {
    if (!userId) return;
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const { data } = await client.patch(`/admin/users/${encodeURIComponent(userId)}/status`, {
        isActive: nextStatus,
      });
      const payload = normalizeUserPayload(data);
      setUser((prev) => ({
        ...(prev || {}),
        ...(payload && typeof payload === "object" ? payload : {}),
        isActive: nextStatus,
      }));
      setActionSuccess(nextStatus ? "User reactivated successfully." : "User deactivated successfully.");
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || "Failed to update user status.");
    } finally {
      setActionLoading(false);
    }
  };

  const updateUserRole = async () => {
    if (!userId || !roleDraft) return;
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const { data } = await client.patch(`/admin/users/${encodeURIComponent(userId)}/role`, {
        role: roleDraft,
      });
      const payload = normalizeUserPayload(data);
      setUser((prev) => ({
        ...(prev || {}),
        ...(payload && typeof payload === "object" ? payload : {}),
        role: roleDraft,
      }));
      setActionSuccess("User role updated successfully.");
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || "Failed to update user role.");
    } finally {
      setActionLoading(false);
    }
  };

  const cardSx = {
    p: { xs: 2.25, sm: 3 },
    borderRadius: 2.5,
    border: `1px solid ${alpha(forest, 0.1)}`,
    boxShadow: "0 8px 24px rgba(20, 55, 42, 0.06)",
    bgcolor: "#fff",
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Users", to: "/admin/users" },
            {
              label: displayName,
              to: userId ? `/admin/users/${encodeURIComponent(String(userId))}` : undefined,
            },
            { label: "Edit" },
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
          <Stack spacing={2.5}>
            {!canManageUser ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Only a super admin can change account status or role. You can still review full user details below.
              </Alert>
            ) : null}

            {actionError ? (
              <Alert severity="error" onClose={() => setActionError("")} sx={{ borderRadius: 2 }}>
                {actionError}
              </Alert>
            ) : null}
            {actionSuccess ? (
              <Alert severity="success" onClose={() => setActionSuccess("")} sx={{ borderRadius: 2 }}>
                {actionSuccess}
              </Alert>
            ) : null}

            <Paper elevation={0} sx={cardSx}>
              <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                Full profile
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", mb: 0.5, wordBreak: "break-word" }}>
                {displayName}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip
                  size="small"
                  label={isActive ? "Active" : "Inactive"}
                  color={isActive ? "success" : "default"}
                  sx={{ fontWeight: 700, ...(isActive ? {} : { bgcolor: alpha("#1f2a24", 0.08), color: "#1f2a24" }) }}
                />
                <Chip size="small" label={String(user?.role ?? "—")} variant="outlined" sx={{ fontWeight: 600, borderColor: alpha(accent, 0.55), color: "#5c4a2a" }} />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={1.35}>
                    {leftEntries.map(([k, v]) => (
                      <Box
                        key={k}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(forest, 0.03),
                          border: `1px solid ${alpha(forest, 0.06)}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {formatFieldLabel(k)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word", mt: 0.35, whiteSpace: "pre-wrap" }}>
                          {formatFieldValue(v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={1.35}>
                    {rightEntries.map(([k, v]) => (
                      <Box
                        key={k}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(forest, 0.03),
                          border: `1px solid ${alpha(forest, 0.06)}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#6f7f77", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {formatFieldLabel(k)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1f2a24", wordBreak: "break-word", mt: 0.35, whiteSpace: "pre-wrap" }}>
                          {formatFieldValue(v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ ...cardSx, height: "100%" }}>
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Account status
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha("#1f2a24", 0.72), mb: 2, mt: 0.5 }}>
                    Deactivated users cannot sign in. Reactivate when access should be restored.
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      mb: 2,
                      bgcolor: isActive ? alpha("#2e7d32", 0.06) : alpha("#1f2a24", 0.05),
                      border: `1px solid ${isActive ? alpha("#2e7d32", 0.22) : alpha("#1f2a24", 0.12)}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#6f7f77", letterSpacing: 0.8 }}>
                      Current state
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#19271f", mt: 0.5 }}>
                      {isActive ? "This account is active" : "This account is deactivated"}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      disabled={!canManageUser || actionLoading || !isActive}
                      onClick={() => updateUserStatus(false)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        py: 1.35,
                        borderRadius: 2,
                        boxShadow: "none",
                        "&:hover": { boxShadow: "0 4px 14px rgba(183, 28, 28, 0.25)" },
                      }}
                    >
                      Deactivate
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      disabled={!canManageUser || actionLoading || isActive}
                      onClick={() => updateUserStatus(true)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        py: 1.35,
                        borderRadius: 2,
                        boxShadow: "none",
                        "&:hover": { boxShadow: "0 4px 14px rgba(46, 125, 50, 0.25)" },
                      }}
                    >
                      Reactivate
                    </Button>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ ...cardSx, height: "100%" }}>
                  <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
                    Role
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha("#1f2a24", 0.72), mb: 2, mt: 0.5 }}>
                    Choose a role, then apply. Changes take effect immediately for new sessions.
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    orientation="vertical"
                    fullWidth
                    value={roleDraft}
                    disabled={!canManageUser || actionLoading}
                    onChange={(_, next) => {
                      if (next != null) setRoleDraft(String(next));
                    }}
                    sx={{
                      gap: 1,
                      "& .MuiToggleButtonGroup-grouped": {
                        border: 0,
                        borderRadius: "12px !important",
                        my: 0,
                      },
                    }}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <ToggleButton
                        key={opt.value}
                        value={opt.value}
                        sx={{
                          textTransform: "none",
                          alignItems: "flex-start",
                          py: 1.5,
                          px: 2,
                          border: `1px solid ${alpha(forest, 0.12)} !important`,
                          bgcolor: alpha(forest, 0.02),
                          "&.Mui-selected": {
                            bgcolor: alpha(accent, 0.12),
                            borderColor: `${alpha(accent, 0.55)} !important`,
                            boxShadow: `inset 0 0 0 1px ${alpha(accent, 0.35)}`,
                          },
                          "&.Mui-disabled": { opacity: 0.55 },
                        }}
                      >
                        <Stack alignItems="flex-start" spacing={0.25} sx={{ width: "100%" }}>
                          <Typography sx={{ fontWeight: 800, color: "#19271f", fontSize: 15 }}>{opt.label}</Typography>
                          <Typography variant="caption" sx={{ color: "#6f7f77", textAlign: "left", lineHeight: 1.35 }}>
                            {opt.hint}
                          </Typography>
                        </Stack>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={updateUserRole}
                    disabled={!canManageUser || actionLoading || !roleDraft || roleDraft === String(user?.role ?? "")}
                    sx={{
                      mt: 2,
                      textTransform: "none",
                      fontWeight: 800,
                      py: 1.25,
                      borderRadius: 2,
                      bgcolor: accent,
                      boxShadow: "none",
                      "&:hover": { bgcolor: "#8f723c", boxShadow: "0 6px 18px rgba(171, 138, 72, 0.35)" },
                    }}
                  >
                    Save role
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminUserEdit;

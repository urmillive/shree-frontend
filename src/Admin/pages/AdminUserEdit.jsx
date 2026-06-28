import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";
const forest = "#0f3828";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "manager", label: "Manager" },
  { value: "super_admin", label: "Super admin" },
];

const PROFILE_SKIP_KEYS = new Set([
  "password",
  "passwordHash",
  "addresses",
  "savedAddresses",
  "shippingAddresses",
  "address",
]);

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
  const [statusDraft, setStatusDraft] = useState(true);

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
        setStatusDraft(Boolean(body?.isActive));
        if (!body || typeof body !== "object") {
          setError("Unexpected response from server.");
        }
      } catch (e) {
        if (cancelled) return;
        setUser(null);
        setError(getApiErrorMessage(e, "Failed to load user."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(user || {}).filter(([k]) => !PROFILE_SKIP_KEYS.has(k));
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
  const savedActive = Boolean(user?.isActive);
  const savedRole = String(user?.role ?? "customer");
  const displayName = String(user?.name ?? user?.fullName ?? user?.email ?? "User");

  const statusChanged = statusDraft !== savedActive;
  const roleChanged = roleDraft !== savedRole;
  const hasUnsavedChanges = statusChanged || roleChanged;

  const saveUserChanges = async () => {
    if (!userId || !canManageUser || !hasUnsavedChanges) return;

    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    let nextUser = { ...(user || {}) };
    const updates = [];

    try {
      if (statusChanged) {
        const { data } = await client.patch(`/admin/users/${encodeURIComponent(userId)}/status`, {
          isActive: statusDraft,
        });
        const payload = normalizeUserPayload(data);
        nextUser = {
          ...nextUser,
          ...(payload && typeof payload === "object" ? payload : {}),
          isActive: statusDraft,
        };
        updates.push(statusDraft ? "account reactivated" : "account deactivated");
      }

      if (roleChanged) {
        const { data } = await client.patch(`/admin/users/${encodeURIComponent(userId)}/role`, {
          role: roleDraft,
        });
        const payload = normalizeUserPayload(data);
        nextUser = {
          ...nextUser,
          ...(payload && typeof payload === "object" ? payload : {}),
          role: roleDraft,
        };
        updates.push("role updated");
      }

      setUser(nextUser);
      setStatusDraft(Boolean(nextUser.isActive));
      setRoleDraft(String(nextUser.role ?? roleDraft));
      setActionSuccess(
        updates.length === 2
          ? "User account and role saved successfully."
          : `User ${updates[0]} successfully.`,
      );
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Failed to save changes."));
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

  const actionBtnSx = {
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 2,
    boxShadow: "none",
    whiteSpace: "nowrap",
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

              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "stretch", md: "flex-start" }}
                justifyContent="space-between"
                spacing={2}
                sx={{ mt: 0.5, mb: 1.5 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
                    {displayName}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    <Chip
                      size="small"
                      label={statusDraft ? "Active" : "Inactive"}
                      color={statusDraft ? "success" : "default"}
                      sx={{
                        fontWeight: 700,
                        ...(statusDraft ? {} : { bgcolor: alpha("#1f2a24", 0.08), color: "#1f2a24" }),
                      }}
                    />
                    <Chip
                      size="small"
                      label={roleDraft.replace(/_/g, " ")}
                      variant="outlined"
                      sx={{ fontWeight: 600, borderColor: alpha(accent, 0.55), color: "#5c4a2a", textTransform: "capitalize" }}
                    />
                    {hasUnsavedChanges ? (
                      <Chip size="small" label="Unsaved changes" color="warning" sx={{ fontWeight: 700 }} />
                    ) : null}
                  </Stack>
                </Box>

                {canManageUser ? (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    spacing={1.25}
                    sx={{ flexShrink: 0 }}
                  >
                    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
                      <InputLabel id="admin-user-role-label">Role</InputLabel>
                      <Select
                        labelId="admin-user-role-label"
                        label="Role"
                        value={roleDraft}
                        disabled={actionLoading}
                        onChange={(e) => setRoleDraft(String(e.target.value))}
                        sx={{ borderRadius: 2, bgcolor: "#fff" }}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {statusDraft ? (
                      <Button
                        variant="contained"
                        color="error"
                        disabled={actionLoading}
                        onClick={() => setStatusDraft(false)}
                        sx={{
                          ...actionBtnSx,
                          py: 1,
                          "&:hover": { boxShadow: "0 4px 14px rgba(183, 28, 28, 0.25)" },
                        }}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="success"
                        disabled={actionLoading}
                        onClick={() => setStatusDraft(true)}
                        sx={{
                          ...actionBtnSx,
                          py: 1,
                          "&:hover": { boxShadow: "0 4px 14px rgba(46, 125, 50, 0.25)" },
                        }}
                      >
                        Activate
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
                    <Chip
                      size="small"
                      label={savedActive ? "Active" : "Inactive"}
                      color={savedActive ? "success" : "default"}
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      label={savedRole.replace(/_/g, " ")}
                      variant="outlined"
                      sx={{ fontWeight: 600, textTransform: "capitalize" }}
                    />
                  </Stack>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6 }}>
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
                <Grid size={{ xs: 12, md: 6 }}>
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

              {canManageUser ? (
                <>
                  <Divider sx={{ mt: 2.5, mb: 2 }} />
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    justifyContent="flex-start"
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Button
                      variant="outlined"
                      disabled={actionLoading}
                      onClick={() => navigate(`/admin/users/${encodeURIComponent(String(userId))}`)}
                      sx={{ ...actionBtnSx, py: 1.1, borderColor: alpha(forest, 0.25), color: "#1f2a24" }}
                    >
                      Discard
                    </Button>
                    <Button
                      variant="contained"
                      disabled={actionLoading || !hasUnsavedChanges}
                      onClick={saveUserChanges}
                      sx={{
                        ...actionBtnSx,
                        py: 1.1,
                        px: 3,
                        bgcolor: accent,
                        "&:hover": { bgcolor: "#8f723c", boxShadow: "0 6px 18px rgba(171, 138, 72, 0.35)" },
                      }}
                    >
                      {actionLoading ? "Saving…" : "Save changes"}
                    </Button>
                  </Stack>
                </>
              ) : null}
            </Paper>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminUserEdit;

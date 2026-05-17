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
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FiMapPin } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../Setup/Axios";
import AdminBreadcrumb from "../components/AdminBreadcrumb";
import { getApiErrorMessage } from "../../utils/apiError";
import { getAddressId } from "../../utils/addressesApi";
import AdminNavbar from "../components/AdminNavbar";

const accent = "#ab8a48";
const pageBg = "#ffffff";
const forest = "#0f3828";
const INITIAL_ADDRESS_LIMIT = 10;

function normalizeUserPayload(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.user ?? root;
  }
  return root;
}

function extractAddressesFromUser(user) {
  if (!user || typeof user !== "object") return [];
  const raw = user.addresses ?? user.savedAddresses ?? user.shippingAddresses;
  return Array.isArray(raw) ? raw : [];
}

function formatFieldLabel(key) {
  return key.replace(/([A-Z])/g, " $1").trim();
}

function formatFieldValue(v) {
  if (v != null && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "—");
}

function formatAddressLines(address) {
  if (!address || typeof address !== "object") return "";
  return [
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.city, address.state, address.pincode ?? address.postalCode ?? address.zip].filter(Boolean).join(", "),
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}

const PROFILE_SKIP_KEYS = new Set(["password", "passwordHash", "addresses", "savedAddresses", "shippingAddresses"]);

function AddressCard({ address }) {
  const id = getAddressId(address);
  const lines = formatAddressLines(address);
  const contactName = address?.name ?? address?.fullName ?? "";
  const contactPhone = address?.mobile ?? address?.phone ?? "";

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        p: 2,
        borderRadius: 2,
        border: `1px solid ${alpha(forest, 0.1)}`,
        boxShadow: "0 6px 16px rgba(20, 55, 42, 0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          <FiMapPin size={18} color={accent} style={{ flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 800, color: "#19271f", wordBreak: "break-word" }}>
            {address?.label || "Address"}
          </Typography>
        </Stack>
        {address?.isDefault ? (
          <Chip
            size="small"
            label="Default"
            sx={{
              flexShrink: 0,
              fontWeight: 700,
              fontSize: 11,
              height: 24,
              bgcolor: alpha(accent, 0.12),
              color: "#5c4a2a",
              border: `1px solid ${alpha(accent, 0.4)}`,
            }}
          />
        ) : null}
      </Stack>

      {(contactName || contactPhone) && (
        <Typography variant="body2" sx={{ color: "#1f2a24", fontWeight: 600, wordBreak: "break-word" }}>
          {contactName}
          {contactPhone ? ` · ${contactPhone}` : ""}
        </Typography>
      )}

      <Typography
        variant="body2"
        component="pre"
        sx={{
          m: 0,
          flex: 1,
          color: "#3d4a43",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "inherit",
          lineHeight: 1.55,
        }}
      >
        {lines || "—"}
      </Typography>

      {id ? (
        <Typography variant="caption" sx={{ color: "#8a9690", fontWeight: 600 }}>
          ID: {id}
        </Typography>
      ) : null}
    </Paper>
  );
}

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const roleGate = localStorage.getItem("role");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [showAllAddresses, setShowAllAddresses] = useState(false);

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

  useEffect(() => {
    setShowAllAddresses(false);
    setActiveTab(0);
  }, [userId]);

  const addresses = useMemo(() => extractAddressesFromUser(user), [user]);

  const { leftEntries, rightEntries } = useMemo(() => {
    const entries = Object.entries(user || {}).filter(([k]) => !PROFILE_SKIP_KEYS.has(k));
    const mid = Math.ceil(entries.length / 2);
    return {
      leftEntries: entries.slice(0, mid),
      rightEntries: entries.slice(mid),
    };
  }, [user]);

  const visibleAddresses = useMemo(() => {
    if (showAllAddresses) return addresses;
    return addresses.slice(0, INITIAL_ADDRESS_LIMIT);
  }, [addresses, showAllAddresses]);

  const hasMoreAddresses = addresses.length > INITIAL_ADDRESS_LIMIT;

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

  const displayName = String(user?.name ?? user?.fullName ?? user?.email ?? "User");

  const cardSx = {
    p: { xs: 2, sm: 3 },
    borderRadius: 2,
    border: `1px solid ${alpha(forest, 0.1)}`,
    boxShadow: "0 8px 20px rgba(20, 55, 42, 0.06)",
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: pageBg, boxSizing: "border-box" }}>
      <AdminNavbar />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Users", to: "/admin/users" },
            { label: displayName },
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
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" sx={{ color: "#6f7f77", letterSpacing: 1.2, fontWeight: 600 }}>
              Profile
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#19271f",  wordBreak: "break-word" }}>
              {displayName}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              // spacing={1.5}
            >
              <Typography sx={{ color: "#6f7f77", fontWeight: 600, fontSize: 10 }}>
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

            <Tabs
              value={activeTab}
              onChange={(_, next) => setActiveTab(next)}
              sx={{
                mt: 2,
                mb: 0,
                minHeight: 44,
                borderBottom: `1px solid ${alpha(forest, 0.1)}`,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  minHeight: 44,
                  color: "#6f7f77",
                },
                "& .Mui-selected": { color: "#19271f" },
                "& .MuiTabs-indicator": { bgcolor: accent, height: 3, borderRadius: "3px 3px 0 0" },
              }}
            >
              <Tab label="User" />
              <Tab label={`Addresses (${addresses.length})`} />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {activeTab === 0 ? (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.25}>
                    {leftEntries.map(([k, v]) => (
                      <Box key={k}>
                        <Typography
                          variant="caption"
                          sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                        >
                          {formatFieldLabel(k)}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                          {formatFieldValue(v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.25}>
                    {rightEntries.map(([k, v]) => (
                      <Box key={k}>
                        <Typography
                          variant="caption"
                          sx={{ color: "#6f7f77", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                        >
                          {formatFieldLabel(k)}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#1f2a24", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                          {formatFieldValue(v)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            ) : (
              <Box>
                {addresses.length === 0 ? (
                  <Box
                    sx={{
                      py: 6,
                      px: 2,
                      textAlign: "center",
                      borderRadius: 2,
                      bgcolor: alpha(forest, 0.03),
                      border: `1px dashed ${alpha(forest, 0.15)}`,
                    }}
                  >
                    <FiMapPin size={40} color={alpha(forest, 0.35)} style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontWeight: 700, color: "#19271f" }}>No saved addresses</Typography>
                    <Typography variant="body2" sx={{ color: "#6f7f77", mt: 0.5 }}>
                      This user has not added any delivery addresses yet.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ color: "#6f7f77", fontWeight: 600, mb: 2 }}>
                      Showing {visibleAddresses.length} of {addresses.length} address{addresses.length === 1 ? "" : "es"}
                    </Typography>
                    <Grid container spacing={2}>
                      {visibleAddresses.map((address, index) => {
                        const id = getAddressId(address);
                        return (
                          <Grid key={id || `address-${index}`} size={{ xs: 12, sm: 6, md: 3 }}>
                            <AddressCard address={address} />
                          </Grid>
                        );
                      })}
                    </Grid>
                    {hasMoreAddresses ? (
                      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                        <Button
                          variant="outlined"
                          onClick={() => setShowAllAddresses((prev) => !prev)}
                          sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            borderColor: alpha(accent, 0.55),
                            color: "#5c4a2a",
                            px: 3,
                            "&:hover": { borderColor: accent, bgcolor: alpha(accent, 0.06) },
                          }}
                        >
                          {showAllAddresses
                            ? "Show fewer addresses"
                            : `Show all addresses (${addresses.length - INITIAL_ADDRESS_LIMIT} more)`}
                        </Button>
                      </Box>
                    ) : null}
                  </>
                )}
              </Box>
            )}
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
};

export default AdminUserDetail;

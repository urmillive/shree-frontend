import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import client from "../../Setup/Axios";
import { colors, fonts } from "../../theme/theme";
import {
  extractAddressesFromMeResponse,
  getAddressId,
} from "../../utils/addressesApi";

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

const accountLinks = [
  { label: "Profile", to: "/profile" },
  { label: "Orders", to: "/orders" },
  { label: "Addresses", to: "/profile/addresses" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "Change password", to: "/profile/change-password" },
];

function AccountSidebar({ active }) {
  return (
    <Stack
      spacing={0}
      sx={{
        borderTop: `1px solid ${colors.line}`,
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      {accountLinks.map((link) => {
        const isActive = active === link.to;
        return (
          <Box
            key={link.to}
            component={RouterLink}
            to={link.to}
            sx={{
              py: 1.5,
              borderLeft: `2px solid ${isActive ? colors.ink : "transparent"}`,
              pl: 1.5,
              fontFamily: fonts.body,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: isActive ? colors.ink : colors.muted,
              textDecoration: "none",
              borderBottom: `1px solid ${colors.line}`,
              "&:hover": { color: colors.ink },
              "&:last-of-type": { borderBottom: "none" },
            }}
          >
            {link.label}
          </Box>
        );
      })}
    </Stack>
  );
}

const AddressList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.get("/users/me");
      setAddresses(extractAddressesFromMeResponse(res));
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to load addresses."
      );
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm("Delete this address? This cannot be undone.");
    if (!ok) return;
    setDeletingId(id);
    try {
      await client.delete(`/users/me/addresses/${id}`);
      await load();
    } catch (err) {
      window.alert(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Could not delete address."
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Stack spacing={1} sx={{ mb: { xs: 4, sm: 6 } }}>
          <Typography sx={eyebrowSx}>Account</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 34, sm: 48 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            Saved addresses
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 4, md: 6 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <AccountSidebar active="/profile/addresses" />
          </Grid>

          <Grid size={{ xs: 12, md: 9 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.muted,
                }}
              >
                {addresses.length}{" "}
                {addresses.length === 1 ? "address" : "addresses"} saved
              </Typography>
              <Button
                variant="contained"
                startIcon={<FiPlus size={14} />}
                onClick={() => navigate("/profile/addresses/new")}
              >
                Add new
              </Button>
            </Stack>

            {error ? (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 0,
                  border: `1px solid ${colors.danger}`,
                }}
                action={
                  <Button color="inherit" size="small" onClick={load}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            ) : null}

            {loading ? (
              <Stack spacing={2}>
                {[1, 2].map((k) => (
                  <Skeleton
                    key={k}
                    variant="rectangular"
                    height={140}
                    sx={{ bgcolor: colors.stone }}
                  />
                ))}
              </Stack>
            ) : addresses.length === 0 && !error ? (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: 32,
                    fontWeight: 500,
                    color: colors.ink,
                    mb: 1,
                  }}
                >
                  No addresses yet.
                </Typography>
                <Typography
                  sx={{
                    color: colors.muted,
                    fontSize: 14,
                    mb: 3,
                  }}
                >
                  Add one so you can check out faster.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate("/profile/addresses/new")}
                >
                  Add address
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {addresses.map((a) => {
                  const id = getAddressId(a);
                  return (
                    <Box
                      key={id || JSON.stringify(a)}
                      sx={{
                        bgcolor: colors.paper,
                        border: `1px solid ${colors.line}`,
                        p: { xs: 2.5, sm: 3 },
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={2}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ mb: 1.5 }}
                          >
                            <Typography
                              sx={{
                                fontFamily: fonts.body,
                                fontSize: 12,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                fontWeight: 600,
                                color: colors.ink,
                              }}
                            >
                              {a.label || "Address"}
                            </Typography>
                            {a.isDefault ? (
                              <Box
                                sx={{
                                  border: `1px solid ${colors.ink}`,
                                  bgcolor: colors.ink,
                                  color: colors.ivory,
                                  px: 1,
                                  py: 0.3,
                                  fontFamily: fonts.body,
                                  fontSize: 9,
                                  letterSpacing: "0.22em",
                                  textTransform: "uppercase",
                                  fontWeight: 500,
                                }}
                              >
                                Default
                              </Box>
                            ) : null}
                          </Stack>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 14,
                              color: colors.ink,
                              fontWeight: 500,
                              mb: 0.5,
                            }}
                          >
                            {[a.name, a.mobile].filter(Boolean).join(" · ")}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: fonts.body,
                              fontSize: 13.5,
                              color: colors.muted,
                              lineHeight: 1.6,
                            }}
                          >
                            {[a.line1, a.line2].filter(Boolean).join(", ")}
                            <br />
                            {[a.city, a.state, a.pincode]
                              .filter(Boolean)
                              .join(", ")}
                            {a.country ? (
                              <>
                                <br />
                                {a.country}
                              </>
                            ) : null}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            disabled={!id || deletingId === id}
                            onClick={() =>
                              id && navigate(`/profile/addresses/${id}/edit`)
                            }
                            aria-label="Edit address"
                            sx={{
                              borderRadius: 0,
                              color: colors.ink,
                              "&:hover": {
                                color: colors.wine,
                                backgroundColor: "transparent",
                              },
                            }}
                          >
                            <FiEdit2 size={16} />
                          </IconButton>
                          <IconButton
                            disabled={!id || Boolean(deletingId)}
                            onClick={() => handleDelete(id)}
                            aria-label="Delete address"
                            sx={{
                              borderRadius: 0,
                              color: colors.ink,
                              "&:hover": {
                                color: colors.danger,
                                backgroundColor: "transparent",
                              },
                            }}
                          >
                            <FiTrash2 size={16} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AddressList;

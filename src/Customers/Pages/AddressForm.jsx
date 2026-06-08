import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiTrash2 } from "react-icons/fi";
import client from "../../Setup/Axios";
import { colors, fonts } from "../../theme/theme";
import {
  extractAddressesFromMeResponse,
  getAddressId,
} from "../../utils/addressesApi";

const normalizeMobileDigits = (value) =>
  String(value ?? "").replace(/\D/g, "").slice(0, 10);

const normalizePincode = (value) =>
  String(value ?? "").replace(/\D/g, "").slice(0, 6);

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

const emptyForm = () => ({
  label: "",
  name: "",
  mobile: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: true,
});

const AddressForm = () => {
  const navigate = useNavigate();
  const { addressId } = useParams();
  const isEdit = Boolean(addressId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm());
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await client.get("/users/me");
        const list = extractAddressesFromMeResponse(res);
        const found = list.find(
          (a) => String(getAddressId(a)) === String(addressId)
        );
        if (cancelled) return;
        if (!found) {
          setLoadError("Address not found.");
          return;
        }
        setForm({
          label: String(found.label ?? ""),
          name: String(found.name ?? ""),
          mobile: normalizeMobileDigits(found.mobile),
          line1: String(found.line1 ?? ""),
          line2: String(found.line2 ?? ""),
          city: String(found.city ?? ""),
          state: String(found.state ?? ""),
          pincode: normalizePincode(found.pincode),
          country: String(found.country ?? "India"),
          isDefault: Boolean(found.isDefault),
        });
      } catch (err) {
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }
        if (!cancelled)
          setLoadError(
            err?.response?.data?.error?.message ||
              err?.response?.data?.message ||
              "Unable to load address."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addressId, isEdit, navigate]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const name = String(form.name ?? "").trim();
    const mobile = normalizeMobileDigits(form.mobile);
    const line1 = String(form.line1 ?? "").trim();
    const city = String(form.city ?? "").trim();
    const state = String(form.state ?? "").trim();
    const pin = normalizePincode(form.pincode);
    if (!name) return "Please enter the recipient name.";
    if (!/^\d{10}$/.test(mobile))
      return "Enter a valid 10-digit mobile number.";
    if (!line1) return "Please enter address line 1.";
    if (!city) return "Please enter city.";
    if (!state) return "Please enter state.";
    if (!/^\d{6}$/.test(pin)) return "Enter a valid 6-digit pincode.";
    return "";
  };

  const buildPayload = () => ({
    label: String(form.label ?? "").trim() || "Address",
    name: String(form.name ?? "").trim(),
    mobile: normalizeMobileDigits(form.mobile),
    line1: String(form.line1 ?? "").trim(),
    line2: String(form.line2 ?? "").trim() || undefined,
    city: String(form.city ?? "").trim(),
    state: String(form.state ?? "").trim(),
    pincode: normalizePincode(form.pincode),
    country: String(form.country ?? "").trim() || "India",
    isDefault: Boolean(form.isDefault),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setFormError(v);
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await client.put(`/users/me/addresses/${addressId}`, payload);
      } else {
        await client.post("/users/me/addresses", payload);
      }
      navigate("/profile/addresses");
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      setFormError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Could not save address."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !addressId) return;
    const ok = window.confirm("Delete this address? This cannot be undone.");
    if (!ok) return;
    setDeleting(true);
    setFormError("");
    try {
      await client.delete(`/users/me/addresses/${addressId}`);
      navigate("/profile/addresses");
    } catch (err) {
      setFormError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Could not delete address."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 720, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Box
          component={RouterLink}
          to="/profile/addresses"
          sx={{
            display: "inline-block",
            mb: 3,
            fontFamily: fonts.body,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: colors.muted,
            textDecoration: "none",
            "&:hover": { color: colors.ink },
          }}
        >
          ← Addresses
        </Box>

        <Stack spacing={1} sx={{ mb: { xs: 4, sm: 5 } }}>
          <Typography sx={eyebrowSx}>Address</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 30, sm: 42 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            {isEdit ? "Edit address" : "Add a new address"}
          </Typography>
        </Stack>

        {loading ? (
          <Skeleton variant="rectangular" height={420} sx={{ bgcolor: colors.stone }} />
        ) : loadError ? (
          <Stack spacing={2}>
            <Alert
              severity="error"
              sx={{ borderRadius: 0, border: `1px solid ${colors.danger}` }}
            >
              {loadError}
            </Alert>
            <Button
              variant="outlined"
              onClick={() => navigate("/profile/addresses")}
              sx={{ alignSelf: "flex-start" }}
            >
              Back to addresses
            </Button>
          </Stack>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              bgcolor: colors.paper,
              border: `1px solid ${colors.line}`,
              p: { xs: 3, sm: 4 },
            }}
          >
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Label"
                  placeholder="Home, Work…"
                  value={form.label}
                  onChange={(e) => setField("label", e.target.value)}
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Full name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Mobile"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={form.mobile}
                  onChange={(e) =>
                    setField("mobile", normalizeMobileDigits(e.target.value))
                  }
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Address line 1"
                  autoComplete="address-line1"
                  value={form.line1}
                  onChange={(e) => setField("line1", e.target.value)}
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Address line 2 (optional)"
                  autoComplete="address-line2"
                  value={form.line2}
                  onChange={(e) => setField("line2", e.target.value)}
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="City"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="State"
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={form.pincode}
                  onChange={(e) =>
                    setField("pincode", normalizePincode(e.target.value))
                  }
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Country"
                  autoComplete="country-name"
                  value={form.country}
                  onChange={(e) => setField("country", e.target.value)}
                  disabled={saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isDefault}
                      onChange={(e) => setField("isDefault", e.target.checked)}
                      disabled={saving || deleting}
                      sx={{
                        color: colors.muted,
                        "&.Mui-checked": { color: colors.ink },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: colors.ink,
                      }}
                    >
                      Set as default delivery address
                    </Typography>
                  }
                />
              </Grid>
            </Grid>

            {formError ? (
              <Alert
                severity="error"
                sx={{
                  mt: 3,
                  borderRadius: 0,
                  border: `1px solid ${colors.danger}`,
                }}
              >
                {formError}
              </Alert>
            ) : null}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mt: 3 }}
            >
              <Button
                type="submit"
                variant="contained"
                disabled={saving || deleting}
              >
                {saving
                  ? "Saving…"
                  : isEdit
                  ? "Save changes"
                  : "Save address"}
              </Button>
              {isEdit ? (
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<FiTrash2 size={14} />}
                  disabled={saving || deleting}
                  onClick={handleDelete}
                  sx={{
                    color: colors.danger,
                    borderColor: colors.danger,
                    "&:hover": {
                      borderColor: colors.danger,
                      color: colors.danger,
                      backgroundColor: "transparent",
                    },
                  }}
                >
                  {deleting ? "Deleting…" : "Delete address"}
                </Button>
              ) : null}
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default AddressForm;

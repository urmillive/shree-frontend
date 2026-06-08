import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import client from "../../Setup/Axios";
import { colors, fonts } from "../../theme/theme";

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

const Forgetpassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email format";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    if (!validateForm()) return;
    setLoading(true);
    try {
      await client.post("/auth/forgot-password", { email: email.trim() });
      navigate("/resetpassword", {
        state: { email: email.trim() },
        replace: true,
      });
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "70vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 460, px: { xs: 3, sm: 5 }, py: { xs: 6, sm: 10 } }}
      >
        <Stack spacing={1.5} sx={{ textAlign: "center", mb: 5 }}>
          <Typography sx={eyebrowSx}>Forgot password</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 32, sm: 42 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            Reset your password
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14, lineHeight: 1.65 }}>
            We'll send a code to your inbox so you can set a new password.
          </Typography>
        </Stack>

        {errors.submit ? (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 0, border: `1px solid ${colors.danger}` }}
          >
            {errors.submit}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              error={Boolean(errors.email)}
              helperText={errors.email}
              size="small"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.75 }}
            >
              {loading ? "Sending…" : "Send reset code"}
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            mt: 4,
            pt: 4,
            borderTop: `1px solid ${colors.line}`,
            textAlign: "center",
          }}
        >
          <Box
            component={RouterLink}
            to="/login"
            sx={{
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
            ← Back to sign in
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Forgetpassword;

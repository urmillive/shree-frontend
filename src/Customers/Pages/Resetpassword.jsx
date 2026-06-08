import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiEye, FiEyeOff } from "react-icons/fi";
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

const Resetpassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromNavigation = location.state?.email ?? "";
  const isEmailLocked = Boolean(emailFromNavigation);
  const [email, setEmail] = useState(emailFromNavigation);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email format";
    if (!otp.trim()) newErrors.otp = "OTP is required";
    else if (!/^\d{4,8}$/.test(otp.trim()))
      newErrors.otp = "Enter a valid OTP";
    if (!newPassword) newErrors.newPassword = "New password is required";
    else if (newPassword.length < 8)
      newErrors.newPassword = "Password must be at least 8 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    if (!validateForm()) return;
    setLoading(true);
    try {
      await client.post("/auth/reset-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      navigate("/login", { replace: true });
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Could not reset password. Please try again.",
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
          <Typography sx={eyebrowSx}>Reset password</Typography>
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
            Set a new password
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14 }}>
            Enter the code from your email and choose a new password.
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
              disabled={isEmailLocked}
              error={Boolean(errors.email)}
              helperText={errors.email}
              size="small"
            />
            <TextField
              fullWidth
              label="OTP"
              inputMode="numeric"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              autoComplete="one-time-code"
              error={Boolean(errors.otp)}
              helperText={errors.otp}
              size="small"
            />
            <TextField
              fullWidth
              label="New password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword}
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{
                        color: colors.muted,
                        "&:hover": { color: colors.ink },
                      }}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.75 }}
            >
              {loading ? "Resetting…" : "Reset password"}
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

export default Resetpassword;

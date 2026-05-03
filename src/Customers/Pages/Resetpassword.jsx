import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import client from "../../Setup/Axios";
import { colors, primaryAlpha } from "../../theme/theme";

const authLayout = {
  pageBox: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    px: { xs: 2, sm: 3 },
    py: { xs: 3, md: 5 },
    bgcolor: colors.background,
    background: `radial-gradient(circle at top left, ${colors.background}, ${colors.background} 55%, ${primaryAlpha(0.15)})`,
  },
  card: {
    borderRadius: 4,
    bgcolor: colors.background,
    color: colors.text,
    p: { xs: 1.5, sm: 2 },
    width: "100%",
    border: `1px solid ${primaryAlpha(0.5)}`,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    mx: "auto",
    mb: 1.5,
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    fontWeight: 700,
    color: colors.text,
    bgcolor: colors.primary,
  },
  inputSx: {
    "& .MuiInputLabel-root": { color: colors.label },
    "& .MuiOutlinedInput-root": {
      color: colors.text,
      "& fieldset": { borderColor: colors.borderSubtle },
      "&:hover fieldset": { borderColor: colors.primary },
      "&.Mui-focused fieldset": { borderColor: colors.primary },
    },
  },
  primaryButton: {
    mt: 0.5,
    py: 1.5,
    fontWeight: 700,
    bgcolor: colors.buttonBackground,
    color: colors.buttonText,
    "&:hover": {
      bgcolor: colors.buttonBackground,
      filter: "brightness(0.92)",
    },
    "&.Mui-disabled": {
      bgcolor: colors.disabledOverlay,
      color: colors.buttonText,
    },
  },
  toggleButton: {
    height: { xs: 44, sm: 56 },
    bgcolor: colors.buttonBackground,
    color: colors.buttonText,
    "&:hover": {
      bgcolor: colors.buttonBackground,
      filter: "brightness(0.92)",
    },
  },
  errorAlert: {
    bgcolor: colors.mutedSurface,
    color: colors.text,
    border: `1px solid ${colors.borderStrong}`,
  },
  body2: {
    mt: 1,
    color: colors.text,
  },
  footerText: {
    textAlign: "center",
    color: colors.text,
  },
  link: {
    color: colors.text,
    fontWeight: 600,
  },
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

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!otp.trim()) {
      newErrors.otp = "OTP is required";
    } else if (!/^\d{4,8}$/.test(otp.trim())) {
      newErrors.otp = "Enter a valid OTP (4–8 digits)";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

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
          error.response?.data?.message ||
          "Could not reset password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={authLayout.pageBox}>
      <Container maxWidth="sm" disableGutters>
        <Card sx={authLayout.card}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
            <Stack spacing={3}>
              <Box textAlign="center">
                <Box sx={authLayout.logoMark}>S</Box>
                <Typography variant="h4" component="h1" fontWeight={700} fontSize={{ xs: "1.7rem", sm: "2rem" }}>
                  Reset password
                </Typography>
                <Typography variant="body2" sx={authLayout.body2}>
                  Enter the code sent to your email and choose a new password.
                </Typography>
              </Box>

              {errors.submit && (
                <Alert icon={false} sx={authLayout.errorAlert}>
                  {errors.submit}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    id="reset-email"
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    fullWidth
                    disabled={isEmailLocked}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                    sx={authLayout.inputSx}
                  />

                  <TextField
                    id="reset-otp"
                    label="OTP"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    fullWidth
                    error={Boolean(errors.otp)}
                    helperText={errors.otp}
                    sx={authLayout.inputSx}
                  />

                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12, sm: 9 }}>
                      <TextField
                        id="reset-new-password"
                        label="New password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter a new password"
                        autoComplete="new-password"
                        fullWidth
                        error={Boolean(errors.newPassword)}
                        helperText={errors.newPassword}
                        sx={authLayout.inputSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <Button
                        type="button"
                        variant="contained"
                        color="primary"
                        onClick={() => setShowPassword((prev) => !prev)}
                        fullWidth
                        sx={authLayout.toggleButton}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </Grid>
                  </Grid>

                  <Button type="submit" variant="contained" color="primary" disabled={loading} sx={authLayout.primaryButton}>
                    {loading ? "Resetting..." : "Reset password"}
                  </Button>
                </Stack>
              </Box>

              <Typography variant="body2" sx={authLayout.footerText}>
                Remember your password?{" "}
                <Link component={RouterLink} to="/login" underline="hover" fontWeight={600} sx={authLayout.link}>
                  Back to login
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Resetpassword;

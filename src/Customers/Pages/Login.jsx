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
import client, {
  clearStoredAccessToken,
  setStoredAccessToken,
  setStoredAdminToken,
  setStoredRole,
  setStoredUserDisplayName,
} from "../../Setup/Axios";
import { colors, fonts } from "../../theme/theme";
import { useCart } from "../context/useCart";

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mergeCurrentGuestCart } = useCart();
  const redirectTo =
    location.state?.from?.pathname &&
    typeof location.state.from.pathname === "string"
      ? location.state.from.pathname
      : "/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email format";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await client.post("/auth/login", { email, password });
      const accessToken =
        response?.data?.data?.accessToken || response?.data?.accessToken;
      const role =
        response?.data?.data?.role ||
        response?.data?.role ||
        response?.data?.data?.user?.role ||
        response?.data?.user?.role ||
        "";
      const userFromResponse =
        response?.data?.data?.user ?? response?.data?.user ?? null;
      const nameFromUser =
        userFromResponse?.name != null
          ? String(userFromResponse.name).trim()
          : "";
      const displayName = nameFromUser || email.split("@")[0] || "";

      if (!accessToken) throw new Error("Access token missing in login response.");

      clearStoredAccessToken();
      if (role) setStoredRole(role);
      if (displayName) setStoredUserDisplayName(displayName);

      if (role === "super_admin" || role === "manager") {
        setStoredAdminToken(accessToken);
      } else {
        setStoredAccessToken(accessToken);
        try {
          await mergeCurrentGuestCart();
        } catch {
          /* keep login successful */
        }
      }

      setSuccessMessage("Signed in.");
      setTimeout(() => {
        setSuccessMessage("");
        if (role === "super_admin" || role === "manager") {
          navigate("/admin/dashboard");
          return;
        }
        navigate(redirectTo, { replace: true });
      }, 600);
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Login failed. Please try again.",
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
          <Typography sx={eyebrowSx}>Welcome back</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 36, sm: 48 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            Sign in
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14 }}>
            Pick up where you left off.
          </Typography>
        </Stack>

        {successMessage ? (
          <Alert
            severity="success"
            sx={{
              mb: 2,
              borderRadius: 0,
              border: `1px solid ${colors.success}`,
            }}
          >
            {successMessage}
          </Alert>
        ) : null}
        {errors.submit ? (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 0,
              border: `1px solid ${colors.danger}`,
            }}
          >
            {errors.submit}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleLogin}>
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
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              error={Boolean(errors.password)}
              helperText={errors.password}
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{ color: colors.muted, "&:hover": { color: colors.ink } }}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ textAlign: "right", mt: -1 }}>
              <Box
                component={RouterLink}
                to="/forgetpassword"
                sx={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: colors.muted,
                  textDecoration: "none",
                  "&:hover": { color: colors.ink },
                }}
              >
                Forgot password?
              </Box>
            </Box>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.75 }}
            >
              {loading ? "Signing in…" : "Sign in"}
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
          <Typography sx={{ color: colors.muted, fontSize: 13.5, mb: 1.5 }}>
            New to Shree Gallary?
          </Typography>
          <Button
            component={RouterLink}
            to="/signup"
            variant="outlined"
            fullWidth
            size="large"
            sx={{ py: 1.5 }}
          >
            Create account
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;

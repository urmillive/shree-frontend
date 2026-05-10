import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Fade,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  Zoom,
} from "@mui/material";
import { FiCheck, FiEye, FiEyeOff } from "react-icons/fi";
import client, {
  clearStoredAccessToken,
  setStoredAccessToken,
  setStoredAdminToken,
  setStoredRole,
  setStoredUserDisplayName,
} from "../../Setup/Axios";
import { colors, primaryAlpha } from "../../theme/theme";
import { mergeGuestCart } from "../services/publicCartService";

const authLayout = {
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
  successAlert: {
    bgcolor: primaryAlpha(0.16),
    color: colors.text,
    border: `1px solid ${primaryAlpha(0.7)}`,
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

const loginKeyframes = {
  "@keyframes loginMesh": {
    "0%, 100%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
  },
  "@keyframes loginFadeUp": {
    from: { opacity: 0, transform: "translateY(18px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

const motionSafe = (active, reduced) => ({
  "@media (prefers-reduced-motion: reduce)": reduced,
  ...active,
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    location.state?.from?.pathname && typeof location.state.from.pathname === "string"
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

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

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
      const accessToken = response?.data?.data?.accessToken || response?.data?.accessToken;
      const role =
        response?.data?.data?.role ||
        response?.data?.role ||
        response?.data?.data?.user?.role ||
        response?.data?.user?.role ||
        "";

      const userFromResponse =
        response?.data?.data?.user ?? response?.data?.user ?? null;
      const nameFromUser =
        userFromResponse?.name != null ? String(userFromResponse.name).trim() : "";
      const displayName = nameFromUser || email.split("@")[0] || "";

      if (!accessToken) {
        throw new Error("Access token missing in login response.");
      }

      clearStoredAccessToken();
      if (role) {
        setStoredRole(role);
      }
      if (displayName) {
        setStoredUserDisplayName(displayName);
      }

      if (role === "super_admin" || role === "manager") {
        setStoredAdminToken(accessToken);
      } else {
        setStoredAccessToken(accessToken);
        try {
          await mergeGuestCart();
        } catch {
          // Keep login successful even if merge fails.
        }
      }

      setSuccessMessage("Login successful.");
      setTimeout(() => {
        setSuccessMessage("");
        if (role === "super_admin" || role === "manager") {
          navigate("/admin/dashboard");
          return;
        }

        navigate(redirectTo, { replace: true });
      }, 800);
    } catch (error) {
      setErrors({
        submit: error.response?.data?.message || "Login failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordVisibilityIconSx = {
    color: colors.text,
    mr: -0.5,
    "&:hover": {
      bgcolor: primaryAlpha(0.14),
      color: colors.primary,
    },
  };

  const pageWrapperSx = {
    ...loginKeyframes,
    flex: 1,
    width: "100%",
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    py: { xs: 2.5, md: 5 },
    px: { xs: 2, sm: 3 },
    position: "relative",
    overflow: "hidden",
    bgcolor: colors.background,
    backgroundImage: `linear-gradient(125deg, ${colors.background} 0%, ${primaryAlpha(0.06)} 22%, ${colors.background} 45%, ${primaryAlpha(0.1)} 68%, ${colors.background} 100%)`,
    backgroundSize: "280% 280%",
    ...motionSafe(
      { animation: "loginMesh 22s ease-in-out infinite" },
      { animation: "none", backgroundSize: "100% 100%" }
    ),
  };

  const loginCardSx = {
    ...authLayout.card,
    position: "relative",
    zIndex: 1,
    borderRadius: { xs: 3, sm: 4 },
    border: `1px solid ${primaryAlpha(0.35)}`,
    boxShadow: `0 4px 24px ${primaryAlpha(0.08)}, 0 24px 64px ${primaryAlpha(0.12)}, 0 0 0 1px ${primaryAlpha(0.06)}`,
    backdropFilter: "blur(12px)",
    ...motionSafe(
      {
        transition: "box-shadow 0.35s ease, transform 0.35s ease",
        "&:hover": {
          boxShadow: `0 8px 32px ${primaryAlpha(0.12)}, 0 28px 72px ${primaryAlpha(0.16)}, 0 0 0 1px ${primaryAlpha(0.1)}`,
        },
      },
      { transition: "none", "&:hover": {} }
    ),
  };

  const heroLogoSx = {
    ...authLayout.logoMark,
    position: "relative",
    boxShadow: `0 12px 40px ${primaryAlpha(0.35)}`,
    ...motionSafe(
      {
        transition: "transform 0.35s ease, box-shadow 0.35s ease",
        "&:hover": { transform: "translateY(-2px) scale(1.03)" },
      },
      { transition: "none", "&:hover": {} }
    ),
  };

  const formStaggerSx = {
    "& > *": motionSafe(
      {
        animation: "loginFadeUp 0.52s cubic-bezier(0.22, 1, 0.36, 1) backwards",
      },
      { animation: "none" }
    ),
    "& > *:nth-of-type(1)": { animationDelay: "0.03s" },
    "& > *:nth-of-type(2)": { animationDelay: "0.07s" },
    "& > *:nth-of-type(3)": { animationDelay: "0.11s" },
    "& > *:nth-of-type(4)": { animationDelay: "0.15s" },
  };

  const primaryCtaSx = {
    ...authLayout.primaryButton,
    ...motionSafe(
      {
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover:not(.Mui-disabled)": {
          transform: "translateY(-1px)",
          boxShadow: `0 10px 28px ${primaryAlpha(0.4)}`,
        },
        "&:active:not(.Mui-disabled)": { transform: "translateY(0)" },
      },
      { transition: "none", "&:hover:not(.Mui-disabled)": {}, "&:active:not(.Mui-disabled)": {} }
    ),
  };

  const perks = [
    "Resume shopping with your saved bag and wishlist",
    "Track orders and returns in one place",
    "Member perks and faster checkout when signed in",
  ];

  return (
    <Box sx={pageWrapperSx}>
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            display: "grid",
            alignItems: "center",
            gap: { xs: 3, md: 5 },
            gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
            minHeight: { md: "min(640px, calc(100dvh - 220px))" },
          }}
        >
          <Fade in timeout={700}>
            <Box sx={{ textAlign: { xs: "center", md: "left" }, px: { md: 1 } }}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                  color: colors.primary,
                  display: "block",
                  mb: 1.5,
                }}
              >
                Shree Fashion
              </Typography>
              <Typography
                variant="h3"
                component="p"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  fontSize: { xs: "1.85rem", sm: "2.35rem", md: "2.75rem" },
                  color: colors.text,
                  mb: 2,
                }}
              >
                Welcome back — sign in and keep shopping in style.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: colors.label,
                  maxWidth: { md: 440 },
                  mx: { xs: "auto", md: 0 },
                  mb: 3,
                  lineHeight: 1.65,
                }}
              >
                Access your account for order history, saved details, and the same smooth checkout you expect from Shree Fashion.
              </Typography>
              <Stack spacing={1.75} sx={{ display: { xs: "none", sm: "flex" }, maxWidth: 420, mx: { xs: "auto", md: 0 } }}>
                {perks.map((line) => (
                  <Stack key={line} direction="row" spacing={1.25} alignItems="flex-start">
                    <Box
                      sx={{
                        mt: 0.35,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: primaryAlpha(0.2),
                        color: colors.primary,
                        flexShrink: 0,
                      }}
                    >
                      <FiCheck size={14} strokeWidth={2.5} aria-hidden />
                    </Box>
                    <Typography variant="body2" sx={{ color: colors.text, lineHeight: 1.55, textAlign: "left" }}>
                      {line}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Fade>

          <Fade in timeout={900} style={{ transitionDelay: "80ms" }}>
            <Box>
              <Zoom in timeout={600} style={{ transitionDelay: "120ms" }}>
                <Card sx={loginCardSx}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
                    <Stack spacing={3}>
                      <Box textAlign="center">
                        <Box sx={heroLogoSx}>S</Box>
                        <Typography variant="h4" component="h1" fontWeight={800} fontSize={{ xs: "1.65rem", sm: "1.9rem" }}>
                          Welcome Back
                        </Typography>
                        <Typography variant="body2" sx={{ ...authLayout.body2, mt: 0.75, opacity: 0.92 }}>
                          Sign in to continue your journey — we missed you.
                        </Typography>
                      </Box>

                      {successMessage && (
                        <Alert icon={false} sx={authLayout.successAlert}>
                          {successMessage}
                        </Alert>
                      )}
                      {errors.submit && (
                        <Alert icon={false} sx={authLayout.errorAlert}>
                          {errors.submit}
                        </Alert>
                      )}

                      <Stack component="form" onSubmit={handleLogin} spacing={2} sx={formStaggerSx}>
                        <TextField
                          id="email"
                          label="Email Address"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          fullWidth
                          error={Boolean(errors.email)}
                          helperText={errors.email}
                          sx={authLayout.inputSx}
                        />

                        <TextField
                          id="password"
                          label="Password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          fullWidth
                          error={Boolean(errors.password)}
                          helperText={errors.password}
                          sx={authLayout.inputSx}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  type="button"
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  edge="end"
                                  size="small"
                                  sx={passwordVisibilityIconSx}
                                >
                                  {showPassword ? (
                                    <FiEyeOff size={20} strokeWidth={2} aria-hidden />
                                  ) : (
                                    <FiEye size={20} strokeWidth={2} aria-hidden />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -0.5 }}>
                          <Link
                            component={RouterLink}
                            to="/forgetpassword"
                            underline="hover"
                            variant="body2"
                            fontWeight={600}
                            sx={authLayout.link}
                          >
                            Forgot password?
                          </Link>
                        </Box>

                        <Button type="submit" variant="contained" color="primary" disabled={loading} sx={primaryCtaSx}>
                          {loading ? "Signing in..." : "Login"}
                        </Button>
                      </Stack>

                      <Typography variant="body2" sx={authLayout.footerText}>
                        New here?{" "}
                        <Link component={RouterLink} to="/signup" underline="hover" fontWeight={600} sx={authLayout.link}>
                          Create account
                        </Link>
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Zoom>
            </Box>
          </Fade>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;

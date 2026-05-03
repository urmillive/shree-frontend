import React, { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  InputAdornment,
  Link,
  Slide,
  Stack,
  TextField,
  Typography,
  Zoom,
} from "@mui/material";
import { FiCheck, FiEye, FiEyeOff, FiX } from "react-icons/fi";
import client from "../../Setup/Axios";
import { colors, primaryAlpha } from "../../theme/theme";

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

const OtpDialogTransition = React.forwardRef(function OtpDialogTransition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const signupKeyframes = {
  "@keyframes signupMesh": {
    "0%, 100%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
  },
  "@keyframes signupFadeUp": {
    from: { opacity: 0, transform: "translateY(18px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

const motionSafe = (active, reduced) => ({
  "@media (prefers-reduced-motion: reduce)": reduced,
  ...active,
});

const Signup = () => {
  const navigate = useNavigate();
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendOtpLoading, setResendOtpLoading] = useState(false);
  const [resendOtpNotice, setResendOtpNotice] = useState("");

  const passwordStrength = useMemo(() => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, [password]);

  const strengthMeta = [
    { label: "Weak", className: "strength-weak" },
    { label: "Fair", className: "strength-fair" },
    { label: "Good", className: "strength-good" },
    { label: "Strong", className: "strength-strong" },
    { label: "Very Strong", className: "strength-very-strong" },
  ][passwordStrength];

  const validateForm = () => {
    const newErrors = {};

    if (!fullname.trim()) newErrors.fullname = "Full name is required";
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(mobile.replace(/\D/g, ""))) {
      newErrors.mobile = "Invalid mobile number";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createRegister = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrors({});

    if (!validateForm()) return;

    const payload = {
      name: fullname,
      email,
      mobile,
      password,
    };

    setLoading(true);
    try {
      await client.post("/auth/register", payload);
      setSuccessMessage("Account created successfully. Please verify your email.");
      setVerificationEmail(email);
      setShowOtpModal(true);
      setOtp("");
      setOtpMessage("");
      setResendOtpNotice("");
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue) => {
    const otpToVerify = otpValue ?? otp;
    if (otpToVerify.length !== 6 || otpLoading) return;

    setOtpLoading(true);
    setOtpMessage("");
    setErrors((prev) => ({ ...prev, otp: "" }));

    try {
      await client.post("/auth/verify-email", {
        email: verificationEmail,
        otp: otpToVerify,
      });

      setOtpMessage("Email verified successfully.");
      setResendOtpNotice("");
      setFullname("");
      setEmail("");
      setMobile("");
      setPassword("");
      setConfirmPassword("");
      setOtp("");

      setTimeout(() => {
        setShowOtpModal(false);
        setOtpMessage("");
        setSuccessMessage("");
      }, 1200);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        otp: error.response?.data?.message || "Invalid OTP. Please try again.",
      }));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (!verificationEmail.trim() || resendOtpLoading) return;

    setResendOtpLoading(true);
    setResendOtpNotice("");
    setErrors((prev) => ({ ...prev, resend: "" }));

    try {
      await client.post("/auth/resend-email-otp", {
        email: verificationEmail.trim(),
      });
      setResendOtpNotice("A new OTP has been sent to your email.");
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        resend:
          error.response?.data?.message ||
          "Could not resend OTP. Please try again.",
      }));
    } finally {
      setResendOtpLoading(false);
    }
  };

  const handleOtpChange = (event) => {
    const nextOtp = event.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(nextOtp);
    setErrors((prev) => ({ ...prev, otp: "", resend: "" }));
    setOtpMessage("");
    setResendOtpNotice("");

    if (nextOtp.length === 6) {
      handleVerifyOtp(nextOtp);
    }
  };

  const closeOtpDialog = () => {
    if (otpLoading || resendOtpLoading) return;
    setShowOtpModal(false);
    setOtp("");
    setOtpMessage("");
    setResendOtpNotice("");
    setErrors((prev) => ({ ...prev, otp: "", resend: "" }));
  };

  const dialogPaperSx = {
    bgcolor: colors.background,
    color: colors.text,
    border: `1px solid ${primaryAlpha(0.6)}`,
    borderRadius: 3,
    boxShadow: `0 24px 80px ${primaryAlpha(0.18)}, 0 0 0 1px ${primaryAlpha(0.08)}`,
  };

  const dialogTextActionSx = {
    cursor: "pointer",
    color: colors.primary,
    fontWeight: 600,
    fontSize: "0.875rem",
    textDecoration: "none",
    border: "none",
    background: "none",
    padding: 0,
    fontFamily: "inherit",
    "&:hover": { textDecoration: "underline" },
    "&:disabled": {
      color: colors.disabledText,
      cursor: "not-allowed",
      textDecoration: "none",
    },
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
    ...signupKeyframes,
    minHeight: "100vh",
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
      { animation: "signupMesh 22s ease-in-out infinite" },
      { animation: "none", backgroundSize: "100% 100%" }
    ),
  };

  const signupCardSx = {
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
        animation: "signupFadeUp 0.52s cubic-bezier(0.22, 1, 0.36, 1) backwards",
      },
      { animation: "none" }
    ),
    "& > *:nth-of-type(1)": { animationDelay: "0.03s" },
    "& > *:nth-of-type(2)": { animationDelay: "0.07s" },
    "& > *:nth-of-type(3)": { animationDelay: "0.11s" },
    "& > *:nth-of-type(4)": { animationDelay: "0.15s" },
    "& > *:nth-of-type(5)": { animationDelay: "0.19s" },
    "& > *:nth-of-type(6)": { animationDelay: "0.23s" },
    "& > *:nth-of-type(7)": { animationDelay: "0.27s" },
    "& > *:nth-of-type(8)": { animationDelay: "0.31s" },
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
    "Curated collections & new drops every week",
    "Secure checkout and order tracking",
    "Member-only offers when you join",
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
            minHeight: { md: "min(640px, calc(100vh - 80px))" },
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
                Create your account and start shopping in style.
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
                Join thousands of customers who discover quality fashion, fast delivery, and a seamless checkout experience.
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
                <Card sx={signupCardSx}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
                    <Stack spacing={3}>
                      <Box textAlign="center">
                        <Box sx={heroLogoSx}>S</Box>
                        <Typography variant="h4" component="h1" fontWeight={800} fontSize={{ xs: "1.65rem", sm: "1.9rem" }}>
                          Create Account
                        </Typography>
                        <Typography variant="body2" sx={{ ...authLayout.body2, mt: 0.75, opacity: 0.92 }}>
                          Join our fashion community — it only takes a minute.
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

                      <Stack component="form" onSubmit={createRegister} spacing={2} sx={formStaggerSx}>
                        <TextField
                          id="fullname"
                          label="Full Name"
                          type="text"
                          value={fullname}
                          onChange={(e) => setFullname(e.target.value)}
                          placeholder="Enter your full name"
                          autoComplete="name"
                          fullWidth
                          error={Boolean(errors.fullname)}
                          helperText={errors.fullname}
                          sx={authLayout.inputSx}
                        />

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
                          id="mobile"
                          label="Mobile Number"
                          type="text"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="10 digit mobile number"
                          autoComplete="tel"
                          fullWidth
                          error={Boolean(errors.mobile)}
                          helperText={errors.mobile}
                          sx={authLayout.inputSx}
                        />

                        <TextField
                          id="password"
                          label="Password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a strong password"
                          autoComplete="new-password"
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

                        {password && (
                          <Box sx={{ mt: -0.5 }}>
                            {/* <Stack direction="row" spacing={0.8} sx={{ mb: 0.8 }}>
                              {[0, 1, 2, 3].map((bar) => {
                                const isActive = bar < passwordStrength;
                                return (
                                  <Box
                                    key={bar}
                                    sx={{
                                      height: 7,
                                      borderRadius: 99,
                                      flex: 1,
                                      ...motionSafe(
                                        {
                                          transition: "background-color 0.25s ease, transform 0.25s ease",
                                          transform: isActive ? "scaleY(1.15)" : "scaleY(1)",
                                        },
                                        { transition: "none", transform: "none" }
                                      ),
                                      bgcolor: isActive ? colors.primary : colors.inactiveBar,
                                      boxShadow: isActive ? `0 0 0 1px ${primaryAlpha(0.35)} inset` : "none",
                                    }}
                                  />
                                );
                              })}
                            </Stack> */}
                            <Typography variant="caption" sx={{ color: colors.text, opacity: 0.9 }}>
                              Password strength: <strong>{strengthMeta.label}</strong>
                            </Typography>
                          </Box>
                        )}

                        <TextField
                          id="confirmPassword"
                          label="Confirm Password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          fullWidth
                          error={Boolean(errors.confirmPassword)}
                          helperText={errors.confirmPassword}
                          sx={authLayout.inputSx}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  type="button"
                                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                                  edge="end"
                                  size="small"
                                  sx={passwordVisibilityIconSx}
                                >
                                  {showConfirmPassword ? (
                                    <FiEyeOff size={20} strokeWidth={2} aria-hidden />
                                  ) : (
                                    <FiEye size={20} strokeWidth={2} aria-hidden />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <Button type="submit" variant="contained" color="primary" disabled={loading} sx={primaryCtaSx}>
                          {loading ? "Creating account..." : "Create Account"}
                        </Button>
                      </Stack>

                      <Typography variant="body2" sx={authLayout.footerText}>
                        Already have an account?{" "}
                        <Link component={RouterLink} to="/login" underline="hover" fontWeight={600} sx={authLayout.link}>
                          Login
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

      <Dialog
        open={showOtpModal}
        onClose={(_, reason) => {
          if (reason === "backdropClick" && (otpLoading || resendOtpLoading)) return;
          closeOtpDialog();
        }}
        slots={{ transition: OtpDialogTransition }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: dialogPaperSx,
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            pb: 1,
            pr: 1,
          }}
        >
          Verify OTP
          <IconButton
            type="button"
            aria-label="Close"
            onClick={closeOtpDialog}
            disabled={otpLoading || resendOtpLoading}
            size="small"
            sx={{
              color: colors.text,
              "&:hover": { bgcolor: primaryAlpha(0.12), color: colors.primary },
            }}
          >
            <FiX size={22} strokeWidth={2} aria-hidden />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" sx={{ mb: 2, color: colors.text }}>
            Enter the 6 digit OTP sent to <strong>{verificationEmail}</strong>
          </Typography>

          <TextField
            type="text"
            value={otp}
            onChange={handleOtpChange}
            placeholder="Enter 6 digit OTP"
            inputProps={{ maxLength: 6 }}
            autoFocus
            fullWidth
            error={Boolean(errors.otp)}
            helperText={errors.otp}
            sx={authLayout.inputSx}
          />

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
            <Box
              component="button"
              type="button"
              onClick={handleResendEmailOtp}
              disabled={resendOtpLoading || !verificationEmail.trim()}
              sx={dialogTextActionSx}
            >
              {resendOtpLoading ? "Sending…" : "Resend OTP"}
            </Box>
          </Box>

          {errors.resend && (
            <Typography variant="body2" sx={{ mt: 1.25, color: "error.main" }}>
              {errors.resend}
            </Typography>
          )}
          {resendOtpNotice && (
            <Typography variant="body2" sx={{ mt: 1.25, color: colors.primary }}>
              {resendOtpNotice}
            </Typography>
          )}
          {otpMessage && (
            <Typography variant="body2" sx={{ mt: 1.25, color: colors.primary }}>
              {otpMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 0.5,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => navigate("/login")}
            disabled={otpLoading || resendOtpLoading}
            sx={{ ...dialogTextActionSx, textAlign: "left" }}
          >
            Skip
          </Box>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={() => handleVerifyOtp()}
            disabled={otpLoading || resendOtpLoading || otp.length !== 6}
            sx={{ ...authLayout.primaryButton, mt: 0, py: 1.25 }}
          >
            {otpLoading ? "Verifying..." : "Verify OTP"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Signup;

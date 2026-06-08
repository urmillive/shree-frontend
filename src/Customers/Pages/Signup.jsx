import React, { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
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

  const strengthLabel = ["Weak", "Fair", "Good", "Strong", "Very strong"][
    passwordStrength
  ];

  const validateForm = () => {
    const newErrors = {};
    if (!fullname.trim()) newErrors.fullname = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email format";
    if (!mobile.trim()) newErrors.mobile = "Mobile is required";
    else if (!/^\d{10}$/.test(mobile.replace(/\D/g, "")))
      newErrors.mobile = "Invalid mobile number";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm password";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createRegister = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      await client.post("/auth/register", {
        name: fullname,
        email,
        mobile,
        password,
      });
      setSuccessMessage(
        "Account created. Verify your email to finish signing up."
      );
      setVerificationEmail(email);
      setShowOtpModal(true);
      setOtp("");
      setOtpMessage("");
      setResendOtpNotice("");
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.error?.message ||
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
      setOtpMessage("Email verified.");
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
        navigate("/login");
      }, 1000);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        otp:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Invalid OTP. Please try again.",
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
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Could not resend OTP.",
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
    if (nextOtp.length === 6) handleVerifyOtp(nextOtp);
  };

  const closeOtpDialog = () => {
    if (otpLoading || resendOtpLoading) return;
    setShowOtpModal(false);
    setOtp("");
    setOtpMessage("");
    setResendOtpNotice("");
    setErrors((prev) => ({ ...prev, otp: "", resend: "" }));
  };

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "70vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 460, px: { xs: 3, sm: 5 }, py: { xs: 6, sm: 10 } }}
      >
        <Stack spacing={1.5} sx={{ textAlign: "center", mb: 5 }}>
          <Typography sx={eyebrowSx}>Join the Atelier</Typography>
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
            Create account
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14 }}>
            Early access to new arrivals and a faster checkout.
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

        <Box component="form" onSubmit={createRegister}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Full name"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              autoComplete="name"
              error={Boolean(errors.fullname)}
              helperText={errors.fullname}
              size="small"
            />
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
              label="Mobile"
              value={mobile}
              onChange={(e) =>
                setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              autoComplete="tel"
              error={Boolean(errors.mobile)}
              helperText={errors.mobile}
              size="small"
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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
            {password ? (
              <Stack direction="row" spacing={0.75} sx={{ mt: -1.5 }}>
                {[0, 1, 2, 3].map((bar) => (
                  <Box
                    key={bar}
                    sx={{
                      height: 2,
                      flex: 1,
                      bgcolor:
                        bar < passwordStrength ? colors.ink : colors.line,
                      transition: "background-color 200ms",
                    }}
                  />
                ))}
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: colors.muted,
                    ml: 1,
                  }}
                >
                  {strengthLabel}
                </Typography>
              </Stack>
            ) : null}
            <TextField
              fullWidth
              label="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword}
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{
                        color: colors.muted,
                        "&:hover": { color: colors.ink },
                      }}
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff size={16} />
                      ) : (
                        <FiEye size={16} />
                      )}
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
              {loading ? "Creating account…" : "Create account"}
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
            Already have an account?
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            fullWidth
            size="large"
            sx={{ py: 1.5 }}
          >
            Sign in
          </Button>
        </Box>
      </Container>

      <Dialog
        open={showOtpModal}
        onClose={closeOtpDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <DialogTitle
          sx={{
            fontFamily: fonts.display,
            fontSize: 24,
            fontWeight: 500,
            color: colors.ink,
            borderBottom: `1px solid ${colors.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Verify email
          <IconButton
            onClick={closeOtpDialog}
            disabled={otpLoading || resendOtpLoading}
            size="small"
            sx={{
              color: colors.muted,
              "&:hover": { color: colors.ink, backgroundColor: "transparent" },
            }}
          >
            <FiX size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography
            sx={{ color: colors.muted, fontSize: 13.5, mb: 2.5, lineHeight: 1.6 }}
          >
            Enter the 6-digit code sent to{" "}
            <strong style={{ color: colors.ink }}>{verificationEmail}</strong>.
          </Typography>
          <TextField
            fullWidth
            value={otp}
            onChange={handleOtpChange}
            placeholder="6-digit OTP"
            autoFocus
            inputProps={{ maxLength: 6 }}
            error={Boolean(errors.otp)}
            helperText={errors.otp}
            size="small"
          />
          {resendOtpNotice ? (
            <Typography
              sx={{ mt: 1.5, fontSize: 12, color: colors.success }}
            >
              {resendOtpNotice}
            </Typography>
          ) : null}
          {errors.resend ? (
            <Typography
              sx={{ mt: 1.5, fontSize: 12, color: colors.danger }}
            >
              {errors.resend}
            </Typography>
          ) : null}
          {otpMessage ? (
            <Typography
              sx={{ mt: 1.5, fontSize: 12, color: colors.success }}
            >
              {otpMessage}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.line}` }}>
          <Button
            variant="text"
            onClick={handleResendEmailOtp}
            disabled={resendOtpLoading || !verificationEmail.trim()}
            sx={{ color: colors.muted }}
          >
            {resendOtpLoading ? "Sending…" : "Resend"}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            onClick={() => handleVerifyOtp()}
            disabled={otpLoading || resendOtpLoading || otp.length !== 6}
          >
            {otpLoading ? "Verifying…" : "Verify"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Signup;

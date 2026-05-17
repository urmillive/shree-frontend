import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import client from "../../Setup/Axios";
import { getApiErrorMessage } from "../../utils/apiError";
import { colors, primaryAlpha } from "../../theme/theme";

const authLayout = {
  pageBox: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
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

const Forgetpassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
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
      await client.post("/auth/forgot-password", { email: email.trim() });
      navigate("/resetpassword", { state: { email: email.trim() }, replace: true });
    } catch (error) {
      setErrors({
        submit:
          getApiErrorMessage(error, "Something went wrong. Please try again."),
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
                  Forgot password
                </Typography>
                <Typography variant="body2" sx={authLayout.body2}>
                  Enter your email and we&apos;ll send you instructions to reset your password.
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
                    id="forgot-email"
                    label="Email address"
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

                  <Button type="submit" variant="contained" color="primary" disabled={loading} sx={authLayout.primaryButton}>
                    {loading ? "Sending..." : "Send reset link"}
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

export default Forgetpassword;

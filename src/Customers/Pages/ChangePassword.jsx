import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
import { FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import client, { clearStoredAccessToken } from "../../Setup/Axios";
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
  errorAlert: {
    bgcolor: colors.mutedSurface,
    color: colors.text,
    border: `1px solid ${colors.borderStrong}`,
  },
  body2: {
    mt: 1,
    color: colors.text,
  },
};

const signupKeyframes = {
  "@keyframes changePwMesh": {
    "0%, 100%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
  },
  "@keyframes changePwFadeUp": {
    from: { opacity: 0, transform: "translateY(18px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

const motionSafe = (active, reduced) => ({
  "@media (prefers-reduced-motion: reduce)": reduced,
  ...active,
});

const ChangePassword = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordErr, setChangePasswordErr] = useState("");

  const passwordVisibilityIconSx = {
    color: colors.text,
    mr: -0.5,
    transition: "background-color 0.22s ease, color 0.22s ease, transform 0.22s ease",
    "&:hover": {
      bgcolor: primaryAlpha(0.14),
      color: colors.primary,
      transform: "scale(1.06)",
    },
  };

  const pageWrapperSx = {
    ...signupKeyframes,
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
      { animation: "changePwMesh 22s ease-in-out infinite" },
      { animation: "none", backgroundSize: "100% 100%" }
    ),
  };

  const cardSx = {
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
        animation: "changePwFadeUp 0.52s cubic-bezier(0.22, 1, 0.36, 1) backwards",
      },
      { animation: "none" }
    ),
    "& > *:nth-of-type(1)": { animationDelay: "0.03s" },
    "& > *:nth-of-type(2)": { animationDelay: "0.08s" },
    "& > *:nth-of-type(3)": { animationDelay: "0.13s" },
    "& > *:nth-of-type(4)": { animationDelay: "0.18s" },
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cur = currentPassword;
    const next = newPassword;
    const confirm = confirmNewPassword;
    if (!cur) {
      setChangePasswordErr("Enter your current password.");
      return;
    }
    if (!next || next.length < 8) {
      setChangePasswordErr("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setChangePasswordErr("New passwords do not match.");
      return;
    }
    if (cur === next) {
      setChangePasswordErr("Choose a new password that is different from your current one.");
      return;
    }
    setChangingPassword(true);
    setChangePasswordErr("");
    try {
      await client.put("/users/me/change-password", {
        currentPassword: cur,
        newPassword: next,
      });
      try {
        await client.post("/auth/logout", {});
      } catch {
        /* still clear session locally */
      } finally {
        clearStoredAccessToken();
        navigate("/login");
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      setChangePasswordErr(err?.response?.data?.message || "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Box sx={pageWrapperSx}>
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Fade in timeout={700}>
          <Box sx={{ mb: 2 }}>
            <Link
              component={RouterLink}
              to="/profile"
              underline="hover"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                color: colors.text,
                fontWeight: 600,
                fontSize: "0.95rem",
                transition: "color 0.2s ease, transform 0.2s ease",
                "&:hover": { color: colors.primary, transform: "translateX(-2px)" },
              }}
            >
              <FiArrowLeft size={20} strokeWidth={2.25} aria-hidden />
              Back to profile
            </Link>
          </Box>
        </Fade>

        <Fade in timeout={900} style={{ transitionDelay: "60ms" }}>
          <Box>
            <Zoom in timeout={600} style={{ transitionDelay: "100ms" }}>
              <Card sx={cardSx}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
                  <Stack spacing={3}>
                    <Box textAlign="center">
                      <Box sx={heroLogoSx}>S</Box>
                      <Typography variant="h4" component="h1" fontWeight={800} fontSize={{ xs: "1.65rem", sm: "1.9rem" }}>
                        Change password
                      </Typography>
                      <Typography variant="body2" sx={{ ...authLayout.body2, mt: 0.75, opacity: 0.92 }}>
                        Enter your current password, then choose a new one (at least 8 characters).
                      </Typography>
                    </Box>

                    {changePasswordErr && (
                      <Alert icon={false} sx={authLayout.errorAlert}>
                        {changePasswordErr}
                      </Alert>
                    )}
                    <Box component="form" onSubmit={handleSubmit}>
                      <Stack spacing={2} sx={formStaggerSx}>
                        <TextField
                          id="current-password"
                          label="Current password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          autoComplete="current-password"
                          fullWidth
                          disabled={changingPassword}
                          sx={authLayout.inputSx}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  type="button"
                                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                                  edge="end"
                                  size="small"
                                  sx={passwordVisibilityIconSx}
                                >
                                  {showCurrentPassword ? (
                                    <FiEyeOff size={20} strokeWidth={2} aria-hidden />
                                  ) : (
                                    <FiEye size={20} strokeWidth={2} aria-hidden />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <TextField
                          id="new-password"
                          label="New password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          autoComplete="new-password"
                          fullWidth
                          disabled={changingPassword}
                          sx={authLayout.inputSx}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  type="button"
                                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                                  onClick={() => setShowNewPassword((prev) => !prev)}
                                  edge="end"
                                  size="small"
                                  sx={passwordVisibilityIconSx}
                                >
                                  {showNewPassword ? (
                                    <FiEyeOff size={20} strokeWidth={2} aria-hidden />
                                  ) : (
                                    <FiEye size={20} strokeWidth={2} aria-hidden />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <TextField
                          id="confirm-new-password"
                          label="Confirm new password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                          fullWidth
                          disabled={changingPassword}
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

                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={
                            changingPassword ||
                            !currentPassword ||
                            !newPassword ||
                            !confirmNewPassword
                          }
                          sx={primaryCtaSx}
                        >
                          {changingPassword ? "Updating…" : "Update password"}
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Zoom>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default ChangePassword;

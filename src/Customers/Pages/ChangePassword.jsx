import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
import client, { clearStoredAccessToken } from "../../Setup/Axios";
import { colors, fonts } from "../../theme/theme";

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

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
      setChangePasswordErr(
        "Choose a new password that is different from your current one."
      );
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
      setChangePasswordErr(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 560, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Box
          component={RouterLink}
          to="/profile"
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
          ← Back to profile
        </Box>

        <Stack spacing={1.5} sx={{ mb: { xs: 4, sm: 5 } }}>
          <Typography sx={eyebrowSx}>Security</Typography>
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
            Change password
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14, mt: 1 }}>
            Enter your current password, then choose a new one (at least 8
            characters).
          </Typography>
        </Stack>

        {changePasswordErr ? (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 0,
              border: `1px solid ${colors.danger}`,
            }}
          >
            {changePasswordErr}
          </Alert>
        ) : null}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            bgcolor: colors.paper,
            border: `1px solid ${colors.line}`,
            p: { xs: 3, sm: 4 },
          }}
        >
          <Stack spacing={3}>
            <TextField
              fullWidth
              size="small"
              label="Current password"
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={changingPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{
                        color: colors.muted,
                        "&:hover": { color: colors.ink },
                      }}
                    >
                      {showCurrentPassword ? (
                        <FiEyeOff size={16} />
                      ) : (
                        <FiEye size={16} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="New password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={changingPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{
                        color: colors.muted,
                        "&:hover": { color: colors.ink },
                      }}
                    >
                      {showNewPassword ? (
                        <FiEyeOff size={16} />
                      ) : (
                        <FiEye size={16} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Confirm new password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={changingPassword}
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
              disabled={
                changingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmNewPassword
              }
              sx={{ py: 1.75, mt: 1 }}
            >
              {changingPassword ? "Updating…" : "Update password"}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default ChangePassword;

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { FiAlertTriangle, FiMail, FiPhone } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useVerification } from "../../context/VerificationContext";
import { colors, primaryAlpha } from "../../theme/theme";

const dialogPaperSx = {
  bgcolor: colors.background,
  color: colors.text,
  border: `1px solid ${primaryAlpha(0.6)}`,
  borderRadius: 3,
  boxShadow: `0 24px 80px ${primaryAlpha(0.18)}, 0 0 0 1px ${primaryAlpha(0.08)}`,
};

export default function VerificationWarningDialog() {
  const navigate = useNavigate();
  const {
    dialogOpen,
    isEmailVerified,
    isMobileVerified,
    needsVerification,
    closeVerificationWarning,
    dismissVerificationWarning,
  } = useVerification();

  if (!needsVerification) {
    return null;
  }

  const handleVerifyNow = () => {
    closeVerificationWarning();
    navigate("/profile");
  };

  return (
    <Dialog
      open={dialogOpen}
      onClose={(_, reason) => {
        if (reason === "backdropClick") return;
        dismissVerificationWarning();
      }}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: dialogPaperSx }}
      aria-labelledby="verification-warning-title"
    >
      <DialogTitle
        id="verification-warning-title"
        sx={{ display: "flex", alignItems: "center", gap: 1.25, pb: 1 }}
      >
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "warning.main",
            color: "warning.contrastText",
          }}
        >
          <FiAlertTriangle size={22} aria-hidden />
        </Box>
        <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
          Account verification required
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Verify at least your email or mobile number to place orders and use account features.
        </Alert>

        <Typography variant="body2" sx={{ mb: 1.5, color: colors.text, opacity: 0.9 }}>
          Verify either one of the following:
        </Typography>

        <List dense disablePadding>
          {!isEmailVerified ? (
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36, color: "warning.main" }}>
                <FiMail size={18} aria-hidden />
              </ListItemIcon>
              <ListItemText primary="Email address" secondary="Check your inbox for the OTP" />
            </ListItem>
          ) : null}
          {!isMobileVerified ? (
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36, color: "warning.main" }}>
                <FiPhone size={18} aria-hidden />
              </ListItemIcon>
              <ListItemText primary="Mobile number" secondary="Verify from your profile page" />
            </ListItem>
          ) : null}
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1, flexWrap: "wrap" }}>
        <Button
          type="button"
          color="inherit"
          onClick={dismissVerificationWarning}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Remind me later
        </Button>
        <Button
          type="button"
          variant="contained"
          color="warning"
          onClick={handleVerifyNow}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            ml: "auto",
            bgcolor: colors.buttonBackground,
            color: colors.buttonText,
            "&:hover": { bgcolor: colors.buttonBackground, filter: "brightness(0.92)" },
          }}
        >
          Verify now
        </Button>
      </DialogActions>
    </Dialog>
  );
}

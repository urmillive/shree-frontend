import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { colors } from "../../theme/theme";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="h1" sx={{ fontWeight: 900, fontSize: { xs: "5rem", sm: "8rem" }, color: colors.primary, lineHeight: 1 }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Page not found
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}>
        Back to home
      </Button>
    </Box>
  );
}

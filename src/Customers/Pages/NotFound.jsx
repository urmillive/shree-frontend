import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { colors, fonts } from "../../theme/theme";

export default function NotFound() {
  return (
    <Box
      sx={{
        bgcolor: colors.ivory,
        color: colors.ink,
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="sm" sx={{ textAlign: "center", py: { xs: 8, sm: 12 } }}>
        <Stack spacing={3} alignItems="center">
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: colors.muted,
            }}
          >
            Error 404
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 88, sm: 144 },
              fontWeight: 500,
              color: colors.ink,
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
            }}
          >
            Lost.
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.muted,
              maxWidth: 400,
              lineHeight: 1.7,
            }}
          >
            The page you're looking for has moved or no longer exists. Let's
            help you find your way back.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button component={RouterLink} to="/" variant="contained" size="large">
              Back to home
            </Button>
            <Button
              component={RouterLink}
              to="/products"
              variant="outlined"
              size="large"
            >
              Browse the shop
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

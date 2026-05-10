import React from "react";
import { Box, Container, Divider, Grid, Link, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { colors } from "../../theme/theme";

const footerLinkSx = {
  color: alpha(colors.text, 0.78),
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
  "&:hover": { color: colors.primary },
};

const CustomerFooter = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        bgcolor: alpha(colors.text, 0.04),
        borderTop: `1px solid ${alpha(colors.text, 0.08)}`,
        color: colors.text,
        py: { xs: 3, sm: 4 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 3, sm: 4 }}>
          <Grid item xs={12} sm={5} md={4}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={800} letterSpacing={-0.2}>
                Shree Fashion
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.65), maxWidth: 320, lineHeight: 1.6 }}>
                Quality styles and a smooth shopping experience. Sign in to manage your profile, addresses, and orders.
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1, color: alpha(colors.text, 0.5) }}>
              Shop
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              <Link component={RouterLink} to="/" sx={{ ...footerLinkSx, display: "block" }}>
                Home
              </Link>
              <Link component={RouterLink} to="/#shop-categories" sx={{ ...footerLinkSx, display: "block" }}>
                Shop categories
              </Link>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1, color: alpha(colors.text, 0.5) }}>
              Account
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              <Link component={RouterLink} to="/login" sx={{ ...footerLinkSx, display: "block" }}>
                Sign in
              </Link>
              <Link component={RouterLink} to="/signup" sx={{ ...footerLinkSx, display: "block" }}>
                Create account
              </Link>
              <Link component={RouterLink} to="/profile" sx={{ ...footerLinkSx, display: "block" }}>
                Profile
              </Link>
              <Link component={RouterLink} to="/forgetpassword" sx={{ ...footerLinkSx, display: "block" }}>
                Forgot password
              </Link>
            </Stack>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1, color: alpha(colors.text, 0.5) }}>
              Help
            </Typography>
            <Typography variant="body2" sx={{ mt: 1.5, color: alpha(colors.text, 0.65), lineHeight: 1.6 }}>
              For order or account questions, reach out through your profile after signing in, or contact support through
              your preferred channel.
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 2.5, sm: 3 }, borderColor: alpha(colors.text, 0.08) }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.5) }}>
            © {year} Shree Fashion. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(colors.text, 0.45) }}>
            Crafted with care for our customers.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default CustomerFooter;

import React from "react";
import {
  Box,
  Container,
  Divider,
  Grid,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { FiInstagram, FiTwitter } from "react-icons/fi";
import { colors, fonts } from "../../theme/theme";

const linkSx = {
  color: colors.muted,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: "0.01em",
  display: "inline-block",
  py: 0.5,
  transition: "color 200ms cubic-bezier(0.2,0.7,0.2,1)",
  "&:hover": { color: colors.ink },
};

const columnLabelSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.ink,
  mb: 2,
};

const wordmarkSx = {
  fontFamily: fonts.display,
  fontWeight: 500,
  letterSpacing: "0.34em",
  fontSize: 22,
  color: colors.ink,
  textTransform: "uppercase",
  lineHeight: 1,
};

const CustomerFooter = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        bgcolor: colors.paper,
        borderTop: `1px solid ${colors.line}`,
        color: colors.ink,
        pt: { xs: 6, sm: 9 },
        pb: { xs: 3, sm: 4 },
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 3, sm: 4 } }}>
        {/* Newsletter row */}
        <Grid
          container
          spacing={{ xs: 4, md: 8 }}
          alignItems="flex-start"
          sx={{ pb: { xs: 5, sm: 7 } }}
        >
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography component="div" sx={wordmarkSx}>
              Shree Gallery
            </Typography>
            <Typography
              sx={{
                mt: 2.5,
                color: colors.muted,
                maxWidth: 420,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Modern Indian fashion. Considered craft, editorial drops, and a
              shopping experience built with care.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={columnLabelSx}>The Atelier — Newsletter</Typography>
            <Typography
              sx={{
                color: colors.muted,
                fontSize: 13.5,
                lineHeight: 1.7,
                mb: 2.5,
              }}
            >
              Early access to new arrivals, private sales, and editorial
              stories. No noise.
            </Typography>
            <Box
              component="form"
              onSubmit={(e) => e.preventDefault()}
              sx={{
                display: "flex",
                borderBottom: `1px solid ${colors.ink}`,
                pb: 0.5,
                gap: 1,
                maxWidth: 480,
              }}
            >
              <Box
                component="input"
                type="email"
                placeholder="your@email.com"
                aria-label="Email address"
                sx={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  bgcolor: "transparent",
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.ink,
                  py: 1,
                  "::placeholder": { color: colors.muted },
                }}
              />
              <Box
                component="button"
                type="submit"
                sx={{
                  border: "none",
                  bgcolor: "transparent",
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: colors.ink,
                  px: 1,
                  "&:hover": { color: colors.wine },
                }}
              >
                Subscribe →
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: colors.line }} />

        {/* Link columns */}
        <Grid
          container
          spacing={{ xs: 3, md: 6 }}
          sx={{ pt: { xs: 5, sm: 7 } }}
        >
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography sx={columnLabelSx}>Shop</Typography>
            <Stack spacing={0.25}>
              <Link component={RouterLink} to="/products" sx={linkSx}>
                New Arrivals
              </Link>
              <Link component={RouterLink} to="/categories" sx={linkSx}>
                All Categories
              </Link>
              <Link component={RouterLink} to="/products" sx={linkSx}>
                Bestsellers
              </Link>
              <Link component={RouterLink} to="/wishlist" sx={linkSx}>
                Wishlist
              </Link>
            </Stack>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography sx={columnLabelSx}>Account</Typography>
            <Stack spacing={0.25}>
              <Link component={RouterLink} to="/login" sx={linkSx}>
                Sign in
              </Link>
              <Link component={RouterLink} to="/signup" sx={linkSx}>
                Create account
              </Link>
              <Link component={RouterLink} to="/orders" sx={linkSx}>
                Orders
              </Link>
              <Link component={RouterLink} to="/profile" sx={linkSx}>
                Profile
              </Link>
            </Stack>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography sx={columnLabelSx}>Help</Typography>
            <Stack spacing={0.25}>
              <Link component={RouterLink} to="/forgetpassword" sx={linkSx}>
                Reset password
              </Link>
              <Link sx={linkSx}>Shipping &amp; returns</Link>
              <Link sx={linkSx}>Size guide</Link>
              <Link sx={linkSx}>Contact</Link>
            </Stack>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography sx={columnLabelSx}>Follow</Typography>
            <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
              <Link
                href="#"
                aria-label="Instagram"
                sx={{
                  color: colors.ink,
                  transition: "color 200ms",
                  "&:hover": { color: colors.wine },
                }}
              >
                <FiInstagram size={18} />
              </Link>
              <Link
                href="#"
                aria-label="Twitter"
                sx={{
                  color: colors.ink,
                  transition: "color 200ms",
                  "&:hover": { color: colors.wine },
                }}
              >
                <FiTwitter size={18} />
              </Link>
            </Stack>
            <Typography
              sx={{ mt: 3, color: colors.muted, fontSize: 13, lineHeight: 1.7 }}
            >
              Shree Gallery
              <br />
              India · Worldwide shipping
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mt: { xs: 5, sm: 7 }, borderColor: colors.line }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ pt: 3 }}
        >
          <Typography
            sx={{
              color: colors.muted,
              fontSize: 12,
              letterSpacing: "0.04em",
            }}
          >
            © {year} Shree Gallery. All rights reserved.
          </Typography>
          <Stack
            direction="row"
            spacing={3}
            sx={{
              "& a": {
                color: colors.muted,
                fontSize: 12,
                textDecoration: "none",
                letterSpacing: "0.04em",
                "&:hover": { color: colors.ink },
              },
            }}
          >
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Cookies</Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default CustomerFooter;

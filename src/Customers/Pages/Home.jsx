import React from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import HomepageBannerSlider from "../components/HomepageBannerSlider";
import ShopCategoriesSection from "../components/ShopCategoriesSection";
import RecentlyViewedSection from "../components/RecentlyViewedSection";
import { colors, fonts } from "../../theme/theme";

const pillars = [
  {
    label: "Considered Craft",
    body:
      "Jewellery, imitation pieces, and clothing chosen with care — quality you can trust, every time.",
  },
  {
    label: "Free Shipping",
    body: "Complimentary on orders over ₹2,499 across India. Worldwide rates at checkout.",
  },
  {
    label: "Easy Returns",
    body: "Seven days to change your mind. No questions, no fuss.",
  },
];

const Home = () => {
  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink }}>
      {/* Hero — full-bleed editorial banner */}
      <HomepageBannerSlider placement="hero" />

      {/* Editorial intro */}
      <Container maxWidth={false} sx={{ maxWidth: 960, px: { xs: 3, sm: 4 } }}>
        <Stack
          spacing={2.5}
          sx={{ alignItems: "center", textAlign: "center", py: { xs: 7, sm: 11 } }}
        >
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: colors.muted,
              fontWeight: 500,
            }}
          >
            Spring · 2026
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 30, sm: 44, md: 52 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              maxWidth: 720,
            }}
          >
            Pieces you'll return to —
            <Box
              component="span"
              sx={{ fontStyle: "italic", color: colors.wine }}
            >
              {" "}
              occasion after occasion.
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: { xs: 14, sm: 15 },
              color: colors.muted,
              maxWidth: 560,
              lineHeight: 1.75,
            }}
          >
            Fine and imitation jewellery, clothing, and more — curated for
            every occasion. Discover the latest arrivals.
          </Typography>
          <Box
            component={RouterLink}
            to="/products"
            sx={{
              mt: 2,
              display: "inline-block",
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: colors.ink,
              borderBottom: `1px solid ${colors.ink}`,
              pb: 0.75,
              transition: "color 200ms cubic-bezier(0.2,0.7,0.2,1), border-color 200ms",
              "&:hover": {
                color: colors.wine,
                borderBottomColor: colors.wine,
              },
            }}
          >
            Shop the new collection →
          </Box>
        </Stack>
      </Container>

      {/* Promo strip */}
      <Box>
        <HomepageBannerSlider placement="promo_strip" />
      </Box>

      {/* Shop by category */}
      <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 3, sm: 4 } }}>
        <ShopCategoriesSection />
      </Container>

      {/* Craft promise strip */}
      <Box
        sx={{
          bgcolor: colors.paper,
          borderTop: `1px solid ${colors.line}`,
          borderBottom: `1px solid ${colors.line}`,
          py: { xs: 6, sm: 9 },
        }}
      >
        <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: { xs: 4, sm: 6 },
            }}
          >
            {pillars.map((p) => (
              <Box key={p.label} sx={{ textAlign: { xs: "left", sm: "center" } }}>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: colors.ink,
                    mb: 1.5,
                  }}
                >
                  {p.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 13.5,
                    color: colors.muted,
                    lineHeight: 1.75,
                    maxWidth: 280,
                    mx: { sm: "auto" },
                  }}
                >
                  {p.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Recently viewed */}
      <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 3, sm: 4 }, pt: { xs: 6, sm: 9 }, pb: { xs: 8, sm: 12 } }}>
        <RecentlyViewedSection showClear />
      </Container>
    </Box>
  );
};

export default Home;

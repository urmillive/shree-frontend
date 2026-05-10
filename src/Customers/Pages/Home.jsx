import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import HomepageBannerSlider from "../components/HomepageBannerSlider";
import ShopCategoriesSection from "../components/ShopCategoriesSection";
import RecentlyViewedSection from "../components/RecentlyViewedSection";
import { colors } from "../../theme/theme";

const Home = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.background,
        color: colors.text,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.4, mb: 0.5 }}>
          Home
        </Typography>
        <Typography variant="body2" sx={{ color: alpha(colors.text, 0.55), mb: { xs: 2, sm: 3 } }}>
          Welcome — explore collections below.
        </Typography>

        <HomepageBannerSlider placement="hero" />
        <HomepageBannerSlider placement="promo_strip" />
        <ShopCategoriesSection />
        <RecentlyViewedSection showClear />
      </Container>
    </Box>
  );
};

export default Home;

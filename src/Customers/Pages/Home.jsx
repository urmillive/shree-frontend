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
        <HomepageBannerSlider placement="hero" />
        <HomepageBannerSlider placement="promo_strip" />
        <ShopCategoriesSection />
        
        <RecentlyViewedSection showClear />
      </Container>
    </Box>
  );
};

export default Home;

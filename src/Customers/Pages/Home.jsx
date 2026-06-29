import React, { useEffect, useState } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import HomepageBannerSlider from "../components/HomepageBannerSlider";
import ShopCategoriesSection from "../components/ShopCategoriesSection";
import GoogleReviewsSection from "../components/GoogleReviewsSection";
import RecentlyViewedSection from "../components/RecentlyViewedSection";
import HomepageSectionsGrid from "../components/HomepageSectionsGrid";
import ShreeGallerySection from "../components/ShreeGallerySection";
import { colors, fonts } from "../../theme/theme";
import client from "../../Setup/Axios";

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
  const [productSections, setProductSections] = useState([null, null]);

  useEffect(() => {
    let cancelled = false;
    client
      .get("/homepage/", { skipErrorToast: true })
      .then((res) => {
        if (cancelled) return;
        const raw = res?.data?.data?.sections || res?.data?.sections || [];
        const active = raw.filter(
          (s) => s?.type === "product_list" && s?.isActive !== false
        );
        setProductSections([active[0] || null, active[1] || null]);
      })
      .catch(() => {
        if (!cancelled) setProductSections([null, null]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, overflowX: "hidden" }}>
      {/* Hero — full-bleed editorial banner */}
      <HomepageBannerSlider placement="hero" />

      {/* Shop by category */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 4 } }}>
        <ShopCategoriesSection />
      </Box>


      {/* Product video */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 4 }, py: { xs: 4, sm: 6 } }}>
        <video
          src="/product video.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{ width: "100%", borderRadius: 12, display: "block" }}
        />
      </Box>

      {/* Google reviews */}
      <GoogleReviewsSection />

      {/* sections[0] — first product_list */}
      <HomepageSectionsGrid section={productSections[0]} />

      {/* Promo / video strip — appears between categories and reviews */}
      <HomepageBannerSlider placement="promo_strip" />
     
      {/* Recently viewed — full-bleed background, self-contained */}
      <RecentlyViewedSection showClear />

      {/* sections[1] — second product_list as Shree Gallery */}
      <ShreeGallerySection section={productSections[1]} />

      {/* Craft promise strip */}
      <Box sx={{ bgcolor: colors.wine, py: { xs: 5, sm: 8 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 3, sm: 6 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            }}
          >
            {pillars.map((p, i) => (
              <Box
                key={p.label}
                sx={{
                  textAlign: { xs: "center", sm: "center" },
                  px: { xs: 2, sm: 5 },
                  py: { xs: 3.5, sm: 5 },
                  borderLeft: {
                    xs: "none",
                    sm: i === 0 ? "none" : `1px solid rgba(255,255,255,0.15)`,
                  },
                  borderTop: {
                    xs: i === 0 ? "none" : `1px solid rgba(255,255,255,0.15)`,
                    sm: "none",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: { xs: 10, sm: 11 },
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    mb: 1.5,
                  }}
                >
                  {p.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: { xs: 12.5, sm: 13.5 },
                    color: "rgba(255,255,255,0.68)",
                    lineHeight: 1.75,
                    maxWidth: 280,
                    mx: "auto",
                  }}
                >
                  {p.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

    </Box>
  );
};

export default Home;

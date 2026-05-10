import React, { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, IconButton, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { colors } from "../../theme/theme";
import {
  fetchHomepageBannersByPlacement,
  getBannerDesktopImageUrl,
  getBannerMobileImageUrl,
  getBannerTargetUrl,
  normalizeHomepageBannersPayload,
} from "../services/publicBannersService";

const AUTO_SLIDE_MS = 5000;

const HomepageBannerSlider = ({ placement = "hero" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchHomepageBannersByPlacement(placement)
      .then((res) => {
        if (cancelled) return;
        const list = normalizeHomepageBannersPayload(res?.data).filter((banner) => banner?.isActive !== false);
        list.sort((a, b) => (Number(a?.displayOrder) || 0) - (Number(b?.displayOrder) || 0));
        setBanners(list);
        setCurrentIndex(0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || "Could not load banners.");
        setBanners([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [placement]);

  const total = banners.length;

  const activeBanner = useMemo(() => {
    if (!total) return null;
    return banners[currentIndex] || null;
  }, [banners, currentIndex, total]);

  const goNext = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const goPrev = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  useEffect(() => {
    if (total <= 1) return undefined;
    const timer = window.setInterval(goNext, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [total]);

  if (loading) {
    return (
      <Box
        component="section"
        sx={{
          borderRadius: 2,
          minHeight: { xs: 180, sm: 260 },
          display: "grid",
          placeItems: "center",
          bgcolor: alpha(colors.primary, 0.06),
          mb: { xs: 2, sm: 3 },
        }}
      >
        <CircularProgress size={34} sx={{ color: colors.primary }} aria-label="Loading banners" />
      </Box>
    );
  }

  if (error || !activeBanner) {
    return (
      <Box
        component="section"
        sx={{
          borderRadius: 2,
          minHeight: { xs: 150, sm: 180 },
          display: "grid",
          placeItems: "center",
          bgcolor: alpha(colors.primary, 0.04),
          mb: { xs: 2, sm: 3 },
          px: 2,
        }}
      >
        <Typography variant="body2" sx={{ color: alpha(colors.text, 0.6), textAlign: "center" }}>
          {error || "Banners will appear here soon."}
        </Typography>
      </Box>
    );
  }

  const preferred = isMobile ? getBannerMobileImageUrl(activeBanner) : getBannerDesktopImageUrl(activeBanner);
  const fallback = isMobile ? getBannerDesktopImageUrl(activeBanner) : getBannerMobileImageUrl(activeBanner);
  const imageUrl = preferred || fallback;
  const targetUrl = getBannerTargetUrl(activeBanner);
  const title = activeBanner?.title ? String(activeBanner.title) : "Homepage banner";
  const subtitle = activeBanner?.subtitle ? String(activeBanner.subtitle) : "";

  const image = (
    <Box
      component="img"
      src={imageUrl}
      alt={title}
      sx={{
        width: "100%",
        height: { xs: 190, sm: 300, md: 340 },
        objectFit: "cover",
        display: "block",
      }}
    />
  );

  return (
    <Box component="section" sx={{ mb: { xs: 2, sm: 3 } }}>
      <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden", bgcolor: colors.mutedSurface }}>
        {targetUrl ? (
          <Box component="a" href={targetUrl} sx={{ display: "block", textDecoration: "none" }}>
            {image}
          </Box>
        ) : (
          image
        )}

        {total > 1 ? (
          <>
            <IconButton
              onClick={goPrev}
              aria-label="Previous banner"
              sx={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                bgcolor: alpha("#000", 0.4),
                color: "#fff",
                "&:hover": { bgcolor: alpha("#000", 0.58) },
              }}
            >
              <FiChevronLeft size={22} />
            </IconButton>
            <IconButton
              onClick={goNext}
              aria-label="Next banner"
              sx={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                bgcolor: alpha("#000", 0.4),
                color: "#fff",
                "&:hover": { bgcolor: alpha("#000", 0.58) },
              }}
            >
              <FiChevronRight size={22} />
            </IconButton>
          </>
        ) : null}
      </Box>

      {(title || subtitle || total > 1) && (
        <Box sx={{ mt: 1.25, px: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            {title ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" sx={{ color: alpha(colors.text, 0.62), lineHeight: 1.35 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {total > 1 ? (
            <Typography variant="caption" sx={{ color: alpha(colors.text, 0.62), whiteSpace: "nowrap" }}>
              {currentIndex + 1}/{total}
            </Typography>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

export default HomepageBannerSlider;

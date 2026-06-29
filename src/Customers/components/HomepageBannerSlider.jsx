import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, IconButton, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { colors } from "../../theme/theme";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  fetchHomepageBannersByPlacement,
  getBannerDesktopImageUrl,
  getBannerMobileImageUrl,
  getBannerTargetUrl,
  normalizeHomepageBannersPayload,
} from "../services/publicBannersService";

const AUTO_SLIDE_MS = 6500;

const HomepageBannerSlider = ({ placement = "hero" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchHomepageBannersByPlacement(placement);
        if (cancelled) return;
        const list = normalizeHomepageBannersPayload(res?.data).filter(
          (banner) => banner?.isActive !== false
        );
        list.sort(
          (a, b) => (Number(a?.displayOrder) || 0) - (Number(b?.displayOrder) || 0)
        );
        setBanners(list);
        setCurrentIndex(0);
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Could not load banners."));
        setBanners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [placement]);

  const total = banners.length;

  const activeBanner = useMemo(() => {
    if (!total) return null;
    return banners[currentIndex] || null;
  }, [banners, currentIndex, total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return undefined;
    const timer = window.setInterval(goNext, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [total, goNext]);

  if (loading) {
    return (
      <Box
        component="section"
        sx={{
          minHeight: { xs: 200, sm: 300 },
          display: "grid",
          placeItems: "center",
          bgcolor: colors.stone,
        }}
      >
        <CircularProgress size={28} sx={{ color: colors.ink }} />
      </Box>
    );
  }

  if (error || !activeBanner) return null;

  const desktopUrl = getBannerDesktopImageUrl(activeBanner);
  const mobileUrl = getBannerMobileImageUrl(activeBanner);
  const imageUrl = isMobile
    ? mobileUrl || desktopUrl
    : desktopUrl || mobileUrl;

  const targetUrl = getBannerTargetUrl(activeBanner);
  const altText = activeBanner?.title ? String(activeBanner.title) : "Banner";

  if (!imageUrl) return null;

  return (
    <Box
      component="section"
      sx={{ position: "relative", width: "100%", lineHeight: 0 }}
    >
      <Box
        component={targetUrl ? "a" : "div"}
        href={targetUrl || undefined}
        sx={{
          display: "block",
          textDecoration: "none",
          width: "100%",
          position: "relative",
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={altText}
          sx={{
            width: "100%",
            height: "auto",
            display: "block",
            maxWidth: "100%",
          }}
        />
      </Box>

      {total > 1 ? (
        <>
          <IconButton
            onClick={goPrev}
            aria-label="Previous banner"
            sx={{
              position: "absolute",
              left: { xs: 8, sm: 24 },
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(4px)",
              color: colors.ivory,
              border: `1px solid rgba(255,255,255,0.4)`,
              width: { xs: 36, sm: 44 },
              height: { xs: 36, sm: 44 },
              borderRadius: 0,
              "&:hover": {
                bgcolor: colors.ivory,
                color: colors.ink,
              },
            }}
          >
            <FiChevronLeft size={18} />
          </IconButton>
          <IconButton
            onClick={goNext}
            aria-label="Next banner"
            sx={{
              position: "absolute",
              right: { xs: 8, sm: 24 },
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(4px)",
              color: colors.ivory,
              border: `1px solid rgba(255,255,255,0.4)`,
              width: { xs: 36, sm: 44 },
              height: { xs: 36, sm: 44 },
              borderRadius: 0,
              "&:hover": {
                bgcolor: colors.ivory,
                color: colors.ink,
              },
            }}
          >
            <FiChevronRight size={18} />
          </IconButton>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: "absolute",
              bottom: { xs: 10, sm: 16 },
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {banners.map((_, i) => (
              <Box
                key={i}
                onClick={() => setCurrentIndex(i)}
                sx={{
                  width: i === currentIndex ? 24 : 12,
                  height: 2,
                  bgcolor: colors.ivory,
                  opacity: i === currentIndex ? 1 : 0.5,
                  cursor: "pointer",
                  transition: "width 240ms cubic-bezier(0.2,0.7,0.2,1)",
                }}
              />
            ))}
          </Stack>
        </>
      ) : null}
    </Box>
  );
};

export default HomepageBannerSlider;

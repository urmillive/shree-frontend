import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, IconButton, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { colors, fonts } from "../../theme/theme";
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
        setError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "Could not load banners."
        );
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

  const heroHeight = { xs: 480, sm: 600, md: 680 };

  if (loading) {
    return (
      <Box
        component="section"
        sx={{
          minHeight: heroHeight,
          display: "grid",
          placeItems: "center",
          bgcolor: colors.stone,
        }}
      >
        <CircularProgress size={28} sx={{ color: colors.ink }} />
      </Box>
    );
  }

  if (error || !activeBanner) {
    return (
      <Box
        component="section"
        sx={{
          minHeight: { xs: 380, sm: 480 },
          display: "grid",
          placeItems: "center",
          bgcolor: colors.stone,
          px: 3,
          textAlign: "center",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: colors.muted,
              mb: 1.5,
            }}
          >
            Shree Gallery
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 36, sm: 56 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
              mb: 2,
            }}
          >
            Considered fashion,
            <br />
            crafted slow.
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 13.5 }}>
            {error || "Editorial banners will appear here soon."}
          </Typography>
        </Box>
      </Box>
    );
  }

  const preferred = isMobile
    ? getBannerMobileImageUrl(activeBanner)
    : getBannerDesktopImageUrl(activeBanner);
  const fallback = isMobile
    ? getBannerDesktopImageUrl(activeBanner)
    : getBannerMobileImageUrl(activeBanner);
  const imageUrl = preferred || fallback;
  const targetUrl = getBannerTargetUrl(activeBanner);
  const title = activeBanner?.title ? String(activeBanner.title) : "";
  const subtitle = activeBanner?.subtitle ? String(activeBanner.subtitle) : "";

  return (
    <Box component="section" sx={{ position: "relative" }}>
      <Box sx={{ position: "relative", overflow: "hidden", bgcolor: colors.stone }}>
        <Box
          component={targetUrl ? "a" : "div"}
          href={targetUrl || undefined}
          sx={{
            display: "block",
            textDecoration: "none",
            color: "inherit",
            position: "relative",
          }}
        >
          <Box
            component="img"
            src={imageUrl}
            alt={title || "Editorial banner"}
            sx={{
              width: "100%",
              height: heroHeight,
              objectFit: "cover",
              display: "block",
            }}
          />

          {/* Editorial overlay */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 100%)",
              pointerEvents: "none",
            }}
          />

          {(title || subtitle) && (
            <Box
              sx={{
                position: "absolute",
                left: { xs: 24, sm: 48, md: 80 },
                right: { xs: 24, sm: 48 },
                bottom: { xs: 40, sm: 64, md: 88 },
                color: colors.ivory,
                maxWidth: 640,
              }}
            >
              {subtitle ? (
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: colors.ivory,
                    opacity: 0.92,
                    mb: 2,
                  }}
                >
                  {subtitle}
                </Typography>
              ) : null}
              {title ? (
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: { xs: 34, sm: 56, md: 72 },
                    fontWeight: 500,
                    color: colors.ivory,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.05,
                  }}
                >
                  {title}
                </Typography>
              ) : null}
              {targetUrl ? (
                <Typography
                  sx={{
                    mt: 3,
                    fontFamily: fonts.body,
                    fontSize: 11,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: colors.ivory,
                    display: "inline-block",
                    borderBottom: `1px solid ${colors.ivory}`,
                    pb: 0.5,
                  }}
                >
                  Discover →
                </Typography>
              ) : null}
            </Box>
          )}
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
                bgcolor: "transparent",
                color: colors.ivory,
                border: `1px solid ${colors.ivory}`,
                width: 40,
                height: 40,
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
                bgcolor: "transparent",
                color: colors.ivory,
                border: `1px solid ${colors.ivory}`,
                width: 40,
                height: 40,
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
                bottom: 16,
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
    </Box>
  );
};

export default HomepageBannerSlider;

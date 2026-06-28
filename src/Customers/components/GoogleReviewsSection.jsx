import React, { useRef, useState } from "react";
import { Box, Container, IconButton, Typography } from "@mui/material";
import { colors, fonts, shadows } from "../../theme/theme";

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─────────────────────────────────────────────
   Static review data (Google reviews snapshot)
───────────────────────────────────────────── */
const REVIEWS = [
  {
    id: 1,
    name: "Priyanshi Jain",
    initial: "P",
    avatarBg: "#D4845A",
    timeAgo: "4 months ago",
    rating: 5,
    text: "Pomcha Jaipur truly captures the soul of tradition while giving it the most graceful modern touch 🌸 From the moment I explored the Gulab Galliyan collection, I was mesmerized by how beautifully the bandhani work is woven into every piece. The vibrant colors, luxurious fabric, and perfect fit make it a must-have for every traditional wardrobe.",
  },
  {
    id: 2,
    name: "Shiksha Yadav",
    initial: "S",
    avatarBg: "#5A8FD4",
    timeAgo: "4 months ago",
    rating: 5,
    text: "These piece are exisquite and I love the fit 🌸🌸🌸 must try! Believe me you're gonna love it",
  },
  {
    id: 3,
    name: "MAYURI KALE",
    initial: "M",
    avatarBg: "#8B5AD4",
    timeAgo: "4 months ago",
    rating: 5,
    text: "Too good brand. Just amazing, elegant and lovely.",
  },
  {
    id: 4,
    name: "Kiyaan Videos",
    initial: "K",
    avatarBg: "#D4A85A",
    timeAgo: "2 years ago",
    rating: 5,
    text: "Pomcha Jaipur suits are pure royalty. From daily cotton comfort to festive silk elegance—every piece reflects Jaipur's soul. Rich colors, fine detailing, perfect fits, and premium fabric quality. Traditional vibes with modern grace—an absolute must-try for those who appreciate authentic Indian fashion.",
  },
  {
    id: 5,
    name: "Aarti Sharma",
    initial: "A",
    avatarBg: "#5ABD8C",
    timeAgo: "3 months ago",
    rating: 5,
    text: "Absolutely love the collection! The quality is outstanding and the designs are so unique. Every piece I've ordered has been exactly as described. Will definitely be ordering again soon.",
  },
  {
    id: 6,
    name: "Deepika Mehta",
    initial: "D",
    avatarBg: "#C45A7E",
    timeAgo: "5 months ago",
    rating: 5,
    text: "Shree Gallery has the most beautiful ethnic wear. The packaging was lovely and delivery was prompt. The fabric quality is top-notch and the colors are just as vibrant as shown online.",
  },
];

const SCROLL_AMOUNT = 320;
const COLLAPSE_LENGTH = 120;

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

const GoogleG = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.1 22.56 15.28 22.56 12.25z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const VerifiedBadge = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="12" fill="#1A73E8" />
    <path
      d="M9.5 16.5l-4-4 1.41-1.41L9.5 13.67l7.59-7.59L18.5 7.5z"
      fill="#ffffff"
    />
  </svg>
);

function StarRow({ rating }) {
  return (
    <Box sx={{ display: "flex", gap: "1px", alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            fontSize: 15,
            lineHeight: 1,
            color: i < rating ? "#F5A623" : "#D1C4A8",
          }}
        >
          ★
        </Box>
      ))}
    </Box>
  );
}

function OverallStars({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <Box sx={{ display: "flex", gap: "1px", alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const isHalf = !filled && half && i === full;
        return (
          <Box
            key={i}
            component="span"
            sx={{
              fontSize: 17,
              lineHeight: 1,
              color: filled || isHalf ? "#F5A623" : "#D1C4A8",
            }}
          >
            {isHalf ? "½" : "★"}
          </Box>
        );
      })}
    </Box>
  );
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > COLLAPSE_LENGTH;
  const displayText =
    isLong && !expanded
      ? review.text.slice(0, COLLAPSE_LENGTH).trimEnd() + "..."
      : review.text;

  return (
    <Box
      sx={{
        width: 280,
        minWidth: 280,
        flexShrink: 0,
        bgcolor: colors.paper,
        borderRadius: "10px",
        border: `1px solid ${colors.line}`,
        boxShadow: shadows.soft,
        p: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        scrollSnapAlign: "start",
        transition: "box-shadow 200ms",
        "&:hover": { boxShadow: shadows.lift },
      }}
    >
      {/* Top row: avatar + name/time + Google G */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
        {/* Avatar */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: review.avatarBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 16,
              color: "#fff",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            {review.initial}
          </Typography>
        </Box>

        {/* Name + time */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 13.5,
              color: colors.ink,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {review.name}
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 11.5,
              color: colors.muted,
              mt: 0.25,
            }}
          >
            {review.timeAgo}
          </Typography>
        </Box>

        {/* Google G */}
        <Box sx={{ pt: 0.25 }}>
          <GoogleG />
        </Box>
      </Box>

      {/* Stars + verified badge */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <StarRow rating={review.rating} />
        <VerifiedBadge />
      </Box>

      {/* Review text */}
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.ink2,
          lineHeight: 1.65,
          flex: 1,
        }}
      >
        {displayText}
      </Typography>

      {/* Show more / less */}
      {isLong && (
        <Box
          component="button"
          onClick={() => setExpanded((v) => !v)}
          sx={{
            all: "unset",
            cursor: "pointer",
            fontFamily: fonts.body,
            fontSize: 12,
            fontWeight: 500,
            color: colors.muted,
            textDecoration: "underline",
            mt: 0.5,
            alignSelf: "flex-start",
            "&:hover": { color: colors.ink },
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </Box>
      )}
    </Box>
  );
}

/* ─────────────────────────────────────────────
   Main exported component
───────────────────────────────────────────── */
export default function GoogleReviewsSection() {
  const scrollerRef = useRef(null);

  const scroll = (dir) => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollBy({
        left: dir === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
        behavior: "smooth",
      });
    }
  };

  return (
    <Box
      component="section"
      sx={{
        bgcolor: colors.ivory,
        borderTop: `1px solid ${colors.line}`,
        py: { xs: 6, sm: 9 },
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 3, sm: 4 } }}>
        {/* Section header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            gap: 2,
            mb: { xs: 3.5, sm: 5 },
          }}
        >
          {/* Brand + rating */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2.5 }, flexWrap: "wrap" }}>
            {/* Logo circle */}
            <Box
              component="img"
              src="/shreelogo.png"
              alt="Shree Gallery"
              sx={{
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                borderRadius: "50%",
                objectFit: "cover",
                border: `1px solid ${colors.line}`,
                flexShrink: 0,
              }}
            />

            {/* Name + stars + count */}
            <Box>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: { xs: 14, sm: 16 },
                  color: colors.ink,
                  letterSpacing: "0.01em",
                  lineHeight: 1.3,
                }}
              >
                Shree Gallery
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: 0.5,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontWeight: 700,
                    fontSize: 14,
                    color: colors.ink,
                    lineHeight: 1,
                  }}
                >
                  4.5
                </Typography>
                <OverallStars rating={4.5} />
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: colors.muted,
                    lineHeight: 1,
                  }}
                >
                  340 reviews on
                </Typography>
                <GoogleG />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Cards scroller with side nav buttons */}
        <Box sx={{ position: "relative" }}>
          {/* Left arrow */}
          <IconButton
            onClick={() => scroll("left")}
            size="small"
            sx={{
              position: "absolute",
              left: { xs: -16, sm: -20 },
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              border: `1px solid ${colors.line}`,
              bgcolor: colors.paper,
              color: colors.ink,
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              boxShadow: shadows.soft,
              "&:hover": { bgcolor: colors.stone, boxShadow: shadows.lift },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          {/* Right arrow */}
          <IconButton
            onClick={() => scroll("right")}
            size="small"
            sx={{
              position: "absolute",
              right: { xs: -16, sm: -20 },
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              border: `1px solid ${colors.line}`,
              bgcolor: colors.paper,
              color: colors.ink,
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              boxShadow: shadows.soft,
              "&:hover": { bgcolor: colors.stone, boxShadow: shadows.lift },
            }}
          >
            <ChevronRightIcon />
          </IconButton>

          {/* Cards scroller */}
          <Box
            ref={scrollerRef}
            sx={{
              display: "flex",
              gap: { xs: 2, sm: 2.5 },
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-x",
              scrollSnapType: "x proximity",
              scrollBehavior: "smooth",
              pb: 1,
              px: { xs: "4px", sm: "4px" },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {REVIEWS.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

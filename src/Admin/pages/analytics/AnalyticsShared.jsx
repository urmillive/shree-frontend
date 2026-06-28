import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";

const accent = "#ab8a48";

export const AnalyticsCards = ({ cards }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
      gap: 1.5,
    }}
  >
    {cards.map((card) => (
      <Paper
        key={card.title}
        component={card.to ? RouterLink : "div"}
        to={card.to}
        sx={{
          p: 2,
          textDecoration: "none",
          color: "inherit",
          border: `1px solid ${alpha("#0f3828", 0.12)}`,
          borderRadius: 2,
          transition: "all .14s ease",
          "&:hover": card.to
            ? {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 20px rgba(20,55,42,0.1)",
                borderColor: alpha(accent, 0.5),
              }
            : undefined,
        }}
      >
        <Typography sx={{ fontWeight: 700, color: "#21342b" }}>{card.title}</Typography>
        <Typography variant="body2" sx={{ color: "#5f6d66", mt: 0.5 }}>
          {card.description}
        </Typography>
      </Paper>
    ))}
  </Box>
);

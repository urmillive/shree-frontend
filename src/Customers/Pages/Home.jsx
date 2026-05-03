import React from "react";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { colors } from "../../theme/theme";

const Home = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.background,
        color: colors.text,
        p: 3,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Home
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, "& a": { color: colors.text } }}>
        <Link to="/profile">Profile</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Signup</Link>
      </Box>
    </Box>
  );
};

export default Home;

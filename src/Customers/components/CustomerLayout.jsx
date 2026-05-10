import React from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { colors } from "../../theme/theme";
import CustomerFooter from "./CustomerFooter";
import CustomerNavbar from "./CustomerNavbar";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { RecentlyViewedProvider } from "../context/RecentlyViewedContext";

const CustomerLayout = () => {
  return (
    <WishlistProvider>
      <RecentlyViewedProvider>
        <CartProvider>
          <Box
            sx={{
              minHeight: "100dvh",
              display: "flex",
              flexDirection: "column",
              bgcolor: colors.background,
              color: colors.text,
            }}
          >
            <CustomerNavbar />
            <Box
              component="main"
              sx={{
                flex: "1 1 auto",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                width: "100%",
              }}
            >
              <Outlet />
            </Box>
            <CustomerFooter />
          </Box>
        </CartProvider>
      </RecentlyViewedProvider>
    </WishlistProvider>
  );
};

export default CustomerLayout;

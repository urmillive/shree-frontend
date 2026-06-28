import React from "react";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { Outlet } from "react-router-dom";
import { colors } from "../../theme/theme";
import { createCustomerMuiTheme } from "../../theme/muiTheme";
import CustomerFooter from "./CustomerFooter";
import CustomerNavbar from "./CustomerNavbar";
import VerificationWarningDialog from "./VerificationWarningDialog";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { RecentlyViewedProvider } from "../context/RecentlyViewedContext";

const customerTheme = createCustomerMuiTheme();

const CustomerLayout = () => {
  return (
    <ThemeProvider theme={customerTheme}>
      <CssBaseline />
      <WishlistProvider>
        <RecentlyViewedProvider>
          <CartProvider>
            <Box
              sx={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                bgcolor: colors.ivory,
                color: colors.ink,
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
    </ThemeProvider>
  );
};

export default CustomerLayout;

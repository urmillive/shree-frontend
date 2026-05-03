import { createTheme } from "@mui/material/styles";
import { colors } from "./theme";

export function createAppMuiTheme() {
  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: colors.primary,
        contrastText: colors.buttonText,
      },
      background: {
        default: colors.background,
        paper: colors.background,
      },
      text: {
        primary: colors.text,
        secondary: colors.text,
      },
    },
    typography: {
      allVariants: {
        color: colors.text,
      },
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
          },
          contained: {
            "&.Mui-disabled": {
              backgroundColor: colors.disabledOverlay,
              color: colors.buttonText,
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: colors.text,
          },
        },
      },
    },
  });
}

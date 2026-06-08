import { createTheme } from "@mui/material/styles";
import { colors, fonts, radii } from "./theme";

/**
 * Root MUI theme — used by main.jsx for the entire app.
 *
 * Kept intentionally neutral so admin pages (which use MUI components
 * directly but do NOT import theme/theme.js) continue to look the same.
 * Customer pages get the full editorial-luxury styling layered on top
 * via createCustomerMuiTheme() inside CustomerLayout.
 */
export function createAppMuiTheme() {
  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: colors.ink,
        contrastText: colors.buttonText,
      },
      background: {
        default: colors.paper,
        paper: colors.paper,
      },
      text: {
        primary: colors.ink,
        secondary: colors.muted,
      },
    },
    typography: {
      fontFamily: fonts.body,
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: "none" },
        },
      },
    },
  });
}

/**
 * Customer-only MUI theme — applied by CustomerLayout via a nested
 * ThemeProvider so customer pages use the editorial-luxury palette and
 * serif display type without affecting admin pages.
 */
export function createCustomerMuiTheme() {
  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: colors.ink,
        contrastText: colors.ivory,
      },
      secondary: {
        main: colors.wine,
        contrastText: colors.ivory,
      },
      background: {
        default: colors.ivory,
        paper: colors.paper,
      },
      text: {
        primary: colors.ink,
        secondary: colors.muted,
      },
      divider: colors.line,
      error: { main: colors.danger },
      success: { main: colors.success },
    },
    shape: { borderRadius: radii.soft },
    typography: {
      fontFamily: fonts.body,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: { fontFamily: fonts.display, fontWeight: 500, letterSpacing: "-0.01em" },
      h2: { fontFamily: fonts.display, fontWeight: 500, letterSpacing: "-0.01em" },
      h3: { fontFamily: fonts.display, fontWeight: 500, letterSpacing: "-0.005em" },
      h4: { fontFamily: fonts.display, fontWeight: 500 },
      h5: { fontFamily: fonts.display, fontWeight: 500 },
      h6: {
        fontFamily: fonts.body,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontSize: 12,
      },
      button: {
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontSize: 12,
      },
      overline: { letterSpacing: "0.18em", fontWeight: 500, fontSize: 11 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: colors.ivory, color: colors.ink },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radii.soft,
            paddingInline: 22,
            paddingBlock: 12,
            transition:
              "background-color 200ms cubic-bezier(0.2,0.7,0.2,1), color 200ms",
          },
          contained: {
            backgroundColor: colors.ink,
            color: colors.ivory,
            "&:hover": { backgroundColor: colors.wine },
            "&.Mui-disabled": {
              backgroundColor: colors.disabledOverlay,
              color: colors.ivory,
            },
          },
          outlined: {
            borderColor: colors.ink,
            color: colors.ink,
            "&:hover": {
              borderColor: colors.wine,
              color: colors.wine,
              backgroundColor: "transparent",
            },
          },
          text: {
            color: colors.ink,
            "&:hover": { color: colors.wine, backgroundColor: "transparent" },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radii.soft,
            backgroundColor: colors.paper,
            "& fieldset": { borderColor: colors.line },
            "&:hover fieldset": { borderColor: colors.ink },
            "&.Mui-focused fieldset": { borderColor: colors.ink, borderWidth: 1 },
          },
          input: { paddingBlock: 14, paddingInline: 14 },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: colors.muted,
            "&.Mui-focused": { color: colors.ink },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: radii.pill,
            fontFamily: fonts.body,
            fontWeight: 500,
            letterSpacing: "0.04em",
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: colors.line } },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: colors.ink,
            textDecorationColor: colors.line,
            "&:hover": { color: colors.wine, textDecorationColor: colors.wine },
          },
        },
      },
    },
  });
}

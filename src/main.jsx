import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import "./index.css";
import App from "./App.jsx";
import { colors } from "./theme/theme";
import { createAppMuiTheme } from "./theme/muiTheme";

const rootEl = document.getElementById("root");
document.documentElement.style.setProperty("--app-bg", colors.background);
document.documentElement.style.setProperty("--app-text", colors.text);

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={createAppMuiTheme()}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import {
  registerErrorToastHandler,
  registerSuccessToastHandler,
} from "../utils/errorToastBridge";

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4200;

const TOAST_SEVERITY_BG = {
  error: "#e53935",
  warning: "#ff9800",
  success: "#ad8d4d",
};

const toastCloseButtonSx = {
  color: "#fff",
  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.12)" },
};

function getToastAlertSx(severity) {
  const bg = TOAST_SEVERITY_BG[severity];
  if (!bg) {
    return { width: "100%" };
  }

  return {
    width: "100%",
    bgcolor: bg,
    color: "#fff",
    "& .MuiAlert-icon": { color: "#fff" },
    "& .MuiAlert-message": { color: "#fff" },
    "& .MuiAlert-action .MuiIconButton-root": toastCloseButtonSx,
    [`&.MuiAlert-filled${severity.charAt(0).toUpperCase()}${severity.slice(1)}`]: {
      bgcolor: bg,
      color: "#fff",
    },
  };
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    open: false,
    severity: "error",
    message: "",
  });

  const showToast = useCallback((message, severity = "error") => {
    const text = message != null ? String(message).trim() : "";
    if (!text) {
      return;
    }
    setToast({ open: true, severity, message: text });
  }, []);

  const showError = useCallback((message) => showToast(message, "error"), [showToast]);
  const showSuccess = useCallback((message) => showToast(message, "success"), [showToast]);
  const showInfo = useCallback((message) => showToast(message, "info"), [showToast]);
  const showWarning = useCallback((message) => showToast(message, "warning"), [showToast]);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    registerErrorToastHandler(showError);
    registerSuccessToastHandler(showSuccess);
    return () => {
      registerErrorToastHandler(null);
      registerSuccessToastHandler(null);
    };
  }, [showError, showSuccess]);

  const value = useMemo(
    () => ({
      showToast,
      showError,
      showSuccess,
      showInfo,
      showWarning,
    }),
    [showToast, showError, showSuccess, showInfo, showWarning]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={DEFAULT_DURATION}
        onClose={closeToast}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={closeToast}
          severity={toast.severity}
          variant="filled"
          sx={getToastAlertSx(toast.severity)}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}

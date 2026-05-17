import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import {
  registerErrorToastHandler,
  registerSuccessToastHandler,
} from "../utils/errorToastBridge";

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4200;

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
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
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

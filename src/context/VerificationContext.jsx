import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import client, {
  AUTH_SESSION_CHANGED_EVENT,
  getStoredCustomerAccessToken,
  getStoredRole,
} from "../Setup/Axios";
import { VerificationContext } from "./useVerification";

const DISMISS_SESSION_KEY = "shree:verification-warning-dismissed";

const ADMIN_ROLES = new Set(["super_admin", "manager", "support_staff"]);

const isCustomerSession = () => {
  if (!getStoredCustomerAccessToken()) return false;
  const role = getStoredRole();
  return !role || !ADMIN_ROLES.has(role);
};

export function VerificationProvider({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_SESSION_KEY) === "1"
  );

  const isEmailVerified = Boolean(user?.isEmailVerified);
  const isMobileVerified = Boolean(user?.isMobileVerified);
  const hasVerifiedContact = isEmailVerified || isMobileVerified;
  const needsVerification = Boolean(user) && !hasVerifiedContact;

  const refreshVerification = useCallback(async () => {
    if (!isCustomerSession()) {
      setUser(null);
      setDialogOpen(false);
      return null;
    }

    setLoading(true);
    try {
      const response = await client.get("/users/me");
      const nextUser = response?.data?.data?.user ?? null;
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      if (isCustomerSession()) {
        sessionStorage.removeItem(DISMISS_SESSION_KEY);
        setDismissed(false);
      } else {
        setUser(null);
        setDialogOpen(false);
      }
      void refreshVerification();
    };

    void refreshVerification();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthChange);
  }, [refreshVerification]);

  const isProfileRoute = location.pathname === "/profile" || location.pathname.startsWith("/profile/");

  useEffect(() => {
    if (loading || !needsVerification || dismissed || isProfileRoute) {
      if (!needsVerification) {
        setDialogOpen(false);
      }
      return;
    }
    setDialogOpen(true);
  }, [loading, needsVerification, dismissed, isProfileRoute, location.pathname]);

  const openVerificationWarning = useCallback(() => {
    if (!needsVerification) return;
    setDialogOpen(true);
  }, [needsVerification]);

  const closeVerificationWarning = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const dismissVerificationWarning = useCallback(() => {
    sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    setDismissed(true);
    setDialogOpen(false);
  }, []);

  const clearVerificationDismissal = useCallback(() => {
    sessionStorage.removeItem(DISMISS_SESSION_KEY);
    setDismissed(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isEmailVerified,
      isMobileVerified,
      hasVerifiedContact,
      needsVerification,
      dialogOpen,
      refreshVerification,
      openVerificationWarning,
      closeVerificationWarning,
      dismissVerificationWarning,
      clearVerificationDismissal,
    }),
    [
      user,
      loading,
      isEmailVerified,
      isMobileVerified,
      hasVerifiedContact,
      needsVerification,
      dialogOpen,
      refreshVerification,
      openVerificationWarning,
      closeVerificationWarning,
      dismissVerificationWarning,
      clearVerificationDismissal,
    ]
  );

  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>;
}


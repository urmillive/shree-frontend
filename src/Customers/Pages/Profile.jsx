import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiEdit2, FiLock, FiLogOut, FiMapPin, FiMoreVertical, FiPackage, FiRotateCcw, FiCheck, FiX } from "react-icons/fi";
import client, { clearStoredAccessToken } from "../../Setup/Axios";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";
import { colors, primaryAlpha, blackAlpha, whiteAlpha } from "../../theme/theme";

const profilePageStyles = {
  heroMuted: {
    margin: 0,
    opacity: 0.9,
    fontSize: "14px",
    color: colors.onPrimary,
  },
  heroNameInput: {
    margin: "4px 0 0",
    width: "100%",
    maxWidth: "420px",
    fontSize: "24px",
    lineHeight: 1.2,
    fontWeight: 700,
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${whiteAlpha(0.45)}`,
    outline: "none",
    color: colors.text,
    background: colors.background,
    boxSizing: "border-box",
  },
  heroEmail: {
    margin: "10px 0 0",
    opacity: 0.95,
    color: colors.onPrimary,
  },
  loadingCard: {
    padding: "28px",
    textAlign: "center",
  },
  rolePill: {
    background: whiteAlpha(0.18),
    border: `1px solid ${whiteAlpha(0.35)}`,
    borderRadius: "999px",
    padding: "7px 14px",
    fontWeight: 600,
    textTransform: "capitalize",
    color: colors.onPrimary,
  },
  heroButton: {
    background: colors.buttonBackground,
    color: colors.buttonText,
    border: `1px solid ${whiteAlpha(0.5)}`,
    borderRadius: "10px",
    padding: "9px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
  },
  section: {
    border: `1px solid ${primaryAlpha(0.45)}`,
    borderRadius: "14px",
    padding: "16px",
    background: `linear-gradient(135deg, ${primaryAlpha(0.06)} 0%, ${colors.background} 100%)`,
  },
  input: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${blackAlpha(0.15)}`,
    fontSize: "15px",
    outline: "none",
    color: colors.text,
    background: colors.background,
  },
  fieldInput: {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    minHeight: "44px",
    marginTop: "7px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${blackAlpha(0.15)}`,
    fontSize: "15px",
    lineHeight: 1.4,
    outline: "none",
    color: colors.text,
    background: colors.background,
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputOtp: {
    width: "120px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${blackAlpha(0.15)}`,
    fontSize: "15px",
    letterSpacing: "0.08em",
    outline: "none",
    color: colors.text,
    background: colors.background,
  },
  actionButton: {
    background: colors.buttonBackground,
    color: colors.buttonText,
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
  },
  subtleButton: {
    background: colors.buttonBackground,
    color: colors.buttonText,
    border: `1px solid ${blackAlpha(0.15)}`,
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
  },
  message: {
    margin: "12px 0 0",
    color: colors.text,
    fontSize: "13px",
    fontWeight: 600,
  },
  infoCard: {
    border: `1px solid ${blackAlpha(0.12)}`,
    borderRadius: "14px",
    padding: "14px",
    background: colors.background,
  },
  infoCardTitle: {
    margin: 0,
    color: colors.text,
    fontSize: "13px",
    fontWeight: 600,
  },
  infoCardValue: {
    margin: "7px 0 0",
    color: colors.text,
    fontWeight: 700,
    wordBreak: "break-word",
  },
  menuWrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    zIndex: 21,
  },
  menuTrigger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    padding: 0,
    borderRadius: "12px",
    border: `1px solid ${whiteAlpha(0.5)}`,
    background: colors.buttonBackground,
    color: colors.buttonText,
    cursor: "pointer",
    flexShrink: 0,
  },
  menuDropdown: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    minWidth: "220px",
    padding: "6px",
    borderRadius: "12px",
    background: colors.background,
    border: `1px solid ${blackAlpha(0.12)}`,
    boxShadow: `0 16px 40px ${blackAlpha(0.14)}`,
    zIndex: 20,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: colors.text,
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  },
  menuItemDanger: {
    color: "#b42318",
  },
  menuBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 15,
    background: blackAlpha(0.25),
    border: "none",
    padding: 0,
    cursor: "default",
  },
};

/** Scoped CSS: hero edit buttons + responsive layout (breakpoints inline styles cannot express cleanly) */
const profilePageScopedCss = `
  .profile-hero-edit-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: 10px;
    border: 1px solid ${whiteAlpha(0.5)};
    font-weight: 700;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    color: ${colors.buttonText};
    background-color: ${colors.buttonBackground};
    overflow: hidden;
    transition: color 0.22s ease 0.04s;
  }
  .profile-hero-edit-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: ${colors.background};
    transform: scale(0);
    transform-origin: bottom left;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }
  .profile-hero-edit-btn-content {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: inherit;
  }
  .profile-hero-edit-btn:hover:not(:disabled)::before {
    transform: scale(1);
  }
  .profile-hero-edit-btn:hover:not(:disabled),
  .profile-hero-edit-btn:hover:not(:disabled) .profile-hero-edit-btn-content {
    color: #ab8a48;
  }
  .profile-hero-edit-btn:focus-visible {
    outline: 2px solid ${whiteAlpha(0.85)};
    outline-offset: 2px;
  }
  .profile-hero-edit-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  /* Page shell & card — responsive layout */
  .profile-page {
    flex: 1;
    width: 100%;
    min-height: 100%;
    background: ${colors.background};
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: ${colors.text};
    box-sizing: border-box;
  }
  .profile-page *,
  .profile-page *::before,
  .profile-page *::after {
    box-sizing: border-box;
  }
  @media (max-width: 640px) {
    .profile-page {
      padding: 16px 12px;
      align-items: flex-start;
      padding-bottom: max(20px, env(safe-area-inset-bottom, 0px));
    }
  }

  .profile-card {
    width: 100%;
    max-width: 920px;
    background: ${colors.background};
    border: 1px solid ${blackAlpha(0.12)};
    border-radius: 20px;
    box-shadow: 0 20px 45px ${blackAlpha(0.08)};
    overflow: visible;
  }

  .profile-hero {
    background: ${colors.primary};
    color: ${colors.onPrimary};
    padding: 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 14px;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
  }
  @media (max-width: 640px) {
    .profile-hero {
      padding: 20px 16px;
      gap: 14px;
    }
    .profile-hero:not(.profile-hero--editing) {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: start;
      column-gap: 12px;
    }
    .profile-hero:not(.profile-hero--editing) .profile-hero-main {
      grid-column: 1;
      grid-row: 1;
      min-width: 0;
    }
    .profile-hero:not(.profile-hero--editing) .profile-hero-actions {
      grid-column: 2;
      grid-row: 1;
      width: auto;
      align-self: flex-start;
    }
    .profile-hero:not(.profile-hero--editing) .profile-hero-actions-inner {
      width: auto;
      flex-direction: row;
      align-items: flex-start;
      justify-content: flex-end;
    }
    .profile-hero-btn-desktop {
      display: none !important;
    }
    .profile-hero:not(.profile-hero--editing) .profile-menu-wrap {
      width: auto;
    }
    .profile-hero:not(.profile-hero--editing) .profile-menu-trigger {
      width: 44px;
      height: 44px;
    }
    .profile-hero--editing {
      flex-direction: column;
      align-items: stretch;
    }
    .profile-hero-edit-actions {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }
    .profile-hero-edit-actions .profile-hero-edit-btn,
    .profile-hero-edit-actions .profile-hero-btn {
      width: 100%;
      justify-content: center;
    }
  }

  .profile-hero-main {
    flex: 1 1 240px;
    min-width: 0;
  }

  .profile-hero-title {
    margin: 4px 0 0;
    font-size: clamp(1.375rem, 4.2vw, 1.875rem);
    line-height: 1.2;
    color: ${colors.onPrimary};
    word-break: break-word;
  }

  .profile-hero-name-input {
    max-width: 420px;
  }
  @media (max-width: 640px) {
    .profile-hero-name-input {
      max-width: none;
      font-size: clamp(1.1rem, 4vw, 1.35rem) !important;
    }
  }

  .profile-hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex: 0 1 auto;
  }
  .profile-hero-actions-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .profile-menu-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 220px;
    padding: 6px;
    border-radius: 12px;
    background: ${colors.background};
    border: 1px solid ${blackAlpha(0.12)};
    box-shadow: 0 16px 40px ${blackAlpha(0.14)};
    z-index: 20;
  }
  @media (max-width: 640px) {
    .profile-menu-dropdown {
      min-width: 240px;
    }
  }

  .profile-card-body {
    padding: 26px;
    display: grid;
    gap: 14px;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
  }
  @media (max-width: 640px) {
    .profile-card-body {
      padding: 16px 14px;
    }
  }

  .profile-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    gap: 14px;
  }
  .profile-field-input,
  .profile-phone-input {
    display: block;
    width: 100%;
    max-width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    font-family: inherit;
    -webkit-appearance: none;
    appearance: none;
  }
  @media (max-width: 640px) {
    .profile-info-grid .profile-field-card {
      grid-column: 1 / -1;
    }
    .profile-field-input,
    .profile-phone-input {
      font-size: 16px;
    }
  }

  .profile-status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
  }

  .profile-verify-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  @media (max-width: 640px) {
    .profile-verify-row {
      flex-direction: column;
      align-items: stretch;
    }
    .profile-verify-row .profile-verify-input,
    .profile-verify-row .profile-phone-input {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      flex: 1 1 auto !important;
    }
    .profile-verify-row .profile-otp-input {
      width: 100% !important;
      max-width: none !important;
      letter-spacing: 0.12em;
      text-align: center;
    }
    .profile-verify-row .profile-verify-btn {
      width: 100%;
    }
  }

  .profile-menu-item:hover:not(:disabled) {
    background: ${primaryAlpha(0.08)};
  }
  .profile-menu-item-danger:hover:not(:disabled) {
    background: rgba(180, 35, 24, 0.08);
  }
`;

const normalizeMobileDigits = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 10);

const Profile = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditing = searchParams.get("edit") === "true";
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mobileDraft, setMobileDraft] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileVerifyMsg, setMobileVerifyMsg] = useState("");
  const [mobileVerifyErr, setMobileVerifyErr] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerifyMsg, setEmailVerifyMsg] = useState("");
  const [emailVerifyErr, setEmailVerifyErr] = useState("");
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const [nameDraft, setNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEditErr, setProfileEditErr] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await client.get("/users/me");
      setProfile(response?.data?.data?.user || null);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }

      setError(getApiErrorMessage(err, "Unable to load profile details."));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await client.get("/users/me");
      setProfile(response?.data?.data?.user || null);
    } catch {
      /* keep existing profile on silent refresh failure */
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isEditing) return;
    if (profile?.mobile) {
      setMobileDraft(normalizeMobileDigits(profile.mobile));
    }
  }, [profile?.id, profile?.mobile, isEditing]);

  useEffect(() => {
    if (!isEditing || !profile) return;
    setNameDraft(String(profile.name ?? ""));
    setMobileDraft(normalizeMobileDigits(profile.mobile ?? ""));
  }, [isEditing, profile?.id]);

  useEffect(() => {
    if (isEditing) setMenuOpen(false);
  }, [isEditing]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const effectiveMobile = normalizeMobileDigits(mobileDraft);

  const handleSendMobileOtp = async () => {
    if (!/^\d{10}$/.test(effectiveMobile)) {
      setMobileVerifyErr("Enter a valid 10-digit mobile number.");
      setMobileVerifyMsg("");
      return;
    }
    setSendingOtp(true);
    setMobileVerifyErr("");
    setMobileVerifyMsg("");
    try {
      await client.post("/auth/send-mobile-otp", { mobile: effectiveMobile });
      setOtpSent(true);
      setMobileVerifyMsg("OTP sent. Enter the code below.");
      showSuccess("OTP sent to your mobile.");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Unable to send OTP.");
      setMobileVerifyErr(msg);
      showError(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!/^\d{10}$/.test(effectiveMobile)) {
      setMobileVerifyErr("Enter a valid 10-digit mobile number.");
      return;
    }
    if (mobileOtp.length !== 6) {
      setMobileVerifyErr("Enter the 6-digit OTP.");
      return;
    }
    setVerifyingOtp(true);
    setMobileVerifyErr("");
    setMobileVerifyMsg("");
    try {
      const res = await client.post("/auth/verify-mobile-otp", {
        mobile: effectiveMobile,
        otp: mobileOtp,
      });
      const user = res?.data?.data?.user;
      if (user) {
        setProfile(user);
      } else {
        await refreshProfile();
      }
      setMobileVerifyMsg("Mobile verified successfully.");
      showSuccess("Mobile verified successfully.");
      setOtpSent(false);
      setMobileOtp("");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Invalid or expired OTP.");
      setMobileVerifyErr(msg);
      showError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const email = String(profile?.email ?? "").trim();
    if (!email) {
      setEmailVerifyErr("No email address on file.");
      setEmailVerifyMsg("");
      return;
    }
    setSendingEmailOtp(true);
    setEmailVerifyErr("");
    setEmailVerifyMsg("");
    try {
      await client.post("/auth/resend-email-otp", { email });
      setEmailOtpSent(true);
      setEmailVerifyMsg("OTP sent to your email. Enter the code below.");
      showSuccess("OTP sent to your email.");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Unable to send email OTP.");
      setEmailVerifyErr(msg);
      showError(msg);
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const email = String(profile?.email ?? "").trim();
    if (!email) {
      setEmailVerifyErr("No email address on file.");
      return;
    }
    if (emailOtp.length !== 6) {
      setEmailVerifyErr("Enter the 6-digit OTP.");
      return;
    }
    setVerifyingEmailOtp(true);
    setEmailVerifyErr("");
    setEmailVerifyMsg("");
    try {
      const res = await client.post("/auth/verify-email", { email, otp: emailOtp });
      const user = res?.data?.data?.user;
      if (user) {
        setProfile(user);
      } else {
        await refreshProfile();
      }
      setEmailVerifyMsg("Email verified successfully.");
      showSuccess("Email verified successfully.");
      setEmailOtpSent(false);
      setEmailOtp("");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Invalid or expired OTP.");
      setEmailVerifyErr(msg);
      showError(msg);
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const beginEditProfile = () => {
    setProfileEditErr("");
    setNameDraft(String(profile?.name ?? ""));
    setMobileDraft(normalizeMobileDigits(profile?.mobile ?? ""));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("edit", "true");
      return next;
    });
  };

  const cancelEditProfile = () => {
    setProfileEditErr("");
    setNameDraft(String(profile?.name ?? ""));
    setMobileDraft(normalizeMobileDigits(profile?.mobile ?? ""));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("edit");
      return next;
    });
  };

  const handleSaveProfile = async () => {
    const name = String(nameDraft ?? "").trim();
    const mobileDigits = normalizeMobileDigits(mobileDraft);
    if (!name) {
      setProfileEditErr("Please enter your name.");
      return;
    }
    if (!/^\d{10}$/.test(mobileDigits)) {
      setProfileEditErr("Enter a valid 10-digit mobile number.");
      return;
    }
    setSavingProfile(true);
    setProfileEditErr("");
    try {
      const res = await client.put("/users/me", { name, mobile: mobileDigits });
      const user = res?.data?.data?.user;
      if (user) {
        setProfile(user);
      } else {
        await refreshProfile();
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("edit");
        return next;
      });
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      setProfileEditErr(getApiErrorMessage(err, "Unable to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setLoggingOut(true);
    try {
      await client.post("/auth/logout", {});
    } catch {
      /* still clear session locally */
    } finally {
      clearStoredAccessToken();
      setLoggingOut(false);
      navigate("/login");
    }
  };

  const closeMenu = () => setMenuOpen(false);

  if (loading) {
    return (
      <div className="profile-page">
        <style>{profilePageScopedCss}</style>
        <div className="profile-card" style={profilePageStyles.loadingCard}>
          Loading your profile...
        </div>
      </div>
    );
  }

  const userAddresses = Array.isArray(profile?.addresses) ? profile.addresses : [];
  const hasAddresses = userAddresses.length > 0;

  const goToAddresses = () => {
    closeMenu();
    navigate(hasAddresses ? "/profile/addresses" : "/profile/addresses/new");
  };

  if (error || !profile) {
    return (
      <div className="profile-page">
        <style>{profilePageScopedCss}</style>
        <div className="profile-card" style={profilePageStyles.loadingCard}>
          <h2 style={{ marginTop: 0, color: colors.text }}>Profile Unavailable</h2>
          <p style={{ color: colors.text, marginBottom: "20px" }}>{error || "No profile data found."}</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              ...profilePageStyles.actionButton,
              opacity: 1,
              cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <style>{profilePageScopedCss}</style>
      <div className="profile-card">
        <div className={`profile-hero${isEditing ? " profile-hero--editing" : ""}`}>
          <div className="profile-hero-main">
            <p style={profilePageStyles.heroMuted}>Welcome back</p>
            {isEditing ? (
              <input
                type="text"
                className="profile-hero-name-input"
                autoComplete="name"
                placeholder="Your name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                disabled={savingProfile}
                style={{
                  ...profilePageStyles.heroNameInput,
                  opacity: savingProfile ? 0.85 : 1,
                }}
              />
            ) : (
              <h1 className="profile-hero-title">{profile.name}</h1>
            )}
            <p style={profilePageStyles.heroEmail}>{profile.email}</p>
            {isEditing && profileEditErr && (
              <p style={{ margin: "10px 0 0", fontSize: "13px", fontWeight: 600, color: colors.onPrimary }}>
                {profileEditErr}
              </p>
            )}
          </div>
          <div className="profile-hero-actions">
            {/* <span style={profilePageStyles.rolePill}>{profile.role}</span> */}
            {isEditing ? (
              <div className="profile-hero-actions-inner profile-hero-edit-actions">
                <button
                  type="button"
                  className="profile-hero-edit-btn"
                  onClick={handleSaveProfile}
                  disabled={savingProfile || loggingOut}
                >
                  <span className="profile-hero-edit-btn-content">
                    <FiCheck size={18} strokeWidth={2.25} aria-hidden />
                    {savingProfile ? "Saving…" : "Save"}
                  </span>
                </button>
                <button
                  type="button"
                  className="profile-hero-edit-btn"
                  onClick={cancelEditProfile}
                  disabled={savingProfile}
                >
                  <span className="profile-hero-edit-btn-content">
                    <FiX size={18} strokeWidth={2.25} aria-hidden />
                    Cancel
                  </span>
                </button>
                <button
                  type="button"
                  className="profile-hero-btn"
                  onClick={handleLogout}
                  disabled={loggingOut || savingProfile}
                  style={{
                    ...profilePageStyles.heroButton,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: loggingOut || savingProfile ? "not-allowed" : "pointer",
                    opacity: loggingOut || savingProfile ? 0.65 : 1,
                  }}
                >
                  <FiLogOut size={18} aria-hidden />
                  {loggingOut ? "Logging out…" : "Logout"}
                </button>
              </div>
            ) : (
              <div className="profile-hero-actions-inner">
                <button
                  type="button"
                  className="profile-hero-btn profile-hero-btn-desktop"
                  onClick={() => navigate("/orders")}
                  disabled={loggingOut}
                  style={{
                    ...profilePageStyles.heroButton,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: loggingOut ? "not-allowed" : "pointer",
                    opacity: loggingOut ? 0.65 : 1,
                  }}
                >
                  <FiPackage size={18} aria-hidden />
                  Orders
                </button>
                <button
                  type="button"
                  className="profile-hero-btn profile-hero-btn-desktop"
                  onClick={goToAddresses}
                  disabled={loggingOut}
                  style={{
                    ...profilePageStyles.heroButton,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: loggingOut ? "not-allowed" : "pointer",
                    opacity: loggingOut ? 0.65 : 1,
                  }}
                >
                  <FiMapPin size={18} aria-hidden />
                  Address
                </button>
                {menuOpen && (
                  <button
                    type="button"
                    className="profile-menu-backdrop"
                    aria-label="Close menu"
                    style={profilePageStyles.menuBackdrop}
                    onClick={closeMenu}
                  />
                )}
                <div ref={menuContainerRef} className="profile-menu-wrap" style={profilePageStyles.menuWrap}>
                  <button
                    type="button"
                    className="profile-menu-trigger"
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? "Close profile menu" : "Open profile menu"}
                    onClick={() => setMenuOpen((open) => !open)}
                    disabled={loggingOut}
                    style={{
                      ...profilePageStyles.menuTrigger,
                      cursor: loggingOut ? "not-allowed" : "pointer",
                      opacity: loggingOut ? 0.75 : 1,
                    }}
                  >
                    <FiMoreVertical size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="profile-menu-dropdown"
                    aria-label="Profile actions"
                    style={profilePageStyles.menuDropdown}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-menu-item"
                      onClick={() => {
                        closeMenu();
                        beginEditProfile();
                      }}
                      disabled={loggingOut}
                      style={{
                        ...profilePageStyles.menuItem,
                        cursor: loggingOut ? "not-allowed" : "pointer",
                        opacity: loggingOut ? 0.65 : 1,
                      }}
                    >
                      <FiEdit2 size={18} aria-hidden />
                      Edit profile
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-menu-item"
                      onClick={goToAddresses}
                      disabled={loggingOut}
                      style={{
                        ...profilePageStyles.menuItem,
                        cursor: loggingOut ? "not-allowed" : "pointer",
                        opacity: loggingOut ? 0.65 : 1,
                      }}
                    >
                      <FiMapPin size={18} aria-hidden />
                      {hasAddresses ? "My addresses" : "Add address"}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-menu-item"
                      onClick={() => {
                        closeMenu();
                        navigate("/orders");
                      }}
                      disabled={loggingOut}
                      style={{
                        ...profilePageStyles.menuItem,
                        cursor: loggingOut ? "not-allowed" : "pointer",
                        opacity: loggingOut ? 0.65 : 1,
                      }}
                    >
                      <FiPackage size={18} aria-hidden />
                      My orders
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-menu-item"
                      onClick={() => {
                        closeMenu();
                        navigate("/returns");
                      }}
                      disabled={loggingOut}
                      style={{
                        ...profilePageStyles.menuItem,
                        cursor: loggingOut ? "not-allowed" : "pointer",
                        opacity: loggingOut ? 0.65 : 1,
                      }}
                    >
                      <FiRotateCcw size={18} aria-hidden />
                      My returns
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-menu-item"
                      onClick={() => {
                        closeMenu();
                        navigate("/profile/change-password");
                      }}
                      disabled={loggingOut}
                      style={{
                        ...profilePageStyles.menuItem,
                        cursor: loggingOut ? "not-allowed" : "pointer",
                        opacity: loggingOut ? 0.65 : 1,
                      }}
                    >
                      <FiLock size={18} aria-hidden />
                      Change password
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-menu-item profile-menu-item-danger"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      style={{
                        ...profilePageStyles.menuItem,
                        ...profilePageStyles.menuItemDanger,
                        cursor: loggingOut ? "not-allowed" : "pointer",
                        opacity: loggingOut ? 0.65 : 1,
                      }}
                    >
                      <FiLogOut size={18} aria-hidden />
                      {loggingOut ? "Logging out…" : "Logout"}
                    </button>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-card-body">
          <div className="profile-info-grid">
            {isEditing ? (
              <div className="profile-field-card" style={profilePageStyles.infoCard}>
                <p style={profilePageStyles.infoCardTitle}>Mobile</p>
                <input
                  type="tel"
                  className="profile-field-input"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={mobileDraft}
                  onChange={(e) => setMobileDraft(normalizeMobileDigits(e.target.value))}
                  disabled={savingProfile}
                  style={{
                    ...profilePageStyles.fieldInput,
                    opacity: savingProfile ? 0.85 : 1,
                  }}
                />
              </div>
            ) : (
              <InfoCard title="Mobile" value={profile.mobile || "Not added"} />
            )}
            {/* <InfoCard title="User ID" value={profile.id} /> */}
            <InfoCard
              title="Last Login"
              value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "N/A"}
            />
            <InfoCard
              title="Member Since"
              value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
            />
          </div>

          <div className="profile-status-row">
            <StatusBadge label="Email Verified" ok={profile.isEmailVerified} />
            <StatusBadge label="Mobile Verified" ok={profile.isMobileVerified} />
            {/* <StatusBadge label="Account Active" ok={profile.isActive} /> */}
          </div>

          {!profile.isEmailVerified && !isEditing && (
            <div style={profilePageStyles.section}>
              <p style={{ margin: "0 0 6px", color: colors.text, fontWeight: 700, fontSize: "15px" }}>
                Verify your email
              </p>
              <p style={{ margin: "0 0 14px", color: colors.text, fontSize: "13px", lineHeight: 1.45 }}>
                We will send a 6-digit code to <strong style={{ color: colors.text }}>{profile.email}</strong>.
                Enter it below to verify.
              </p>

              <div className="profile-verify-row">
                {!emailOtpSent ? (
                  <button
                    type="button"
                    className="profile-verify-btn"
                    onClick={handleSendEmailOtp}
                    disabled={sendingEmailOtp || verifyingEmailOtp}
                    style={{
                      ...profilePageStyles.actionButton,
                      cursor: sendingEmailOtp || verifyingEmailOtp ? "not-allowed" : "pointer",
                      opacity: sendingEmailOtp || verifyingEmailOtp ? 0.65 : 1,
                    }}
                  >
                    {sendingEmailOtp ? "Sending…" : "Verify email"}
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      className="profile-verify-input profile-otp-input"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit OTP"
                      value={emailOtp}
                      onChange={(e) =>
                        setEmailOtp(String(e.target.value).replace(/\D/g, "").slice(0, 6))
                      }
                      disabled={verifyingEmailOtp}
                      style={profilePageStyles.inputOtp}
                    />
                    <button
                      type="button"
                      className="profile-verify-btn"
                      onClick={handleVerifyEmailOtp}
                      disabled={verifyingEmailOtp || emailOtp.length !== 6}
                      style={{
                        ...profilePageStyles.actionButton,
                        cursor: verifyingEmailOtp || emailOtp.length !== 6 ? "not-allowed" : "pointer",
                        opacity: verifyingEmailOtp || emailOtp.length !== 6 ? 0.65 : 1,
                      }}
                    >
                      {verifyingEmailOtp ? "Verifying…" : "Verify email"}
                    </button>
                    <button
                      type="button"
                      className="profile-verify-btn"
                      onClick={handleSendEmailOtp}
                      disabled={sendingEmailOtp || verifyingEmailOtp}
                      style={{
                        ...profilePageStyles.subtleButton,
                        cursor: sendingEmailOtp || verifyingEmailOtp ? "not-allowed" : "pointer",
                        opacity: sendingEmailOtp || verifyingEmailOtp ? 0.65 : 1,
                      }}
                    >
                      {sendingEmailOtp ? "Sending…" : "Resend OTP"}
                    </button>
                  </>
                )}
              </div>

              {emailVerifyErr && <p style={profilePageStyles.message}>{emailVerifyErr}</p>}
              {emailVerifyMsg && !emailVerifyErr && <p style={profilePageStyles.message}>{emailVerifyMsg}</p>}
            </div>
          )}

          {!profile.isMobileVerified && !isEditing && (
            <div style={profilePageStyles.section}>
              <p style={{ margin: "0 0 6px", color: colors.text, fontWeight: 700, fontSize: "15px" }}>
                Verify your mobile number
              </p>
              <p style={{ margin: "0 0 14px", color: colors.text, fontSize: "13px", lineHeight: 1.45 }}>
                Your mobile is not verified yet. Enter your 10-digit number, send OTP, then enter the code you receive.
              </p>

              <div className="profile-verify-row">
                <input
                  type="tel"
                  className="profile-verify-input profile-phone-input"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={mobileDraft}
                  onChange={(e) => setMobileDraft(normalizeMobileDigits(e.target.value))}
                  disabled={sendingOtp || verifyingOtp}
                  style={{
                    ...profilePageStyles.fieldInput,
                    marginTop: 0,
                    flex: "1 1 100%",
                    opacity: sendingOtp || verifyingOtp ? 0.85 : 1,
                  }}
                />
                {!otpSent ? (
                  <button
                    type="button"
                    className="profile-verify-btn"
                    onClick={handleSendMobileOtp}
                    disabled={sendingOtp || verifyingOtp || effectiveMobile.length !== 10}
                    style={{
                      ...profilePageStyles.actionButton,
                      cursor: sendingOtp || effectiveMobile.length !== 10 ? "not-allowed" : "pointer",
                      opacity: sendingOtp || effectiveMobile.length !== 10 ? 0.65 : 1,
                    }}
                  >
                    {sendingOtp ? "Sending…" : "Send OTP"}
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      className="profile-verify-input profile-otp-input"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit OTP"
                      value={mobileOtp}
                      onChange={(e) =>
                        setMobileOtp(String(e.target.value).replace(/\D/g, "").slice(0, 6))
                      }
                      disabled={verifyingOtp}
                      style={profilePageStyles.inputOtp}
                    />
                    <button
                      type="button"
                      className="profile-verify-btn"
                      onClick={handleVerifyMobileOtp}
                      disabled={verifyingOtp || mobileOtp.length !== 6}
                      style={{
                        ...profilePageStyles.actionButton,
                        cursor: verifyingOtp || mobileOtp.length !== 6 ? "not-allowed" : "pointer",
                        opacity: verifyingOtp || mobileOtp.length !== 6 ? 0.65 : 1,
                      }}
                    >
                      {verifyingOtp ? "Verifying…" : "Verify mobile"}
                    </button>
                    <button
                      type="button"
                      className="profile-verify-btn"
                      onClick={handleSendMobileOtp}
                      disabled={sendingOtp || verifyingOtp}
                      style={{
                        ...profilePageStyles.subtleButton,
                        cursor: sendingOtp || verifyingOtp ? "not-allowed" : "pointer",
                        opacity: sendingOtp || verifyingOtp ? 0.65 : 1,
                      }}
                    >
                      {sendingOtp ? "Sending…" : "Resend OTP"}
                    </button>
                  </>
                )}
              </div>

              {mobileVerifyErr && <p style={profilePageStyles.message}>{mobileVerifyErr}</p>}
              {mobileVerifyMsg && !mobileVerifyErr && <p style={profilePageStyles.message}>{mobileVerifyMsg}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ title, value }) => (
  <div style={profilePageStyles.infoCard}>
    <p style={profilePageStyles.infoCardTitle}>{title}</p>
    <p style={profilePageStyles.infoCardValue}>{value}</p>
  </div>
);

const StatusBadge = ({ label, ok }) => (
  <span
    style={{
      borderRadius: "999px",
      padding: "8px 12px",
      fontWeight: 600,
      fontSize: "13px",
      border: ok ? `1px solid ${primaryAlpha(0.55)}` : `1px solid ${blackAlpha(0.22)}`,
      color: colors.text,
      background: ok ? primaryAlpha(0.08) : blackAlpha(0.04),
    }}
  >
    {label}: {ok ? "Yes" : "No"}
  </span>
);

export default Profile;

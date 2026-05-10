import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiEdit2, FiLock, FiLogOut, FiMapPin, FiMenu, FiPackage, FiCheck, FiX } from "react-icons/fi";
import client, { clearStoredAccessToken } from "../../Setup/Axios";
import { colors, primaryAlpha, blackAlpha, whiteAlpha } from "../../theme/theme";

const profilePageStyles = {
  page: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    background: colors.background,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: colors.text,
  },
  card: {
    width: "100%",
    maxWidth: "920px",
    background: colors.background,
    border: `1px solid ${blackAlpha(0.12)}`,
    borderRadius: "20px",
    boxShadow: `0 20px 45px ${blackAlpha(0.08)}`,
    overflow: "visible",
  },
  hero: {
    background: colors.primary,
    color: colors.onPrimary,
    padding: "28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
  },
  cardBody: {
    padding: "26px",
    display: "grid",
    gap: "14px",
    borderBottomLeftRadius: "20px",
    borderBottomRightRadius: "20px",
  },
  heroMuted: {
    margin: 0,
    opacity: 0.9,
    fontSize: "14px",
    color: colors.onPrimary,
  },
  heroTitle: {
    margin: "4px 0 0",
    fontSize: "30px",
    lineHeight: 1.2,
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
};

/** Scoped CSS: diagonal hover fill on Save / Cancel (inline styles cannot do :hover) */
const profileHeroEditButtonCss = `
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
`;

const normalizeMobileDigits = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 10);

const Profile = () => {
  const navigate = useNavigate();
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

      setError(err?.response?.data?.message || "Unable to load profile details.");
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
    } catch (err) {
      setMobileVerifyErr(err?.response?.data?.message || "Unable to send OTP.");
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
      setOtpSent(false);
      setMobileOtp("");
    } catch (err) {
      setMobileVerifyErr(err?.response?.data?.message || "Invalid or expired OTP.");
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
    } catch (err) {
      setEmailVerifyErr(err?.response?.data?.message || "Unable to send email OTP.");
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
      setEmailOtpSent(false);
      setEmailOtp("");
    } catch (err) {
      setEmailVerifyErr(err?.response?.data?.message || "Invalid or expired OTP.");
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
      setProfileEditErr(err?.response?.data?.message || "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
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

  if (loading) {
    return (
      <div style={profilePageStyles.page}>
        <div style={{ ...profilePageStyles.card, ...profilePageStyles.loadingCard }}>Loading your profile...</div>
      </div>
    );
  }

  const userAddresses = Array.isArray(profile?.addresses) ? profile.addresses : [];
  const hasAddresses = userAddresses.length > 0;

  if (error || !profile) {
    return (
      <div style={profilePageStyles.page}>
        <div style={{ ...profilePageStyles.card, ...profilePageStyles.loadingCard }}>
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
    <div style={profilePageStyles.page}>
      <style>{profileHeroEditButtonCss}</style>
      <div style={profilePageStyles.card}>
        <div style={profilePageStyles.hero}>
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <p style={profilePageStyles.heroMuted}>Welcome back</p>
            {isEditing ? (
              <input
                type="text"
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
              <h1 style={profilePageStyles.heroTitle}>{profile.name}</h1>
            )}
            <p style={profilePageStyles.heroEmail}>{profile.email}</p>
            {isEditing && profileEditErr && (
              <p style={{ margin: "10px 0 0", fontSize: "13px", fontWeight: 600, color: colors.onPrimary }}>
                {profileEditErr}
              </p>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            {/* <span style={profilePageStyles.rolePill}>{profile.role}</span> */}
            {isEditing ? (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
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
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
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
                  onClick={() => navigate(hasAddresses ? "/profile/addresses" : "/profile/addresses/new")}
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
                <div ref={menuContainerRef} style={profilePageStyles.menuWrap}>
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    onClick={() => setMenuOpen((open) => !open)}
                    disabled={loggingOut}
                    style={{
                      ...profilePageStyles.menuTrigger,
                      cursor: loggingOut ? "not-allowed" : "pointer",
                      opacity: loggingOut ? 0.75 : 1,
                    }}
                  >
                    <FiMenu size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                {menuOpen && (
                  <div role="menu" aria-label="Profile actions" style={profilePageStyles.menuDropdown}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
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
                      Edit
                    </button>
                   
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
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
                      onClick={() => {
                        setMenuOpen(false);
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
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={loggingOut}
                      style={{
                        ...profilePageStyles.menuItem,
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

        <div style={profilePageStyles.cardBody}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {isEditing ? (
              <div style={profilePageStyles.infoCard}>
                <p style={profilePageStyles.infoCardTitle}>Mobile</p>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile"
                  value={mobileDraft}
                  onChange={(e) => setMobileDraft(normalizeMobileDigits(e.target.value))}
                  disabled={savingProfile}
                  style={{
                    ...profilePageStyles.input,
                    marginTop: "7px",
                    width: "100%",
                    maxWidth: "280px",
                    boxSizing: "border-box",
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                {!emailOtpSent ? (
                  <button
                    type="button"
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile"
                  value={mobileDraft}
                  onChange={(e) => setMobileDraft(normalizeMobileDigits(e.target.value))}
                  disabled={sendingOtp || verifyingOtp}
                  style={{
                    ...profilePageStyles.input,
                    minWidth: "160px",
                    flex: "1 1 160px",
                  }}
                />
                {!otpSent ? (
                  <button
                    type="button"
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

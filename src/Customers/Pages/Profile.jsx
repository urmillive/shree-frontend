import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiCheck, FiEdit2, FiX } from "react-icons/fi";
import client, { clearStoredAccessToken } from "../../Setup/Axios";
import { colors, fonts } from "../../theme/theme";

const normalizeMobileDigits = (value) =>
  String(value ?? "").replace(/\D/g, "").slice(0, 10);

const eyebrowSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.muted,
};

const sectionLabelSx = {
  fontFamily: fonts.body,
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: colors.ink,
  mb: 2,
};

const accountLinks = [
  { label: "Profile", to: "/profile" },
  { label: "Orders", to: "/orders" },
  { label: "Addresses", to: "/profile/addresses" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "Change password", to: "/profile/change-password" },
];

function AccountSidebar({ active }) {
  return (
    <Stack
      spacing={0}
      sx={{
        borderTop: `1px solid ${colors.line}`,
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      {accountLinks.map((link) => {
        const isActive = active === link.to;
        return (
          <Box
            key={link.to}
            component="a"
            href={link.to}
            sx={{
              py: 1.5,
              px: 0,
              borderLeft: `2px solid ${
                isActive ? colors.ink : "transparent"
              }`,
              pl: 1.5,
              fontFamily: fonts.body,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: isActive ? colors.ink : colors.muted,
              textDecoration: "none",
              borderBottom: `1px solid ${colors.line}`,
              transition: "color 200ms cubic-bezier(0.2,0.7,0.2,1)",
              "&:hover": { color: colors.ink },
              "&:last-of-type": { borderBottom: "none" },
            }}
          >
            {link.label}
          </Box>
        );
      })}
    </Stack>
  );
}

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
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to load profile details."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await client.get("/users/me");
      setProfile(response?.data?.data?.user || null);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isEditing) return;
    if (profile?.mobile) setMobileDraft(normalizeMobileDigits(profile.mobile));
  }, [profile?.id, profile?.mobile, isEditing]);

  useEffect(() => {
    if (!isEditing || !profile) return;
    setNameDraft(String(profile.name ?? ""));
    setMobileDraft(normalizeMobileDigits(profile.mobile ?? ""));
  }, [isEditing, profile]);

  const effectiveMobile = normalizeMobileDigits(mobileDraft);

  const errMsg = (err, fallback) =>
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    fallback;

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
      setMobileVerifyErr(errMsg(err, "Unable to send OTP."));
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
      if (user) setProfile(user);
      else await refreshProfile();
      setMobileVerifyMsg("Mobile verified successfully.");
      setOtpSent(false);
      setMobileOtp("");
    } catch (err) {
      setMobileVerifyErr(errMsg(err, "Invalid or expired OTP."));
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
      setEmailVerifyErr(errMsg(err, "Unable to send email OTP."));
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
      const res = await client.post("/auth/verify-email", {
        email,
        otp: emailOtp,
      });
      const user = res?.data?.data?.user;
      if (user) setProfile(user);
      else await refreshProfile();
      setEmailVerifyMsg("Email verified successfully.");
      setEmailOtpSent(false);
      setEmailOtp("");
    } catch (err) {
      setEmailVerifyErr(errMsg(err, "Invalid or expired OTP."));
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
      const res = await client.put("/users/me", {
        name,
        mobile: mobileDigits,
      });
      const user = res?.data?.data?.user;
      if (user) setProfile(user);
      else await refreshProfile();
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
      setProfileEditErr(errMsg(err, "Unable to update profile."));
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
      <Box sx={{ bgcolor: colors.ivory, py: { xs: 5, sm: 8 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 } }}>
          <Skeleton variant="rectangular" sx={{ bgcolor: colors.stone }} height={300} />
        </Container>
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ bgcolor: colors.ivory, py: { xs: 5, sm: 8 } }}>
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <Alert
            severity="error"
            sx={{ borderRadius: 0, border: `1px solid ${colors.danger}` }}
          >
            {error || "No profile data found."}
          </Alert>
          <Button
            variant="contained"
            sx={{ mt: 3 }}
            onClick={() => navigate("/login")}
          >
            Back to login
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: colors.ivory, color: colors.ink, minHeight: "60vh" }}>
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1280, px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 8 } }}
      >
        <Stack spacing={1} sx={{ mb: { xs: 4, sm: 6 } }}>
          <Typography sx={eyebrowSx}>Account</Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: 34, sm: 48 },
              fontWeight: 500,
              color: colors.ink,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            Hello, {profile.name?.split(" ")[0] || "there"}
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14 }}>
            Manage your profile, addresses, orders, and security.
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 4, md: 6 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <AccountSidebar active="/profile" />
            <Box
              component="button"
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              sx={{
                mt: 4,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: fonts.body,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: colors.muted,
                borderBottom: `1px solid ${colors.muted}`,
                pb: 0.5,
                "&:hover": { color: colors.wine, borderBottomColor: colors.wine },
              }}
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 9 }}>
            <Box
              sx={{
                bgcolor: colors.paper,
                border: `1px solid ${colors.line}`,
                p: { xs: 3, sm: 4 },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <Typography sx={sectionLabelSx}>Personal details</Typography>
                {!isEditing ? (
                  <Button
                    variant="text"
                    startIcon={<FiEdit2 size={14} />}
                    onClick={beginEditProfile}
                  >
                    Edit
                  </Button>
                ) : null}
              </Stack>

              {profileEditErr ? (
                <Alert
                  severity="error"
                  sx={{ mb: 2, borderRadius: 0, border: `1px solid ${colors.danger}` }}
                >
                  {profileEditErr}
                </Alert>
              ) : null}

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={eyebrowSx} component="div">
                    Name
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      disabled={savingProfile}
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <Typography
                      sx={{
                        mt: 1,
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.ink,
                      }}
                    >
                      {profile.name}
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={eyebrowSx} component="div">
                    Email
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.ink,
                    }}
                  >
                    {profile.email}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={eyebrowSx} component="div">
                    Mobile
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={mobileDraft}
                      onChange={(e) =>
                        setMobileDraft(normalizeMobileDigits(e.target.value))
                      }
                      disabled={savingProfile}
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <Typography
                      sx={{
                        mt: 1,
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.ink,
                      }}
                    >
                      {profile.mobile || "—"}
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography sx={eyebrowSx} component="div">
                    Member since
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.ink,
                    }}
                  >
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "—"}
                  </Typography>
                </Grid>
              </Grid>

              {isEditing ? (
                <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<FiCheck size={14} />}
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FiX size={14} />}
                    onClick={cancelEditProfile}
                    disabled={savingProfile}
                  >
                    Cancel
                  </Button>
                </Stack>
              ) : null}

              <Box
                sx={{
                  height: 1,
                  bgcolor: colors.line,
                  my: 4,
                }}
              />

              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Box
                  sx={{
                    border: `1px solid ${
                      profile.isEmailVerified ? colors.success : colors.line
                    }`,
                    color: profile.isEmailVerified
                      ? colors.success
                      : colors.muted,
                    px: 1.5,
                    py: 0.75,
                    fontFamily: fonts.body,
                    fontSize: 10.5,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                  }}
                >
                  Email {profile.isEmailVerified ? "verified" : "unverified"}
                </Box>
                <Box
                  sx={{
                    border: `1px solid ${
                      profile.isMobileVerified ? colors.success : colors.line
                    }`,
                    color: profile.isMobileVerified
                      ? colors.success
                      : colors.muted,
                    px: 1.5,
                    py: 0.75,
                    fontFamily: fonts.body,
                    fontSize: 10.5,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                  }}
                >
                  Mobile {profile.isMobileVerified ? "verified" : "unverified"}
                </Box>
              </Stack>

              {!profile.isEmailVerified && !isEditing ? (
                <Box
                  sx={{
                    borderTop: `1px solid ${colors.line}`,
                    pt: 3,
                    mb: 4,
                  }}
                >
                  <Typography sx={sectionLabelSx}>Verify email</Typography>
                  <Typography
                    sx={{
                      color: colors.muted,
                      fontSize: 13,
                      mb: 2,
                    }}
                  >
                    We'll send a 6-digit code to{" "}
                    <strong style={{ color: colors.ink }}>
                      {profile.email}
                    </strong>
                    .
                  </Typography>
                  {!emailOtpSent ? (
                    <Button
                      variant="outlined"
                      onClick={handleSendEmailOtp}
                      disabled={sendingEmailOtp}
                    >
                      {sendingEmailOtp ? "Sending…" : "Send code"}
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                      <TextField
                        size="small"
                        placeholder="6-digit OTP"
                        value={emailOtp}
                        onChange={(e) =>
                          setEmailOtp(
                            String(e.target.value)
                              .replace(/\D/g, "")
                              .slice(0, 6)
                          )
                        }
                        disabled={verifyingEmailOtp}
                        sx={{ width: 160 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleVerifyEmailOtp}
                        disabled={verifyingEmailOtp || emailOtp.length !== 6}
                      >
                        {verifyingEmailOtp ? "Verifying…" : "Verify"}
                      </Button>
                      <Button
                        variant="text"
                        onClick={handleSendEmailOtp}
                        disabled={sendingEmailOtp}
                      >
                        Resend
                      </Button>
                    </Stack>
                  )}
                  {emailVerifyErr ? (
                    <Typography
                      sx={{ mt: 1.5, fontSize: 12, color: colors.danger }}
                    >
                      {emailVerifyErr}
                    </Typography>
                  ) : null}
                  {emailVerifyMsg && !emailVerifyErr ? (
                    <Typography
                      sx={{ mt: 1.5, fontSize: 12, color: colors.success }}
                    >
                      {emailVerifyMsg}
                    </Typography>
                  ) : null}
                </Box>
              ) : null}

              {!profile.isMobileVerified && !isEditing ? (
                <Box sx={{ borderTop: `1px solid ${colors.line}`, pt: 3 }}>
                  <Typography sx={sectionLabelSx}>Verify mobile</Typography>
                  <Typography
                    sx={{ color: colors.muted, fontSize: 13, mb: 2 }}
                  >
                    Enter your 10-digit number, send OTP, then enter the code.
                  </Typography>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                    <TextField
                      size="small"
                      placeholder="10-digit mobile"
                      value={mobileDraft}
                      onChange={(e) =>
                        setMobileDraft(normalizeMobileDigits(e.target.value))
                      }
                      disabled={sendingOtp || verifyingOtp}
                      sx={{ width: 200 }}
                    />
                    {!otpSent ? (
                      <Button
                        variant="outlined"
                        onClick={handleSendMobileOtp}
                        disabled={
                          sendingOtp || effectiveMobile.length !== 10
                        }
                      >
                        {sendingOtp ? "Sending…" : "Send OTP"}
                      </Button>
                    ) : (
                      <>
                        <TextField
                          size="small"
                          placeholder="6-digit OTP"
                          value={mobileOtp}
                          onChange={(e) =>
                            setMobileOtp(
                              String(e.target.value)
                                .replace(/\D/g, "")
                                .slice(0, 6)
                            )
                          }
                          disabled={verifyingOtp}
                          sx={{ width: 160 }}
                        />
                        <Button
                          variant="contained"
                          onClick={handleVerifyMobileOtp}
                          disabled={verifyingOtp || mobileOtp.length !== 6}
                        >
                          {verifyingOtp ? "Verifying…" : "Verify"}
                        </Button>
                        <Button
                          variant="text"
                          onClick={handleSendMobileOtp}
                          disabled={sendingOtp}
                        >
                          Resend
                        </Button>
                      </>
                    )}
                  </Stack>
                  {mobileVerifyErr ? (
                    <Typography
                      sx={{ mt: 1.5, fontSize: 12, color: colors.danger }}
                    >
                      {mobileVerifyErr}
                    </Typography>
                  ) : null}
                  {mobileVerifyMsg && !mobileVerifyErr ? (
                    <Typography
                      sx={{ mt: 1.5, fontSize: 12, color: colors.success }}
                    >
                      {mobileVerifyMsg}
                    </Typography>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Profile;

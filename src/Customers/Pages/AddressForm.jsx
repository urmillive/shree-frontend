import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiTrash2 } from "react-icons/fi";
import client from "../../Setup/Axios";
import { colors, blackAlpha } from "../../theme/theme";
import { extractAddressesFromMeResponse, getAddressId } from "../../utils/addressesApi";

const normalizeMobileDigits = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 10);

const normalizePincode = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 6);

const pageStyles = {
  page: {
    minHeight: "100vh",
    background: colors.background,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "24px",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: colors.text,
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    background: colors.background,
    border: `1px solid ${blackAlpha(0.12)}`,
    borderRadius: "20px",
    boxShadow: `0 20px 45px ${blackAlpha(0.08)}`,
    overflow: "hidden",
  },
  hero: {
    background: colors.primary,
    color: colors.onPrimary,
    padding: "22px 26px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  heroTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    flex: 1,
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    padding: 0,
    borderRadius: "12px",
    border: `1px solid rgba(255,255,255,0.5)`,
    background: colors.buttonBackground,
    color: colors.buttonText,
    cursor: "pointer",
    flexShrink: 0,
  },
  body: {
    padding: "22px 26px 28px",
    display: "grid",
    gap: "14px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
    color: colors.text,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${blackAlpha(0.15)}`,
    fontSize: "15px",
    outline: "none",
    color: colors.text,
    background: colors.background,
    boxSizing: "border-box",
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: 600,
  },
  err: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 600,
    color: colors.text,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "6px",
  },
  primaryBtn: {
    background: colors.buttonBackground,
    color: colors.buttonText,
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    fontFamily: "inherit",
  },
  dangerBtn: {
    background: colors.background,
    color: colors.text,
    border: `1px solid ${blackAlpha(0.22)}`,
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
};

const emptyForm = () => ({
  label: "",
  name: "",
  mobile: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: true,
});

const AddressForm = () => {
  const navigate = useNavigate();
  const { addressId } = useParams();
  const isEdit = Boolean(addressId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm());
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await client.get("/users/me");
        const list = extractAddressesFromMeResponse(res);
        const found = list.find((a) => String(getAddressId(a)) === String(addressId));
        if (cancelled) return;
        if (!found) {
          setLoadError("Address not found.");
          return;
        }
        setForm({
          label: String(found.label ?? ""),
          name: String(found.name ?? ""),
          mobile: normalizeMobileDigits(found.mobile),
          line1: String(found.line1 ?? ""),
          line2: String(found.line2 ?? ""),
          city: String(found.city ?? ""),
          state: String(found.state ?? ""),
          pincode: normalizePincode(found.pincode),
          country: String(found.country ?? "India"),
          isDefault: Boolean(found.isDefault),
        });
      } catch (err) {
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }
        if (!cancelled) {
          setLoadError(err?.response?.data?.message || "Unable to load address.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addressId, isEdit, navigate]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const name = String(form.name ?? "").trim();
    const mobile = normalizeMobileDigits(form.mobile);
    const line1 = String(form.line1 ?? "").trim();
    const city = String(form.city ?? "").trim();
    const state = String(form.state ?? "").trim();
    const pin = normalizePincode(form.pincode);
    if (!name) return "Please enter the recipient name.";
    if (!/^\d{10}$/.test(mobile)) return "Enter a valid 10-digit mobile number.";
    if (!line1) return "Please enter address line 1.";
    if (!city) return "Please enter city.";
    if (!state) return "Please enter state.";
    if (!/^\d{6}$/.test(pin)) return "Enter a valid 6-digit pincode.";
    return "";
  };

  const buildPayload = () => ({
    label: String(form.label ?? "").trim() || "Address",
    name: String(form.name ?? "").trim(),
    mobile: normalizeMobileDigits(form.mobile),
    line1: String(form.line1 ?? "").trim(),
    line2: String(form.line2 ?? "").trim() || undefined,
    city: String(form.city ?? "").trim(),
    state: String(form.state ?? "").trim(),
    pincode: normalizePincode(form.pincode),
    country: String(form.country ?? "").trim() || "India",
    isDefault: Boolean(form.isDefault),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setFormError(v);
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await client.put(`/users/me/addresses/${addressId}`, payload);
      } else {
        await client.post("/users/me/addresses", payload);
      }
      navigate("/profile/addresses");
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      setFormError(err?.response?.data?.message || "Could not save address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !addressId) return;
    const ok = window.confirm("Delete this address? This cannot be undone.");
    if (!ok) return;
    setDeleting(true);
    setFormError("");
    try {
      await client.delete(`/users/me/addresses/${addressId}`);
      navigate("/profile/addresses");
    } catch (err) {
      setFormError(err?.response?.data?.message || "Could not delete address.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.card}>
        <div style={pageStyles.hero}>
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/profile/addresses")}
            style={pageStyles.backBtn}
          >
            <FiArrowLeft size={20} aria-hidden />
          </button>
          <h1 style={pageStyles.heroTitle}>{isEdit ? "Edit address" : "Add address"}</h1>
        </div>

        <form style={pageStyles.body} onSubmit={handleSubmit}>
          {loading && <p style={{ margin: 0 }}>Loading…</p>}
          {!loading && loadError && (
            <div>
              <p style={pageStyles.err}>{loadError}</p>
              <button
                type="button"
                style={{ ...pageStyles.primaryBtn, marginTop: "12px" }}
                onClick={() => navigate("/profile/addresses")}
              >
                Back to addresses
              </button>
            </div>
          )}
          {!loading && !loadError && (
            <>
              <div>
                <label style={pageStyles.label} htmlFor="addr-label">
                  Label
                </label>
                <input
                  id="addr-label"
                  type="text"
                  autoComplete="organization"
                  placeholder="Home, Work…"
                  value={form.label}
                  onChange={(e) => setField("label", e.target.value)}
                  disabled={saving || deleting}
                  style={pageStyles.input}
                />
              </div>
              <div>
                <label style={pageStyles.label} htmlFor="addr-name">
                  Full name
                </label>
                <input
                  id="addr-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  disabled={saving || deleting}
                  style={pageStyles.input}
                />
              </div>
              <div>
                <label style={pageStyles.label} htmlFor="addr-mobile">
                  Mobile
                </label>
                <input
                  id="addr-mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={form.mobile}
                  onChange={(e) => setField("mobile", normalizeMobileDigits(e.target.value))}
                  disabled={saving || deleting}
                  style={pageStyles.input}
                />
              </div>
              <div>
                <label style={pageStyles.label} htmlFor="addr-line1">
                  Address line 1
                </label>
                <input
                  id="addr-line1"
                  type="text"
                  autoComplete="address-line1"
                  value={form.line1}
                  onChange={(e) => setField("line1", e.target.value)}
                  disabled={saving || deleting}
                  style={pageStyles.input}
                />
              </div>
              <div>
                <label style={pageStyles.label} htmlFor="addr-line2">
                  Address line 2 (optional)
                </label>
                <input
                  id="addr-line2"
                  type="text"
                  autoComplete="address-line2"
                  value={form.line2}
                  onChange={(e) => setField("line2", e.target.value)}
                  disabled={saving || deleting}
                  style={pageStyles.input}
                />
              </div>
              <div style={pageStyles.row2}>
                <div>
                  <label style={pageStyles.label} htmlFor="addr-city">
                    City
                  </label>
                  <input
                    id="addr-city"
                    type="text"
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    disabled={saving || deleting}
                    style={pageStyles.input}
                  />
                </div>
                <div>
                  <label style={pageStyles.label} htmlFor="addr-state">
                    State
                  </label>
                  <input
                    id="addr-state"
                    type="text"
                    autoComplete="address-level1"
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                    disabled={saving || deleting}
                    style={pageStyles.input}
                  />
                </div>
              </div>
              <div style={pageStyles.row2}>
                <div>
                  <label style={pageStyles.label} htmlFor="addr-pin">
                    Pincode
                  </label>
                  <input
                    id="addr-pin"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.pincode}
                    onChange={(e) => setField("pincode", normalizePincode(e.target.value))}
                    disabled={saving || deleting}
                    style={pageStyles.input}
                  />
                </div>
                <div>
                  <label style={pageStyles.label} htmlFor="addr-country">
                    Country
                  </label>
                  <input
                    id="addr-country"
                    type="text"
                    autoComplete="country-name"
                    value={form.country}
                    onChange={(e) => setField("country", e.target.value)}
                    disabled={saving || deleting}
                    style={pageStyles.input}
                  />
                </div>
              </div>
              <label style={pageStyles.checkRow}>
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setField("isDefault", e.target.checked)}
                  disabled={saving || deleting}
                />
                Set as default address
              </label>
              {formError && <p style={pageStyles.err}>{formError}</p>}
              <div style={pageStyles.actions}>
                <button
                  type="submit"
                  disabled={saving || deleting}
                  style={{
                    ...pageStyles.primaryBtn,
                    opacity: saving || deleting ? 0.75 : 1,
                    cursor: saving || deleting ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : isEdit ? "Save changes" : "Save address"}
                </button>
                {isEdit && (
                  <button
                    type="button"
                    disabled={saving || deleting}
                    onClick={handleDelete}
                    style={{
                      ...pageStyles.dangerBtn,
                      opacity: saving || deleting ? 0.75 : 1,
                      cursor: saving || deleting ? "not-allowed" : "pointer",
                    }}
                  >
                    <FiTrash2 size={18} aria-hidden />
                    {deleting ? "Deleting…" : "Delete address"}
                  </button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddressForm;

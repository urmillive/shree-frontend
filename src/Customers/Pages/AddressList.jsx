import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiMapPin, FiPlus, FiTrash2 } from "react-icons/fi";
import client from "../../Setup/Axios";
import { colors, primaryAlpha, blackAlpha } from "../../theme/theme";
import { getApiErrorMessage } from "../../utils/apiError";
import { extractAddressesFromMeResponse, getAddressId } from "../../utils/addressesApi";

const pageStyles = {
  page: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
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
    maxWidth: "720px",
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
    flexWrap: "wrap",
  },
  heroTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    flex: "1 1 auto",
  },
  body: {
    padding: "22px 26px 28px",
    display: "grid",
    gap: "14px",
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
  addBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "10px",
    border: `1px solid rgba(255,255,255,0.5)`,
    background: colors.buttonBackground,
    color: colors.buttonText,
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  addressCard: {
    border: `1px solid ${blackAlpha(0.12)}`,
    borderRadius: "14px",
    padding: "16px",
    background: colors.background,
    display: "grid",
    gap: "10px",
  },
  rowTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  labelPill: {
    fontWeight: 700,
    fontSize: "15px",
    margin: 0,
  },
  defaultBadge: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "4px 8px",
    borderRadius: "999px",
    border: `1px solid ${primaryAlpha(0.45)}`,
    background: primaryAlpha(0.08),
    color: colors.text,
  },
  actions: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
  },
  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: `1px solid ${blackAlpha(0.14)}`,
    background: colors.background,
    color: colors.text,
    cursor: "pointer",
  },
  lines: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: colors.text,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  muted: {
    margin: 0,
    fontSize: "13px",
    color: blackAlpha(0.65),
  },
  empty: {
    textAlign: "center",
    padding: "28px 12px",
    color: blackAlpha(0.7),
    fontSize: "15px",
  },
  primaryBtn: {
    background: colors.buttonBackground,
    color: colors.buttonText,
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    fontFamily: "inherit",
  },
};

const AddressList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.get("/users/me");
      setAddresses(extractAddressesFromMeResponse(res));
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError(getApiErrorMessage(err, "Unable to load addresses."));
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm("Delete this address? This cannot be undone.");
    if (!ok) return;
    setDeletingId(id);
    try {
      await client.delete(`/users/me/addresses/${id}`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete address."));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.card}>
        <div style={pageStyles.hero}>
          <button
            type="button"
            aria-label="Back to profile"
            onClick={() => navigate("/profile")}
            style={pageStyles.backBtn}
          >
            <FiArrowLeft size={20} aria-hidden />
          </button>
          <h1 style={pageStyles.heroTitle}>Saved addresses</h1>
          <button
            type="button"
            onClick={() => navigate("/profile/addresses/new")}
            style={pageStyles.addBtn}
          >
            <FiPlus size={18} aria-hidden />
            Add address
          </button>
        </div>

        <div style={pageStyles.body}>
          {loading && <p style={{ margin: 0 }}>Loading addresses…</p>}
          {!loading && error && (
            <div>
              <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{error}</p>
              <button type="button" onClick={load} style={pageStyles.primaryBtn}>
                Try again
              </button>
            </div>
          )}
          {!loading && !error && addresses.length === 0 && (
            <div style={pageStyles.empty}>
              <p style={{ margin: "0 0 16px" }}>You have not added any addresses yet.</p>
              <button
                type="button"
                onClick={() => navigate("/profile/addresses/new")}
                style={pageStyles.primaryBtn}
              >
                Create address
              </button>
            </div>
          )}
          {!loading &&
            !error &&
            addresses.map((a) => {
              const id = getAddressId(a);
              const lines = [
                [a.line1, a.line2].filter(Boolean).join(", "),
                [a.city, a.state, a.pincode].filter(Boolean).join(", "),
                a.country,
              ]
                .filter(Boolean)
                .join("\n");
              return (
                <div key={id || JSON.stringify(a)} style={pageStyles.addressCard}>
                  <div style={pageStyles.rowTop}>
                    <div style={pageStyles.labelRow}>
                      <FiMapPin size={18} aria-hidden style={{ flexShrink: 0 }} />
                      <p style={pageStyles.labelPill}>{a.label || "Address"}</p>
                      {a.isDefault && <span style={pageStyles.defaultBadge}>Default</span>}
                    </div>
                    <div style={pageStyles.actions}>
                      <button
                        type="button"
                        aria-label="Edit address"
                        disabled={!id || deletingId === id}
                        onClick={() => id && navigate(`/profile/addresses/${id}/edit`)}
                        style={{
                          ...pageStyles.iconBtn,
                          opacity: !id || deletingId === id ? 0.5 : 1,
                          cursor: !id || deletingId === id ? "not-allowed" : "pointer",
                        }}
                      >
                        <FiEdit2 size={18} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete address"
                        disabled={!id || Boolean(deletingId)}
                        onClick={() => handleDelete(id)}
                        style={{
                          ...pageStyles.iconBtn,
                          opacity: !id || deletingId ? 0.5 : 1,
                          cursor: !id || deletingId ? "not-allowed" : "pointer",
                        }}
                      >
                        <FiTrash2 size={18} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <p style={pageStyles.lines}>
                    <strong>{a.name}</strong>
                    {a.mobile ? ` · ${a.mobile}` : ""}
                  </p>
                  <p style={pageStyles.lines}>{lines}</p>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default AddressList;

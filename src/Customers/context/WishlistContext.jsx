import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredAccessToken } from "../../Setup/Axios";
import {
  addItemToWishlist,
  checkWishlistItem,
  clearWishlist,
  fetchWishlist,
  normalizeWishlistPayload,
  removeWishlistItem,
} from "../services/publicWishlistService";
import { WishlistContext } from "./useWishlist";

const EMPTY_WISHLIST = {
  id: "",
  total: 0,
  items: [],
  raw: {},
};

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(EMPTY_WISHLIST);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isAuthenticated = Boolean(getStoredAccessToken());

  const reloadWishlist = useCallback(async () => {
    if (!getStoredAccessToken()) {
      setWishlist(EMPTY_WISHLIST);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetchWishlist();
      setWishlist(normalizeWishlistPayload(response?.data));
    } catch (err) {
      setWishlist(EMPTY_WISHLIST);
      setError(err?.response?.data?.message || err?.message || "Unable to load wishlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadWishlist();
  }, [reloadWishlist]);

  useEffect(() => {
    const onStorage = () => void reloadWishlist();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reloadWishlist]);

  const runWishlistMutation = useCallback(async (operation) => {
    setBusy(true);
    setError("");
    try {
      const response = await operation();
      setWishlist(normalizeWishlistPayload(response?.data));
      return response;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Wishlist update failed.");
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const addWishlistProduct = useCallback(
    async (productId) => runWishlistMutation(() => addItemToWishlist(productId)),
    [runWishlistMutation]
  );

  const deleteWishlistProduct = useCallback(
    async (productId) => runWishlistMutation(() => removeWishlistItem(productId)),
    [runWishlistMutation]
  );

  const clearWholeWishlist = useCallback(async () => runWishlistMutation(() => clearWishlist()), [runWishlistMutation]);

  const isInWishlist = useCallback(
    async (productId) => {
      if (!productId || !getStoredAccessToken()) return false;
      try {
        const response = await checkWishlistItem(productId);
        return Boolean(response?.data?.inWishlist ?? response?.data?.data?.inWishlist);
      } catch {
        return false;
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      wishlist,
      loading,
      busy,
      error,
      isAuthenticated,
      reloadWishlist,
      addWishlistProduct,
      deleteWishlistProduct,
      clearWholeWishlist,
      isInWishlist,
    }),
    [wishlist, loading, busy, error, isAuthenticated, reloadWishlist, addWishlistProduct, deleteWishlistProduct, clearWholeWishlist, isInWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

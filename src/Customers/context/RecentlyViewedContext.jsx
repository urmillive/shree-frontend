import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  clearRecentlyViewed as clearRecentlyViewedRequest,
  fetchRecentlyViewed,
  normalizeRecentlyViewedProducts,
  trackRecentlyViewedProduct,
} from "../services/publicRecentlyViewedService";
import { RecentlyViewedContext } from "./useRecentlyViewed";

export function RecentlyViewedProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reloadRecentlyViewed = useCallback(async (options = {}) => {
    const quiet = Boolean(options.quiet);
    if (!quiet) {
      setLoading(true);
    }
    setError("");
    try {
      const response = await fetchRecentlyViewed();
      setProducts(normalizeRecentlyViewedProducts(response?.data));
    } catch (err) {
      setProducts([]);
      setError(getApiErrorMessage(err, "Unable to load recently viewed."));
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void reloadRecentlyViewed();
  }, [reloadRecentlyViewed]);

  useEffect(() => {
    const onStorage = () => void reloadRecentlyViewed({ quiet: true });
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reloadRecentlyViewed]);

  const trackProductView = useCallback(
    async (productId) => {
      const id = productId != null ? String(productId).trim() : "";
      if (!id) return;
      try {
        await trackRecentlyViewedProduct(id);
        await reloadRecentlyViewed({ quiet: true });
      } catch {
        /* non-blocking: product page should still work */
      }
    },
    [reloadRecentlyViewed]
  );

  const clearAllRecentlyViewed = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await clearRecentlyViewedRequest();
      setProducts([]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to clear history."));
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      products,
      loading,
      busy,
      error,
      reloadRecentlyViewed,
      trackProductView,
      clearAllRecentlyViewed,
    }),
    [products, loading, busy, error, reloadRecentlyViewed, trackProductView, clearAllRecentlyViewed]
  );

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

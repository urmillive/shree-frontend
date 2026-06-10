import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredAccessToken } from "../../Setup/Axios";
import {
  addItemToCart,
  clearCart,
  fetchCart,
  mergeGuestCart,
  normalizeCartPayload,
  removeCartItem,
  updateCartItemQuantity,
} from "../services/publicCartService";
import { CartContext } from "./useCart";

const EMPTY_CART = {
  id: "",
  items: [],
  itemCount: 0,
  quantity: 0,
  totals: {
    subtotal: 0,
    taxTotal: 0,
    discountAmount: 0,
    savings: 0,
    shippingAmount: 0,
    grandTotal: 0,
  },
  raw: {},
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reloadCart = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchCart();
      setCart(normalizeCartPayload(response?.data));
    } catch (err) {
      setCart(EMPTY_CART);
      setError(err?.response?.data?.message || err?.message || "Unable to load cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadCart();
  }, [reloadCart]);

  useEffect(() => {
    const onStorage = () => {
      void reloadCart();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reloadCart]);

  const runCartMutation = useCallback(async (operation) => {
    setBusy(true);
    setError("");
    try {
      const response = await operation();
      setCart(normalizeCartPayload(response?.data));
      return response;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Cart update failed.");
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const addCartItem = useCallback(
    async ({ productId, variantId, quantity = 1 }) =>
      runCartMutation(() => addItemToCart({ productId, variantId, quantity })),
    [runCartMutation]
  );

  const setCartItemQuantity = useCallback(
    async (itemId, quantity) => runCartMutation(() => updateCartItemQuantity(itemId, quantity)),
    [runCartMutation]
  );

  const deleteCartItem = useCallback(
    async (itemId) => runCartMutation(() => removeCartItem(itemId)),
    [runCartMutation]
  );

  const clearWholeCart = useCallback(async () => runCartMutation(() => clearCart()), [runCartMutation]);

  const mergeCurrentGuestCart = useCallback(
    async () => runCartMutation(() => mergeGuestCart()),
    [runCartMutation]
  );

  const value = useMemo(
    () => ({
      cart,
      loading,
      busy,
      error,
      isAuthenticated: Boolean(getStoredAccessToken()),
      reloadCart,
      addCartItem,
      setCartItemQuantity,
      deleteCartItem,
      clearWholeCart,
      mergeCurrentGuestCart,
    }),
    [cart, loading, busy, error, reloadCart, addCartItem, setCartItemQuantity, deleteCartItem, clearWholeCart, mergeCurrentGuestCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

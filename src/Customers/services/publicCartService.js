import client from "../../Setup/Axios";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCartItem = (item = {}) => ({
  id: item?.id || item?._id || "",
  productId: item?.productId || item?.product?._id || item?.product?.id || "",
  variantId: item?.variantId || item?.variant?._id || item?.variant?.id || "",
  productName: item?.productName || item?.name || item?.product?.name || "Product",
  productSlug: item?.productSlug || item?.slug || item?.product?.slug || "",
  imageUrl: item?.productImage || item?.imageUrl || item?.image || item?.product?.thumbnailUrl || "",
  sku: item?.sku || "",
  quantity: Math.max(1, asNumber(item?.quantity, 1)),
  unitPrice: asNumber(item?.unitPrice ?? item?.price ?? item?.effectivePrice ?? 0),
  regularPrice: asNumber(item?.regularPrice ?? item?.mrp ?? item?.unitPrice ?? item?.price ?? 0),
  discountPrice: asNumber(item?.discountPrice ?? 0),
  effectivePrice: asNumber(item?.effectivePrice ?? item?.unitPrice ?? item?.price ?? 0),
  taxPercent: asNumber(item?.taxPercent ?? 0),
  taxAmount: asNumber(item?.taxAmount ?? 0),
  savings: asNumber(item?.savings ?? (asNumber(item?.regularPrice ?? 0) - asNumber(item?.effectivePrice ?? 0)) * asNumber(item?.quantity ?? 1)),
  availableStock: asNumber(item?.availableStock ?? 0),
  isAvailable: Boolean(item?.isAvailable ?? true),
  color: item?.color || item?.variant?.color || null,
  size: item?.size || item?.variant?.size || "",
  variant: item?.variant || null,
  raw: item,
});

export const normalizeCartPayload = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  const cartRoot = root?.cart ?? root?.data?.cart ?? root?.data ?? root ?? {};
  const totalsRoot = cartRoot?.totals || {};
  const itemsSource = Array.isArray(cartRoot?.items) ? cartRoot.items : [];
  const items = itemsSource.map(normalizeCartItem);
  const fallbackItemCount = items.length;
  const fallbackQuantity = items.reduce((sum, item) => sum + Math.max(0, asNumber(item.quantity, 0)), 0);

  return {
    id: cartRoot?.id || cartRoot?._id || "",
    items,
    itemCount: asNumber(totalsRoot?.itemCount, fallbackItemCount),
    quantity: asNumber(totalsRoot?.quantity, fallbackQuantity),
    totals: {
      subtotal: asNumber(cartRoot?.subtotal ?? totalsRoot?.subtotal ?? 0),
      taxTotal: asNumber(cartRoot?.taxTotal ?? totalsRoot?.taxTotal ?? cartRoot?.taxAmount ?? totalsRoot?.taxAmount ?? 0),
      discountAmount: asNumber(cartRoot?.discountAmount ?? cartRoot?.totals?.discountAmount ?? 0),
      savings: asNumber(cartRoot?.savings ?? totalsRoot?.savings ?? 0),
      shippingAmount: asNumber(cartRoot?.shippingAmount ?? cartRoot?.totals?.shippingAmount ?? 0),
      grandTotal: asNumber(
        cartRoot?.grandTotal ??
          cartRoot?.total ??
          totalsRoot?.grandTotal ??
          totalsRoot?.total ??
          asNumber(cartRoot?.subtotal ?? totalsRoot?.subtotal ?? 0) + asNumber(cartRoot?.taxTotal ?? totalsRoot?.taxTotal ?? 0)
      ),
    },
    raw: cartRoot,
  };
};

export const fetchCart = () => client.get("/cart");

export const addItemToCart = ({ productId, variantId, quantity }) =>
  client.post("/cart/items", { productId, variantId, quantity });

export const updateCartItemQuantity = (itemId, quantity) =>
  client.put(`/cart/items/${encodeURIComponent(itemId)}`, { quantity });

export const removeCartItem = (itemId) => client.delete(`/cart/items/${encodeURIComponent(itemId)}`);

export const clearCart = () => client.delete("/cart");

export const mergeGuestCart = () => client.post("/cart/merge", {});

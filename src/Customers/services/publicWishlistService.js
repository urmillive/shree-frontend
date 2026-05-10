import client from "../../Setup/Axios";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeWishlistItem = (item = {}) => {
  const product = item?.product || item?.productData || {};
  return {
    id: item?.id || item?._id || item?.productId || product?.id || product?._id || "",
    productId: item?.productId || product?.id || product?._id || "",
    slug: item?.productSlug || item?.slug || product?.slug || "",
    name: item?.productName || item?.name || product?.name || product?.title || "Product",
    imageUrl:
      item?.productImage ||
      item?.imageUrl ||
      item?.image ||
      product?.thumbnailUrl ||
      product?.imageUrl ||
      product?.image?.url ||
      (Array.isArray(product?.images) && product.images[0]?.url) ||
      (Array.isArray(product?.images) && typeof product.images[0] === "string" ? product.images[0] : "") ||
      "",
    price: asNumber(
      item?.price ??
        item?.effectivePrice ??
        product?.discountPrice ??
        product?.price ??
        product?.regularPrice ??
        product?.mrp ??
        0
    ),
    product,
    addedAt: item?.addedAt || item?.createdAt || product?.createdAt || "",
    raw: item,
  };
};

export const normalizeWishlistPayload = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  const wishlistRoot = root?.wishlist ?? root?.data?.wishlist ?? root?.data ?? root ?? {};
  const itemsSource = Array.isArray(wishlistRoot?.items) ? wishlistRoot.items : [];
  const items = itemsSource.map(normalizeWishlistItem);
  const total = asNumber(wishlistRoot?.total ?? wishlistRoot?.count ?? items.length);

  return {
    id: wishlistRoot?.id || wishlistRoot?._id || "",
    total,
    items,
    raw: wishlistRoot,
  };
};

export const fetchWishlist = () => client.get("/wishlist");

export const addItemToWishlist = (productId) => client.post("/wishlist/items", { productId });

export const removeWishlistItem = (productId) => client.delete(`/wishlist/items/${encodeURIComponent(productId)}`);

export const clearWishlist = () => client.delete("/wishlist");

export const checkWishlistItem = (productId) => client.get(`/wishlist/check/${encodeURIComponent(productId)}`);

import client from "../../Setup/Axios";

/**
 * Guest: relies on axios `withCredentials` (e.g. guestCartId cookie).
 * Auth: same client sends Bearer token when present.
 */
export const trackRecentlyViewedProduct = (productId) =>
  client.post("/recently-viewed", { productId });

export const fetchRecentlyViewed = () => client.get("/recently-viewed");

export const clearRecentlyViewed = () => client.delete("/recently-viewed");

export const normalizeRecentlyViewedProducts = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  const products =
    (Array.isArray(root?.products) && root.products) ||
    (Array.isArray(root?.items) && root.items) ||
    (Array.isArray(root?.data?.products) && root.data.products) ||
    [];

  return products.map((item) => {
    const id = item?.productId ?? item?.id ?? item?._id ?? "";
    const thumb = item?.thumbnailUrl ?? item?.imageUrl ?? item?.image ?? "";
    const images = Array.isArray(item?.images) ? item.images : thumb ? [thumb] : [];
    return {
      ...item,
      id,
      _id: id,
      slug: item?.slug ?? item?.productSlug ?? "",
      name: item?.name ?? item?.productName ?? item?.title,
      thumbnailUrl: item?.thumbnailUrl ?? thumb,
      images,
    };
  });
};

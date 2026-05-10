import client from "../../Setup/Axios";

const isNonEmpty = (value) => value != null && String(value).trim() !== "";

export const fetchPublicProducts = (params = {}) => {
  const query = {};

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) query[key] = value.join(",");
      return;
    }
    if (isNonEmpty(value)) query[key] = value;
  });

  return client.get("/products", { params: query });
};

export const fetchPublicProductBySlug = (slug) => client.get(`/products/${slug}`);

export const normalizeProductsPayload = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  const products =
    (Array.isArray(root?.products) && root.products) ||
    (Array.isArray(root?.items) && root.items) ||
    (Array.isArray(root?.docs) && root.docs) ||
    (Array.isArray(root?.results) && root.results) ||
    (Array.isArray(root?.data) && root.data) ||
    (Array.isArray(root) && root) ||
    [];

  const page = Number(root?.page ?? root?.currentPage ?? 1);
  const limit = Number(root?.limit ?? root?.pageSize ?? 10);
  const total = Number(root?.total ?? root?.totalItems ?? root?.count ?? products.length);
  const totalPages = Number(root?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))));

  return { products, page, limit, total, totalPages };
};

export const resolveProductImage = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const firstImage = images[0];
  if (typeof firstImage === "string" && firstImage) return firstImage;
  if (firstImage?.url) return firstImage.url;
  return product?.thumbnailUrl || product?.imageUrl || product?.image?.url || "";
};

export const resolveProductName = (product) => product?.name || product?.title || "Product";

export const resolveProductPrice = (product) =>
  Number(
    product?.v ??
      product?.discountPrice ??
      product?.price ??
      product?.regularPrice ??
      product?.mrp ??
      product?.basePrice ??
      0
  );

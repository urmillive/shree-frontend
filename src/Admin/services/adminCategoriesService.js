import client from "../../Setup/Axios";

const getCategoryId = (category) => String(category?._id || category?.id || "").trim();

const normalizeCategoryTree = (nodes, parentPath = "") => {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((node) => {
    const id = getCategoryId(node);
    const name = String(node?.name || "").trim();
    const pathLabel = [parentPath, name].filter(Boolean).join(" > ");
    const normalized = {
      ...node,
      _uiId: id,
      _uiPathLabel: pathLabel || name || id || "Unnamed category",
      children: Array.isArray(node?.children) ? node.children : [],
    };
    const descendants = normalizeCategoryTree(normalized.children, pathLabel || name);
    return [normalized, ...descendants];
  });
};

export const normalizeCategoryListPayload = (payload) => {
  const root = payload?.data ?? payload;
  if (!root) return [];
  const list = root.categories ?? root.items ?? root.data ?? root;
  return Array.isArray(list) ? list : [];
};

export const flattenCategories = (payload) => {
  const tree = normalizeCategoryListPayload(payload);
  const flattened = normalizeCategoryTree(tree);
  const uniqueById = new Map();
  flattened.forEach((category) => {
    if (!category?._uiId) return;
    uniqueById.set(category._uiId, category);
  });
  return Array.from(uniqueById.values());
};

export const normalizeCategoryPayload = (payload) => {
  const root = payload?.data ?? payload;
  if (!root || typeof root !== "object") return null;
  return root.category ?? root;
};

export const fetchAdminCategories = () => client.get("/admin/categories");
export const fetchAdminCategoryById = (id) => client.get(`/admin/categories/${encodeURIComponent(String(id).trim())}`);
export const createAdminCategory = (payload) => client.post("/admin/categories", payload);
export const updateAdminCategory = (id, payload) => client.put(`/admin/categories/${encodeURIComponent(String(id).trim())}`, payload);
export const toggleAdminCategoryStatus = (id) => client.patch(`/admin/categories/${encodeURIComponent(String(id).trim())}/toggle-status`);
export const getAdminCategoryUploadUrl = (id, payload) =>
  client.post(`/admin/categories/${encodeURIComponent(String(id).trim())}/upload-url`, payload);
export const confirmAdminCategoryImage = (id, payload) =>
  client.post(`/admin/categories/${encodeURIComponent(String(id).trim())}/image-confirm`, payload);

/** Presigned PUT then image-confirm; returns normalized category or null. */
export async function uploadAdminCategoryImageFromFile(categoryId, file) {
  const id = String(categoryId || "").trim();
  if (!id || !file) {
    throw new Error("Category id and image file are required.");
  }
  const { data } = await getAdminCategoryUploadUrl(id, {
    contentType: file.type || "application/octet-stream",
    fileName: file.name || `category-image-${Date.now()}.jpg`,
  });
  const payload = data?.data !== undefined ? data.data : data;
  const uploadUrl = payload?.uploadUrl;
  const key = payload?.key;
  if (!uploadUrl || !key) {
    throw new Error("Upload URL response is missing uploadUrl or key.");
  }
  const { data: confirmBody } = await confirmAdminCategoryImage(id, { key });
  return normalizeCategoryPayload(confirmBody);
}

export const deleteAdminCategory = (id) => client.delete(`/admin/categories/${encodeURIComponent(String(id).trim())}`);

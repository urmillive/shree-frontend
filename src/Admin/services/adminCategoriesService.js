import client from "../../Setup/Axios";

const getCategoryId = (category) => String(category?._id || category?.id || "").trim();

export const getAncestorId = (ancestor) => String(ancestor?._id || ancestor?.id || "").trim();

/** Ordered root → … → direct parent from API `ancestors` array. */
export const normalizeCategoryAncestors = (category) => {
  const raw = category?.ancestors;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      id: getAncestorId(item),
      name: String(item?.name || "").trim() || "Unnamed",
      slug: String(item?.slug || "").trim(),
    }))
    .filter((item) => item.id || item.name);
};

export const getCategoryParentId = (category) => {
  const parent = category?.parent;
  if (parent == null || parent === "") return "";
  if (typeof parent === "object") return getCategoryId(parent);
  return String(parent).trim();
};

/** Max depth: Level 1 (root) → Level 2 → Level 3. API `level` is 0-based. */
export const MAX_CATEGORY_DEPTH = 3;

export const getCategoryLevel = (category) => {
  const fromApi = Number(category?.level);
  if (Number.isFinite(fromApi) && fromApi >= 0) return fromApi;
  const path = String(category?._uiPathLabel || "").trim();
  if (!path) return 0;
  return Math.max(0, (path.match(/ > /g) || []).length);
};

/** Categories that can be a parent when creating or moving a child (levels 1–2 only). */
export const canBeParentCategory = (category) => getCategoryLevel(category) < MAX_CATEGORY_DEPTH - 1;

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
/** Single-step multipart upload: POST /admin/categories/:id/image with field "file". */
export async function uploadAdminCategoryImageFromFile(categoryId, file) {
  const id = String(categoryId || "").trim();
  if (!id || !file) {
    throw new Error("Category id and image file are required.");
  }
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post(
    `/admin/categories/${encodeURIComponent(id)}/image`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return normalizeCategoryPayload(data);
}

export const deleteAdminCategory = (id) => client.delete(`/admin/categories/${encodeURIComponent(String(id).trim())}`);

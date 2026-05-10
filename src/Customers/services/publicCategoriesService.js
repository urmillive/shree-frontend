import client from "../../Setup/Axios";

/**
 * GET /api/categories/tree — full tree (server may cache ~1hr).
 */
export const fetchPublicCategoryTree = () => client.get("/categories/tree");

/**
 * GET /api/categories/:slug — category + breadcrumb[{ name, slug }, ...].
 */
export const fetchPublicCategoryBySlug = (slug) =>
  client.get(`/categories/${encodeURIComponent(String(slug ?? "").trim())}`);

/**
 * GET /api/categories/:slug/children — direct child categories.
 */
export const fetchPublicCategoryChildren = (slug) =>
  client.get(`/categories/${encodeURIComponent(String(slug ?? "").trim())}/children`);

export const getPublicCategorySlug = (node) => {
  const s = node?.slug;
  return s != null && String(s).trim() ? String(s).trim() : "";
};

export const getPublicCategoryName = (node) => {
  const n = node?.name;
  return n != null && String(n).trim() ? String(n).trim() : "Category";
};

/** Resolved image URL for category cards/carousels. */
export const getPublicCategoryImageUrl = (node) =>
  node?.imageUrl || node?.image?.url || node?.thumbnailUrl || node?.coverImage || null;

export const normalizePublicCategoryTreePayload = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.tree)) return root.tree;
  if (Array.isArray(root?.categories)) return root.categories;
  if (Array.isArray(root?.data)) return root.data;
  return [];
};

export const normalizePublicCategoryDetailPayload = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (!root || typeof root !== "object") {
    return { category: null, breadcrumb: [] };
  }
  const category = root.category ?? root;
  const breadcrumb = Array.isArray(root.breadcrumb)
    ? root.breadcrumb
    : Array.isArray(category?.breadcrumb)
      ? category.breadcrumb
      : [];
  return { category, breadcrumb };
};

export const normalizePublicCategoryChildrenPayload = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.children)) return root.children;
  if (Array.isArray(root?.categories)) return root.categories;
  if (Array.isArray(root?.items)) return root.items;
  return [];
};

/**
 * Depth-first list of every node in the tree for grids / menus.
 * @param {object[]} nodes
 * @param {number} depth
 * @param {string[]} trail ancestor names for labels
 * @returns {Array<{ node: object; depth: number; trail: string[] }>}
 */
export const flattenPublicCategoryTree = (nodes, depth = 0, trail = []) => {
  if (!Array.isArray(nodes)) return [];
  const out = [];
  for (const node of nodes) {
    const name = getPublicCategoryName(node);
    const nextTrail = [...trail, name];
    out.push({ node, depth, trail: nextTrail });
    const children = Array.isArray(node?.children) ? node.children : [];
    if (children.length > 0) {
      out.push(...flattenPublicCategoryTree(children, depth + 1, nextTrail));
    }
  }
  return out;
};

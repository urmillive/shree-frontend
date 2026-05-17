/** Works with APIs that expose Mongo `id`, legacy `_id`, or both. */
export const getCategoryNodeId = (category) => {
  if (!category || typeof category !== "object") return "";
  const fromUnderscore = category._id;
  if (fromUnderscore != null && String(fromUnderscore).trim()) return String(fromUnderscore).trim();
  const plain = category.id;
  if (plain != null && String(plain).trim()) return String(plain).trim();
  return "";
};

export const buildCategoryTree = (categories) => {
  if (!Array.isArray(categories)) return [];
  const list = categories.filter((item) => item && typeof item === "object");
  if (list.length === 0) return [];

  const looksLikeTree = list.some((item) => Array.isArray(item.children));
  if (looksLikeTree) return list;

  const nodeMap = new Map();
  list.forEach((category) => {
    const cid = getCategoryNodeId(category);
    if (!cid) return;
    nodeMap.set(cid, { ...category, children: [] });
  });

  const roots = [];
  nodeMap.forEach((node) => {
    const parentKey = node.parent != null ? String(node.parent).trim() : "";
    if (parentKey && nodeMap.has(parentKey)) {
      nodeMap.get(parentKey).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

export const flattenDescendants = (node) => {
  if (!node || !Array.isArray(node.children)) return [];
  const out = [];
  const queue = [...node.children];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    out.push(current);
    if (Array.isArray(current.children) && current.children.length) {
      queue.push(...current.children);
    }
  }
  return out;
};

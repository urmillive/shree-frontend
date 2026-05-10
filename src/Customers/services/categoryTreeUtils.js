export const buildCategoryTree = (categories) => {
  if (!Array.isArray(categories)) return [];
  const list = categories.filter((item) => item && typeof item === "object");
  if (list.length === 0) return [];

  const looksLikeTree = list.some((item) => Array.isArray(item.children));
  if (looksLikeTree) return list;

  const nodeMap = new Map();
  list.forEach((category) => {
    nodeMap.set(category._id, { ...category, children: [] });
  });

  const roots = [];
  nodeMap.forEach((node) => {
    if (node.parent && nodeMap.has(node.parent)) {
      nodeMap.get(node.parent).children.push(node);
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

import client from "../../Setup/Axios";

export function normalizeCustomerReturnsListPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  let items = [];
  let total = 0;

  if (Array.isArray(root)) {
    items = root;
    total = root.length;
  } else if (Array.isArray(root?.returns)) {
    items = root.returns;
    total = Number(root.total ?? root.count ?? root.pagination?.total ?? items.length) || items.length;
  } else if (Array.isArray(root?.data)) {
    items = root.data;
    total = Number(root.total ?? root.meta?.total ?? items.length) || items.length;
  } else if (Array.isArray(root?.items)) {
    items = root.items;
    total = Number(root.total ?? items.length) || items.length;
  } else if (root && typeof root === "object") {
    const firstArray = Object.values(root).find((v) => Array.isArray(v));
    if (firstArray) {
      items = firstArray;
      total = Number(root.total ?? root.count ?? items.length) || items.length;
    }
  }

  const metaTotal = payload?.meta?.total;
  if (metaTotal != null && Number.isFinite(Number(metaTotal))) {
    total = Number(metaTotal);
  }

  return { items, total };
}

export function normalizeCustomerReturnPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.return ?? root.data?.return ?? root.data ?? root;
  }
  return root;
}

export function pickCustomerReturnNumber(returnItem) {
  const raw =
    returnItem?.returnNumber ??
    returnItem?.return_no ??
    returnItem?.returnNo ??
    returnItem?.number ??
    returnItem?._id ??
    returnItem?.id ??
    null;
  return raw == null ? "" : String(raw);
}

export const createCustomerReturn = (body) => client.post("/returns", body);

export const fetchCustomerReturns = (params) => client.get("/returns", { params });

export const fetchCustomerReturn = (returnNumber) =>
  client.get(`/returns/${encodeURIComponent(returnNumber)}`);

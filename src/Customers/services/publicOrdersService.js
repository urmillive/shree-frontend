import client from "../../Setup/Axios";

export function unwrapOrdersRoot(payload) {
  if (payload == null) return null;
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.data !== undefined && !Array.isArray(root.data) ? root.data : root;
  }
  return root;
}

export function normalizeCustomerOrdersListPayload(payload) {
  const root = unwrapOrdersRoot(payload) ?? payload;
  let items = [];
  let total = 0;

  if (Array.isArray(root)) {
    items = root;
    total = root.length;
  } else if (Array.isArray(root?.orders)) {
    items = root.orders;
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

export function normalizeCustomerOrderPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root.order ?? root.data?.order ?? root.data ?? root;
  }
  return root;
}

export function pickCustomerOrderNumber(order) {
  const raw =
    order?.orderNumber ??
    order?.order_no ??
    order?.orderNo ??
    order?.number ??
    order?._id ??
    order?.id ??
    null;
  return raw == null ? "" : String(raw);
}

export function pickRazorpayPublicKey(order) {
  if (!order || typeof order !== "object") return "";
  return (
    order.razorpayKeyId ??
    order.razorpayKey ??
    order.keyId ??
    order.razorpay?.keyId ??
    import.meta.env.VITE_RAZORPAY_KEY_ID ??
    ""
  );
}

export function pickRazorpayOrderId(order) {
  const ro = order?.razorpayOrder ?? order?.razorpay_order;
  if (!ro) return "";
  if (typeof ro === "string") return ro;
  return ro.id ?? ro.order_id ?? "";
}

export function pickRazorpayAmountPaise(order, fallbackInrFromCart) {
  const ro = order?.razorpayOrder ?? order?.razorpay_order;
  if (ro && typeof ro === "object") {
    const n = Number(ro.amount ?? ro.amount_due ?? ro.amountDue);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  const cart = Number(fallbackInrFromCart);
  if (Number.isFinite(cart) && cart > 0) return Math.round(cart * 100);
  return 0;
}

export const placeCustomerOrder = (body) => client.post("/orders", body);

export const fetchCustomerOrders = (params) => client.get("/orders", { params });

export const fetchCustomerOrder = (orderNumber) =>
  client.get(`/orders/${encodeURIComponent(orderNumber)}`);

export const cancelCustomerOrder = (orderNumber, body) =>
  client.post(`/orders/${encodeURIComponent(orderNumber)}/cancel`, body);

export const initiateRazorpayPayment = (orderNumber) =>
  client.post(`/payments/orders/${encodeURIComponent(orderNumber)}/initiate`);

export const verifyRazorpayPayment = (body) =>
  client.post("/payments/verify", body);

export const trackCustomerShipment = (orderNumber) =>
  client.get(`/shipping/${encodeURIComponent(orderNumber)}/track`);

export function normalizeInitiatePaymentPayload(payload) {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (!root || typeof root !== "object") return null;
  const inner = root.data !== undefined && !Array.isArray(root.data) ? root.data : root;
  return {
    razorpayOrderId: inner.razorpayOrderId ?? inner.razorpay_order_id ?? "",
    amount: Number(inner.amount ?? inner.amount_due ?? 0),
    currency: inner.currency || "INR",
    orderNumber: inner.orderNumber ?? inner.order_no ?? "",
    keyId: inner.keyId ?? inner.razorpayKeyId ?? "",
  };
}

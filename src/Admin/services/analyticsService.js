import client from "../../Setup/Axios";

const normalizePayload = (payload) => (payload?.data !== undefined ? payload.data : payload);

export const fetchRevenueReport = async ({ from, to, groupBy }) => {
  const { data } = await client.get("/admin/analytics/revenue", { params: { from, to, groupBy } });
  return normalizePayload(data);
};

export const fetchTopProductsReport = async ({ from, to, limit }) => {
  const { data } = await client.get("/admin/analytics/top-products", { params: { from, to, limit } });
  return normalizePayload(data);
};

export const fetchOrdersReport = async ({ from, to }) => {
  const { data } = await client.get("/admin/analytics/orders", { params: { from, to } });
  return normalizePayload(data);
};

export const fetchCustomersReport = async ({ from, to }) => {
  const { data } = await client.get("/admin/analytics/customers", { params: { from, to } });
  return normalizePayload(data);
};

export const fetchInventoryReport = async () => {
  const { data } = await client.get("/admin/analytics/inventory");
  return normalizePayload(data);
};

export const fetchReturnsReport = async ({ from, to }) => {
  const { data } = await client.get("/admin/analytics/returns", { params: { from, to } });
  return normalizePayload(data);
};

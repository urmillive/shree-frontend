export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCount = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN").format(amount);
};

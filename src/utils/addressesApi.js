/**
 * Reads addresses from GET /users/me response: data.data.user.addresses
 * Falls back to legacy shapes (dedicated list endpoint or bare arrays).
 */
export function extractAddressesFromMeResponse(res) {
  const user = res?.data?.data?.user;
  if (user && Array.isArray(user.addresses)) return user.addresses;

  const inner = res?.data?.data ?? res?.data;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.addresses)) return inner.addresses;
  return [];
}

export function getAddressId(a) {
  return a?._id ?? a?.id ?? "";
}

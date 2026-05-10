import client from "../../Setup/Axios";

export const fetchHomepageBannersByPlacement = (placement = "hero") =>
  client.get(`/homepage/banners/${encodeURIComponent(String(placement || "hero").trim())}`);

export const normalizeHomepageBannersPayload = (payload) => {
  const root = payload?.data !== undefined ? payload.data : payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.banners)) return root.banners;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  return [];
};

export const getBannerDesktopImageUrl = (banner) =>
  banner?.desktopImageUrl || banner?.imageUrl || banner?.image?.url || "";

export const getBannerMobileImageUrl = (banner) =>
  banner?.mobileImageUrl || banner?.mobileImage?.url || "";

export const getBannerTargetUrl = (banner) => {
  const url = banner?.ctaUrl;
  return url != null && String(url).trim() ? String(url).trim() : "";
};

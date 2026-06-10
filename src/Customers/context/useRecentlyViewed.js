import { createContext, useContext } from "react";

export const RecentlyViewedContext = createContext(null);

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider.");
  }
  return context;
}

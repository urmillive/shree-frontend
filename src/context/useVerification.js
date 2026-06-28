import { createContext, useContext } from "react";

export const VerificationContext = createContext(null);

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error("useVerification must be used within VerificationProvider.");
  }
  return context;
}

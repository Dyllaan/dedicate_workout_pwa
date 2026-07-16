import { createContext, useContext, type ReactNode } from "react";
import { useProvideAuth } from "./useAuthSession";
import type { AuthContextType } from "@/features/auth/types/AuthContextType";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

type AuthProviderProps = {
  children: ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  const contextValue = useProvideAuth();

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

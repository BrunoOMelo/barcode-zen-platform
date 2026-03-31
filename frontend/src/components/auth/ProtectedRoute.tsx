import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { loadPlatformSession } from "@/platform/storage";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = loadPlatformSession();
  if (!session) {
    return <Navigate to="/platform/login" replace />;
  }
  return <>{children}</>;
}

import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auditoria from "@/pages/Auditoria";
import Contagem from "@/pages/Contagem";
import CriarInventario from "@/pages/CriarInventario";
import Divergencias from "@/pages/Divergencias";
import Estoque from "@/pages/Estoque";
import NotFound from "@/pages/NotFound";
import PlatformLogin from "@/pages/platform/PlatformLogin";
import Recontagem from "@/pages/Recontagem";
import Relatorios from "@/pages/Relatorios";
import { loadPlatformSession } from "@/platform/storage";

export function AppRoutes() {
  const hasSession = Boolean(loadPlatformSession());
  const rootTarget = hasSession ? "/estoque" : "/login";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={rootTarget} replace />} />
      <Route path="/login" element={<PlatformLogin />} />

      <Route path="/platform/login" element={<Navigate to="/login" replace />} />
      <Route path="/platform/app" element={<Navigate to="/estoque" replace />} />
      <Route path="/platform" element={<Navigate to="/login" replace />} />

      <Route
        path="/estoque"
        element={
          <ProtectedRoute>
            <Estoque />
          </ProtectedRoute>
        }
      />
      <Route path="/produtos" element={<Navigate to="/estoque" replace />} />
      <Route path="/inventarios" element={<Navigate to="/estoque" replace />} />
      <Route
        path="/inventarios/criar"
        element={
          <ProtectedRoute>
            <CriarInventario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventarios/:id/contagem"
        element={
          <ProtectedRoute>
            <Contagem />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventarios/:id/recontagem"
        element={
          <ProtectedRoute>
            <Recontagem />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventarios/:id/divergencias"
        element={
          <ProtectedRoute>
            <Divergencias />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventarios/:id/auditoria"
        element={
          <ProtectedRoute>
            <Auditoria />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Relatorios />
          </ProtectedRoute>
        }
      />
      <Route path="/relatorios" element={<Navigate to="/dashboard" replace />} />

      <Route path="/reset-password" element={<Navigate to="/login" replace />} />
      <Route path="/onboarding" element={<Navigate to="/login" replace />} />
      <Route path="/usuarios" element={<Navigate to="/estoque" replace />} />
      <Route path="/configuracoes/*" element={<Navigate to="/estoque" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

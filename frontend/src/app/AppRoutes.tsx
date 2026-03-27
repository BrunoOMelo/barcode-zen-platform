import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auditoria from "@/pages/Auditoria";
import Contagem from "@/pages/Contagem";
import CriarInventario from "@/pages/CriarInventario";
import Divergencias from "@/pages/Divergencias";
import EmpresaConfig from "@/pages/EmpresaConfig";
import Estoque from "@/pages/Estoque";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Recontagem from "@/pages/Recontagem";
import Relatorios from "@/pages/Relatorios";
import ResetPassword from "@/pages/ResetPassword";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
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
        path="/relatorios"
        element={
          <ProtectedRoute>
            <Relatorios />
          </ProtectedRoute>
        }
      />
      <Route path="/usuarios" element={<Navigate to="/configuracoes" replace />} />
      <Route
        path="/configuracoes/*"
        element={
          <ProtectedRoute>
            <EmpresaConfig />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

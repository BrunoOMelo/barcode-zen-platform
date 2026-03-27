import { AppLayout } from "@/components/layout/AppLayout";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ConfigMenu } from "@/components/configuracoes/ConfigMenu";
import { EmpresaTab } from "@/components/configuracoes/EmpresaTab";
import { UsuariosTab } from "@/components/configuracoes/UsuariosTab";
import { PerfisAcessoTab } from "@/components/configuracoes/PerfisAcessoTab";
import { MeuPerfilTab } from "@/components/configuracoes/MeuPerfilTab";

const subTitles: Record<string, string> = {
  "/configuracoes/empresa": "Dados da Empresa",
  "/configuracoes/usuarios": "Usuários",
  "/configuracoes/perfis": "Perfis de Acesso",
  "/configuracoes/meu-perfil": "Meu Perfil",
};

export default function EmpresaConfig() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSubPage = location.pathname !== "/configuracoes";
  const subTitle = subTitles[location.pathname];

  return (
    <AppLayout title={subTitle ? `Configurações › ${subTitle}` : "Configurações"}>
      {isSubPage && (
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      )}
      <Routes>
        <Route index element={<ConfigMenu />} />
        <Route path="empresa" element={<EmpresaTab />} />
        <Route path="usuarios" element={<UsuariosTab />} />
        <Route path="perfis" element={<PerfisAcessoTab />} />
        <Route path="meu-perfil" element={<MeuPerfilTab />} />
      </Routes>
    </AppLayout>
  );
}

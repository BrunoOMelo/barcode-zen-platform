import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const menuItems = [
  {
    key: "empresa",
    label: "Dados da Empresa",
    description: "Atualize as informações da empresa e do responsável",
    icon: Building2,
    path: "/configuracoes/empresa",
  },
  {
    key: "usuarios",
    label: "Usuários",
    description: "Gerencie os usuários, convide novos e compartilhe entre empresas",
    icon: Users,
    path: "/configuracoes/usuarios",
  },
  {
    key: "perfis",
    label: "Perfis de Acesso",
    description: "Crie e gerencie perfis com permissões por módulo",
    icon: Shield,
    path: "/configuracoes/perfis",
  },
  {
    key: "meu-perfil",
    label: "Meu Perfil",
    description: "Atualize seus dados pessoais e endereço",
    icon: User,
    path: "/configuracoes/meu-perfil",
  },
];

export function ConfigMenu() {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {menuItems.map((item) => (
        <Card
          key={item.key}
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => navigate(item.path)}
        >
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <item.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">{item.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

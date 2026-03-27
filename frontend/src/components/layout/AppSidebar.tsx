import {
  LayoutDashboard,
  Package,
  FileBarChart,
  Settings,
} from "lucide-react";
import ninjaLogo from "@/assets/ninja-logo.jpg";
import { useNavigate, useLocation } from "react-router-dom";

import { EmpresaSwitcher } from "@/components/layout/EmpresaSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Inventário", icon: Package, path: "/estoque" },
  { title: "Relatórios", icon: FileBarChart, path: "/relatorios" },
  { title: "Configurações", icon: Settings, path: "/configuracoes" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={ninjaLogo} alt="Ninja Stock" className="h-12 w-12 rounded-lg object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground">Ninja Stock</span>
            <span className="text-xs text-sidebar-foreground/60">Gestão de Inventário</span>
          </div>
        </div>
        <div className="mt-3">
          <EmpresaSwitcher />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={
                      item.path === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.path)
                    }
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}

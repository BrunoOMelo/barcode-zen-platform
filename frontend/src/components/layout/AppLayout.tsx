import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { UserAvatar } from "@/components/UserAvatar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { clearPlatformSession } from "@/platform/storage";
import { usePlatformSessionContext } from "@/platform/usePlatformSession";
import { LogOut } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const navigate = useNavigate();
  const { me } = usePlatformSessionContext();

  const handleLogout = () => {
    clearPlatformSession();
    navigate("/platform/login", { replace: true });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card px-4">
          <SidebarTrigger className="hidden md:flex" />
          {title && <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{me?.email ?? me?.user_id}</span>
            <UserAvatar nome={me?.email ?? "Usuario"} fotoUrl={null} />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

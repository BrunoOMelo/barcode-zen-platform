import { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { data: profile } = useProfile();
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card px-4">
          <SidebarTrigger className="hidden md:flex" />
          {title && <h1 className="text-lg font-semibold truncate flex-1">{title}</h1>}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{profile?.apelido || profile?.nome}</span>
            <UserAvatar nome={profile?.nome} fotoUrl={profile?.foto_perfil_url} />
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="text-muted-foreground hover:text-destructive">
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

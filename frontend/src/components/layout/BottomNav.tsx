import { LayoutDashboard, Package, FileBarChart, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Settings } from "lucide-react";

const tabs = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Inventário", icon: Package, path: "/estoque" },
  { title: "Relatórios", icon: FileBarChart, path: "/relatorios" },
  { title: "Mais", icon: Menu, path: "__more__" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card md:hidden">
        {tabs.map((tab) => {
          if (tab.path === "__more__") {
            return (
              <Sheet key="more" open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground">
                    <tab.icon className="h-5 w-5" />
                    <span className="text-[10px]">{tab.title}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                  <div className="flex flex-col gap-2 pt-4">
                    <button
                      className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
                      onClick={() => { navigate("/configuracoes"); setMoreOpen(false); }}
                    >
                      <Settings className="h-5 w-5" />
                      <span>Configurações</span>
                    </button>
                    <button
                      className="flex items-center gap-3 rounded-lg p-3 text-left text-destructive hover:bg-muted"
                      onClick={signOut}
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sair</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 transition-colors",
                isActive(tab.path) ? "text-accent" : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.title}</span>
            </button>
          );
        })}
      </nav>
      {/* Spacer so content doesn't hide behind bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

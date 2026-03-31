import { LayoutDashboard, LogOut, Menu, Package } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { clearPlatformSession } from "@/platform/storage";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "Estoque", icon: Package, path: "/estoque" },
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Mais", icon: Menu, path: "__more__" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    clearPlatformSession();
    navigate("/login", { replace: true });
  };

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
                      className="flex items-center gap-3 rounded-lg p-3 text-left text-destructive hover:bg-muted"
                      onClick={handleLogout}
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
                isActive(tab.path) ? "text-accent" : "text-muted-foreground",
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.title}</span>
            </button>
          );
        })}
      </nav>
      <div className="h-16 md:hidden" />
    </>
  );
}

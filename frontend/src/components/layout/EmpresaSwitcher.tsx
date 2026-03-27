import { Building2, ChevronsUpDown } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useUserEmpresas, useSwitchEmpresa } from "@/hooks/useEmpresas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function EmpresaSwitcher() {
  const { data: profile } = useProfile();
  const { data: empresas } = useUserEmpresas();
  const switchEmpresa = useSwitchEmpresa();

  const current = empresas?.find((e: any) => e.id === profile?.empresa_id);
  const hasMultiple = (empresas?.length ?? 0) > 1;

  if (!hasMultiple) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium truncate">{current?.nome || "Empresa"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between gap-1 h-auto py-1.5 px-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium truncate">{current?.nome || "Empresa"}</span>
          </div>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {empresas?.map((emp: any) => (
          <DropdownMenuItem
            key={emp.id}
            onClick={() => switchEmpresa.mutate(emp.id)}
            className={emp.id === profile?.empresa_id ? "bg-accent" : ""}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{emp.nome}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

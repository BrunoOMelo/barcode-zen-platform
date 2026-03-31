import { Building2, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePlatformSessionContext } from "@/platform/usePlatformSession";
import { toast } from "sonner";

export function EmpresaSwitcher() {
  const { session, tenants, me, switchTenant, isSwitching } = usePlatformSessionContext();

  if (!session) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-medium">Empresa</span>
      </div>
    );
  }

  const current = tenants.find((tenant) => tenant.tenant_id === session.selectedTenantId) ?? tenants[0];
  const hasMultiple = tenants.length > 1;

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === session.selectedTenantId) return;
    try {
      await switchTenant(tenantId);
      toast.success("Empresa ativa atualizada.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao trocar empresa.";
      toast.error(message);
    }
  };

  if (!hasMultiple) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-medium">{current?.tenant_name || "Empresa"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button id="tenant-switch" variant="ghost" size="sm" className="h-auto w-full justify-between gap-1 px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs font-medium">{current?.tenant_name || "Empresa"}</span>
          </div>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.tenant_id}
            data-testid={`tenant-option-${tenant.tenant_id}`}
            onClick={() => void handleSwitch(tenant.tenant_id)}
            className={tenant.tenant_id === me?.tenant_id ? "bg-accent" : ""}
            disabled={isSwitching}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{tenant.tenant_name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

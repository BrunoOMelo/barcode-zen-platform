import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMeContext, listAvailableTenants, switchTenant } from "@/platform/api";
import { clearPlatformSession, loadPlatformSession, savePlatformSession } from "@/platform/storage";
import type { AvailableTenant, MeContext } from "@/platform/types";
import { toast } from "sonner";

export default function PlatformApp() {
  const navigate = useNavigate();
  const session = useMemo(() => loadPlatformSession(), []);
  const [tenants, setTenants] = useState<AvailableTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(session?.selectedTenantId ?? "");
  const [context, setContext] = useState<MeContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const boot = async () => {
      if (!session) {
        navigate("/platform/login", { replace: true });
        return;
      }

      setLoading(true);
      try {
        const fetchedTenants = await listAvailableTenants(session.apiBaseUrl, session.token);
        setTenants(fetchedTenants);

        const fallbackTenant = fetchedTenants.find((tenant) => tenant.tenant_id === session.selectedTenantId)
          ?? fetchedTenants.find((tenant) => tenant.is_default)
          ?? fetchedTenants[0];

        if (!fallbackTenant) {
          toast.error("Nenhuma empresa disponível para este usuário.");
          clearPlatformSession();
          navigate("/platform/login", { replace: true });
          return;
        }

        const meContext = await getMeContext(session.apiBaseUrl, session.token, fallbackTenant.tenant_id);
        setSelectedTenantId(fallbackTenant.tenant_id);
        setContext(meContext);
        savePlatformSession({
          apiBaseUrl: session.apiBaseUrl,
          token: session.token,
          selectedTenantId: fallbackTenant.tenant_id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao carregar contexto da plataforma.";
        toast.error(message);
        clearPlatformSession();
        navigate("/platform/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, [navigate, session]);

  const handleSwitchTenant = async () => {
    if (!session || !context || !selectedTenantId) {
      return;
    }
    if (selectedTenantId === context.tenant_id) {
      return;
    }

    setSwitching(true);
    try {
      await switchTenant(session.apiBaseUrl, session.token, context.tenant_id, selectedTenantId);
      const meContext = await getMeContext(session.apiBaseUrl, session.token, selectedTenantId);
      setContext(meContext);
      savePlatformSession({
        apiBaseUrl: session.apiBaseUrl,
        token: session.token,
        selectedTenantId,
      });
      toast.success("Empresa ativa atualizada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao trocar empresa.";
      toast.error(message);
      setSelectedTenantId(context.tenant_id);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    clearPlatformSession();
    navigate("/platform/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Carregando contexto da plataforma...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Contexto do Usuário</CardTitle>
          <CardDescription>Validação de autenticação e escopo multi-tenant no backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{context?.user_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">E-mail</p>
              <p className="text-sm">{context?.email ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tenant ID ativo</p>
              <p className="font-mono text-sm">{context?.tenant_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="text-sm">{context?.role}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Permissões</p>
            <div className="flex flex-wrap gap-2">
              {context?.permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar Empresa</CardTitle>
          <CardDescription>Selecione uma empresa disponível para o usuário autenticado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-switch">Empresa ativa</Label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger id="tenant-switch">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.tenant_name} ({tenant.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSwitchTenant} disabled={!context || switching || selectedTenantId === context.tenant_id}>
              {switching ? "Trocando..." : "Trocar empresa"}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/estoque")}>
              Abrir Estoque
            </Button>
            <Button variant="outline" onClick={handleLogout}>Sair</Button>
            <Button variant="ghost" onClick={() => window.open(`${session?.apiBaseUrl}/docs`, "_blank")}>
              Abrir Swagger
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

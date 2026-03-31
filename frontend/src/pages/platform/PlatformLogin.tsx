import { type FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ninjaLogo from "@/assets/ninja-logo.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getMeContext, listAvailableTenants, loginWithPassword } from "@/platform/api";
import { loadPlatformSession, savePlatformSession } from "@/platform/storage";
import type { AvailableTenant } from "@/platform/types";
import { toast } from "sonner";

type LoginMode = "credentials" | "token";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_PLATFORM_API_BASE_URL ?? "http://localhost:8000";
const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function PlatformLogin() {
  const navigate = useNavigate();
  const currentSession = useMemo(() => loadPlatformSession(), []);
  const [apiBaseUrl, setApiBaseUrl] = useState(currentSession?.apiBaseUrl ?? DEFAULT_API_BASE_URL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(currentSession?.token ?? "");
  const [mode, setMode] = useState<LoginMode>("credentials");
  const [tenants, setTenants] = useState<AvailableTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(currentSession?.selectedTenantId ?? "");
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const applyTenantSelection = (loadedTenants: AvailableTenant[], preferredTenantId?: string) => {
    if (loadedTenants.length === 0) {
      toast.error("Nenhuma empresa ativa encontrada para este usuario.");
      setTenants([]);
      setSelectedTenantId("");
      setTenantModalOpen(false);
      return;
    }

    const preferred =
      loadedTenants.find((tenant) => tenant.tenant_id === preferredTenantId) ??
      loadedTenants.find((tenant) => tenant.is_default) ??
      loadedTenants[0];

    setTenants(loadedTenants);
    setSelectedTenantId(preferred.tenant_id);
    setTenantSearch("");
    setTenantModalOpen(true);
  };

  const filteredTenants = useMemo(() => {
    const query = normalizeText(tenantSearch.trim());
    if (!query) return tenants;
    return tenants.filter((tenant) => {
      const searchable = normalizeText(
        `${tenant.tenant_name} ${tenant.tenant_slug} ${tenant.role} ${tenant.tenant_id}`,
      );
      return searchable.includes(query);
    });
  }, [tenantSearch, tenants]);

  const handleCredentialsLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Informe e-mail e senha para continuar.");
      return;
    }

    setLoadingCredentials(true);
    try {
      const response = await loginWithPassword(apiBaseUrl, {
        email: email.trim(),
        password,
      });
      setToken(response.access_token);
      applyTenantSelection(response.available_tenants, response.default_tenant_id);
      toast.success("Acesso validado. Selecione a empresa para continuar.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao autenticar usuario.";
      toast.error(message);
      setTenants([]);
      setSelectedTenantId("");
      setTenantModalOpen(false);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleLoadTenantsFromToken = async (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) {
      toast.error("Informe o token de acesso.");
      return;
    }

    setLoadingTenants(true);
    try {
      const loadedTenants = await listAvailableTenants(apiBaseUrl, token.trim());
      applyTenantSelection(loadedTenants);
      toast.success("Empresas carregadas com sucesso.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao carregar empresas.";
      toast.error(message);
      setTenants([]);
      setSelectedTenantId("");
      setTenantModalOpen(false);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleEnter = async () => {
    if (!selectedTenantId) {
      toast.error("Selecione uma empresa para continuar.");
      return;
    }
    if (!token.trim()) {
      toast.error("Token de acesso nao encontrado. Faca login novamente.");
      return;
    }

    setSubmitting(true);
    try {
      await getMeContext(apiBaseUrl, token.trim(), selectedTenantId);
      savePlatformSession({
        apiBaseUrl: apiBaseUrl.trim(),
        token: token.trim(),
        selectedTenantId,
      });
      setTenantModalOpen(false);
      navigate("/estoque", { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao validar contexto da empresa.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={ninjaLogo} alt="Ninja Stock" className="mx-auto mb-4 h-24 w-24 rounded-xl object-contain" />
          <CardTitle className="text-2xl font-bold">Ninja Stock Platform</CardTitle>
          <CardDescription>Valide seu acesso e selecione a empresa para continuar.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiBaseUrl">URL do backend</Label>
            <Input
              id="apiBaseUrl"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="http://localhost:8000"
              required
            />
          </div>

          <Tabs value={mode} onValueChange={(value) => setMode(value as LoginMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credentials">Conta</TabsTrigger>
              <TabsTrigger value="token">Token</TabsTrigger>
            </TabsList>

            <TabsContent value="credentials" className="mt-4">
              <form className="space-y-4" onSubmit={handleCredentialsLogin}>
                <div className="space-y-2">
                  <Label htmlFor="email">Usuario (e-mail)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Informe sua senha"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loadingCredentials}>
                  {loadingCredentials ? "Validando..." : "Validar acesso"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="token" className="mt-4">
              <form className="space-y-4" onSubmit={handleLoadTenantsFromToken}>
                <div className="space-y-2">
                  <Label htmlFor="token">Token JWT</Label>
                  <Textarea
                    id="token"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    rows={5}
                    placeholder="Cole aqui o token Bearer"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loadingTenants}>
                  {loadingTenants ? "Carregando..." : "Carregar empresas"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>

      <Dialog open={tenantModalOpen} onOpenChange={setTenantModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Selecionar empresa</DialogTitle>
            <DialogDescription>
              Escolha a empresa que voce deseja acessar nesta sessao.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="tenant-search">Buscar empresa</Label>
            <Input
              id="tenant-search"
              value={tenantSearch}
              onChange={(event) => setTenantSearch(event.target.value)}
              placeholder="Digite nome, slug, perfil ou ID..."
            />
            <p className="text-xs text-muted-foreground">
              {filteredTenants.length} de {tenants.length} empresa(s)
            </p>
          </div>

          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {filteredTenants.map((tenant) => {
              const isSelected = selectedTenantId === tenant.tenant_id;
              return (
                <button
                  key={tenant.tenant_id}
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:bg-muted/40"
                  }`}
                  onClick={() => setSelectedTenantId(tenant.tenant_id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{tenant.tenant_name}</p>
                    <Badge variant={tenant.is_default ? "default" : "secondary"}>
                      {tenant.is_default ? "Padrao" : tenant.role}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Perfil: {tenant.role} | ID: {tenant.tenant_slug}
                  </p>
                </button>
              );
            })}
            {filteredTenants.length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Nenhuma empresa encontrada para este filtro.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTenantModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnter} disabled={!selectedTenantId || !token || submitting}>
              {submitting ? "Entrando..." : "Entrar no sistema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

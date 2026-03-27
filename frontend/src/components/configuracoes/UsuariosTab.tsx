import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Share2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import {
  useUsuarios, useUpdateUserRole, useToggleUserActive,
} from "@/hooks/useUsuarios";
import { usePerfisAcesso } from "@/hooks/usePerfisAcesso";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function UsuariosTab() {
  const { data: usuarios, isLoading } = useUsuarios();
  const { data: perfis } = usePerfisAcesso();
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUserId, setShareUserId] = useState("");
  const [shareEmpresaId, setShareEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Invite form state
  const [form, setForm] = useState({
    nome: "", cpf: "", rg: "", apelido: "", email: "", celular: "",
    logradouro: "", numero: "", complemento: "", cep: "", bairro: "", cidade: "", estado: "",
    perfil_acesso_id: "",
  });

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const resetForm = () =>
    setForm({
      nome: "", cpf: "", rg: "", apelido: "", email: "", celular: "",
      logradouro: "", numero: "", complemento: "", cep: "", bairro: "", cidade: "", estado: "",
      perfil_acesso_id: "",
    });

  const handleInvite = async () => {
    if (!form.email || !profile?.empresa_id) return;
    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: form.email,
          nome: form.nome,
          role: "operador",
          extra: {
            cpf: form.cpf, rg: form.rg, apelido: form.apelido,
            celular: form.celular, logradouro: form.logradouro,
            numero: form.numero, complemento: form.complemento,
            cep: form.cep, bairro: form.bairro, cidade: form.cidade,
            estado: form.estado, perfil_acesso_id: form.perfil_acesso_id || null,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || "Usuário convidado!");
      if (data?.temp_password) {
        toast.info(`Senha temporária: ${data.temp_password}`, { duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setInviteOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const openShare = async (userId: string) => {
    setShareUserId(userId);
    // Load all empresas to select from
    const { data } = await supabase.from("empresas").select("id, nome").order("nome");
    setEmpresas((data ?? []).filter((e) => e.id !== profile?.empresa_id));
    setShareOpen(true);
  };

  const handleShare = async () => {
    if (!shareUserId || !shareEmpresaId) return;
    try {
      // Link user to another empresa
      const { error } = await supabase.from("user_empresas").insert({
        user_id: shareUserId,
        empresa_id: shareEmpresaId,
      });
      if (error) throw error;
      toast.success("Usuário compartilhado com a empresa!");
      setShareOpen(false);
      setShareEmpresaId("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Gerencie os usuários da empresa</p>
        <Button size="sm" onClick={() => { resetForm(); setInviteOpen(true); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : !usuarios?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhum usuário encontrado</h3>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => {
                    const currentRole = u.user_roles?.[0]?.role ?? "operador";
                    const isCurrentUser = u.user_id === user?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <UserAvatar nome={u.nome} fotoUrl={u.foto_perfil_url} className="h-7 w-7" />
                            <span>
                              {u.nome || "—"}
                              {isCurrentUser && <Badge variant="outline" className="ml-2 text-[10px]">Você</Badge>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select
                            value={currentRole}
                            onValueChange={(val) => updateRole.mutate({ userId: u.user_id, role: val as any })}
                            disabled={isCurrentUser}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="operador">Operador</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.ativo}
                            onCheckedChange={(checked) => toggleActive.mutate({ userId: u.user_id, ativo: checked })}
                            disabled={isCurrentUser}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openShare(u.user_id)} title="Compartilhar com outra empresa">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {usuarios.map((u) => {
              const currentRole = u.user_roles?.[0]?.role ?? "operador";
              const isCurrentUser = u.user_id === user?.id;
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <UserAvatar nome={u.nome} fotoUrl={u.foto_perfil_url} className="h-8 w-8" />
                      <div>
                        <p className="font-medium truncate">
                          {u.nome || "—"}
                          {isCurrentUser && <Badge variant="outline" className="ml-2 text-[10px]">Você</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openShare(u.user_id)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={u.ativo}
                        onCheckedChange={(checked) => toggleActive.mutate({ userId: u.user_id, ativo: checked })}
                        disabled={isCurrentUser}
                      />
                    </div>
                  </div>
                  <Select
                    value={currentRole}
                    onValueChange={(val) => updateRole.mutate({ userId: u.user_id, role: val as any })}
                    disabled={isCurrentUser}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => updateForm("nome", e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <MaskedInput mask="cpf" value={form.cpf} onValueChange={(v) => updateForm("cpf", v)} />
              </div>
              <div className="space-y-2">
                <Label>RG</Label>
                <Input value={form.rg} onChange={(e) => updateForm("rg", e.target.value)} placeholder="RG" />
              </div>
              <div className="space-y-2">
                <Label>Apelido</Label>
                <Input value={form.apelido} onChange={(e) => updateForm("apelido", e.target.value)} placeholder="Apelido" />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="usuario@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <MaskedInput mask="celular" value={form.celular} onValueChange={(v) => updateForm("celular", v)} />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Endereço</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Logradouro</Label>
                  <Input value={form.logradouro} onChange={(e) => updateForm("logradouro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nº</Label>
                  <Input value={form.numero} onChange={(e) => updateForm("numero", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.complemento} onChange={(e) => updateForm("complemento", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <MaskedInput mask="cep" value={form.cep} onValueChange={(v) => updateForm("cep", v)} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.bairro} onChange={(e) => updateForm("bairro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => updateForm("cidade", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={form.estado} onChange={(e) => updateForm("estado", e.target.value)} maxLength={2} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select value={form.perfil_acesso_id} onValueChange={(v) => updateForm("perfil_acesso_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {perfis?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={inviteLoading || !form.email || !form.nome}>
                {inviteLoading ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione a empresa</Label>
              <Select value={shareEmpresaId} onValueChange={setShareEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShareOpen(false)}>Cancelar</Button>
              <Button onClick={handleShare} disabled={!shareEmpresaId}>Compartilhar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

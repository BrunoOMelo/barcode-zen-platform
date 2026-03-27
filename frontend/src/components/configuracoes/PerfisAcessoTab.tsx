import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  usePerfisAcesso, useCreatePerfil, useUpdatePerfil, useDeletePerfil,
  MODULOS, MODULO_LABELS, type Permissao, type PerfilAcesso,
} from "@/hooks/usePerfisAcesso";

function emptyPermissoes(): Permissao[] {
  return MODULOS.map((m) => ({
    modulo: m,
    pode_ler: false,
    pode_alterar: false,
    pode_excluir: false,
    pode_compartilhar: false,
  }));
}

export function PerfisAcessoTab() {
  const { data: perfis, isLoading } = usePerfisAcesso();
  const createPerfil = useCreatePerfil();
  const updatePerfil = useUpdatePerfil();
  const deletePerfil = useDeletePerfil();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<PerfilAcesso | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [permissoes, setPermissoes] = useState<Permissao[]>(emptyPermissoes());

  const openCreate = () => {
    setEditingPerfil(null);
    setNome("");
    setDescricao("");
    setPermissoes(emptyPermissoes());
    setDialogOpen(true);
  };

  const openEdit = (perfil: PerfilAcesso) => {
    setEditingPerfil(perfil);
    setNome(perfil.nome);
    setDescricao(perfil.descricao || "");
    const perms = MODULOS.map((m) => {
      const existing = perfil.permissoes.find((p) => p.modulo === m);
      return existing
        ? { ...existing }
        : { modulo: m, pode_ler: false, pode_alterar: false, pode_excluir: false, pode_compartilhar: false };
    });
    setPermissoes(perms);
    setDialogOpen(true);
  };

  const togglePerm = (modulo: string, field: keyof Permissao) => {
    setPermissoes((prev) =>
      prev.map((p) =>
        p.modulo === modulo ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleSave = async () => {
    if (!nome.trim()) return;
    if (editingPerfil) {
      await updatePerfil.mutateAsync({ id: editingPerfil.id, nome, descricao, permissoes });
    } else {
      await createPerfil.mutateAsync({ nome, descricao, permissoes });
    }
    setDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Crie perfis com permissões por módulo</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Perfil
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : !perfis?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhum perfil criado</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie perfis de acesso para controlar permissões</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {perfis.map((perfil) => (
            <Card key={perfil.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{perfil.nome}</h4>
                  {perfil.descricao && (
                    <p className="text-xs text-muted-foreground">{perfil.descricao}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(perfil)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Usuários vinculados ficarão sem perfil.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePerfil.mutate(perfil.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="text-center">Ler</TableHead>
                      <TableHead className="text-center">Alterar</TableHead>
                      <TableHead className="text-center">Excluir</TableHead>
                      <TableHead className="text-center">Compartilhar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULOS.map((mod) => {
                      const perm = perfil.permissoes.find((p) => p.modulo === mod);
                      return (
                        <TableRow key={mod}>
                          <TableCell className="font-medium">{MODULO_LABELS[mod]}</TableCell>
                          <TableCell className="text-center">{perm?.pode_ler ? "✓" : "—"}</TableCell>
                          <TableCell className="text-center">{perm?.pode_alterar ? "✓" : "—"}</TableCell>
                          <TableCell className="text-center">{perm?.pode_excluir ? "✓" : "—"}</TableCell>
                          <TableCell className="text-center">{perm?.pode_compartilhar ? "✓" : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPerfil ? "Editar Perfil" : "Novo Perfil de Acesso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome do perfil *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Gerente" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Permissões por módulo</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="text-center">Ler</TableHead>
                      <TableHead className="text-center">Alterar</TableHead>
                      <TableHead className="text-center">Excluir</TableHead>
                      <TableHead className="text-center">Compartilhar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissoes.map((perm) => (
                      <TableRow key={perm.modulo}>
                        <TableCell className="font-medium">
                          {MODULO_LABELS[perm.modulo as keyof typeof MODULO_LABELS]}
                        </TableCell>
                        {(["pode_ler", "pode_alterar", "pode_excluir", "pode_compartilhar"] as const).map((field) => (
                          <TableCell key={field} className="text-center">
                            <Checkbox
                              checked={perm[field] as boolean}
                              onCheckedChange={() => togglePerm(perm.modulo, field)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={!nome.trim() || createPerfil.isPending || updatePerfil.isPending}
              >
                {editingPerfil ? "Salvar" : "Criar Perfil"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

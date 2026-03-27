import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Upload, Download, Package, MoreHorizontal, Pencil, Trash2,
  ChevronLeft, ChevronRight, ClipboardList, Play, Eye,
} from "lucide-react";
import { useProdutos, useDeleteProduto, type Produto } from "@/hooks/useProdutos";
import { ProdutoFormDialog } from "@/components/produtos/ProdutoFormDialog";
import { ImportProdutosDialog } from "@/components/produtos/ImportProdutosDialog";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useInventarios, useUpdateInventarioStatus } from "@/hooks/useInventarios";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { downloadPlanilhaPadrao } from "@/lib/template";

const PAGE_SIZE = 50;

const statusLabels: Record<string, string> = {
  criado: "Criado",
  em_contagem: "Em Contagem",
  em_recontagem: "Em Recontagem",
  em_analise: "Em Análise",
  finalizado: "Finalizado",
};

const statusColors: Record<string, string> = {
  criado: "secondary",
  em_contagem: "default",
  em_recontagem: "default",
  em_analise: "destructive",
  finalizado: "outline",
};

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useProdutos({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  });

  const deleteProduto = useDeleteProduto();
  const { data: inventarios, isLoading: loadingInv } = useInventarios();
  const updateStatus = useUpdateInventarioStatus();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Auto-create empresa for first user
  useEffect(() => {
    if (profile && !profile.empresa_id && user) {
      const createDefaultEmpresa = async () => {
        const { data: empresa, error } = await supabase
          .from("empresas")
          .insert({ nome: "Minha Empresa" })
          .select()
          .single();
        if (!error && empresa) {
          await supabase
            .from("profiles")
            .update({ empresa_id: empresa.id })
            .eq("user_id", user.id);
          toast.success("Empresa criada automaticamente");
          window.location.reload();
        }
      };
      createDefaultEmpresa();
    }
  }, [profile, user]);

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingProduto(null);
    setFormOpen(true);
  };

  const handleIniciarContagem = async (id: string) => {
    await updateStatus.mutateAsync({ id, status: "em_contagem" });
    navigate(`/inventarios/${id}/contagem`);
  };

  return (
    <AppLayout title="Estoque & Inventário">
      <Tabs defaultValue="produtos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="produtos" className="gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="inventarios" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Inventários
          </TabsTrigger>
        </TabsList>

        {/* ====== TAB PRODUTOS ====== */}
        <TabsContent value="produtos" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU, código ou descrição..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadPlanilhaPadrao}>
                <Download className="mr-2 h-4 w-4" />
                Planilha Padrão
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
              <Button size="sm" onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Carregando produtos...
              </CardContent>
            </Card>
          ) : !data?.data.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold">
                  {debouncedSearch ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {debouncedSearch
                    ? "Tente uma busca diferente."
                    : "Baixe a planilha padrão, preencha e importe seus produtos."}
                </p>
                {!debouncedSearch && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadPlanilhaPadrao}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Planilha
                    </Button>
                    <Button size="sm" onClick={() => setImportOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Importar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Cód. Barras</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.data.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell className="font-medium">{produto.descricao}</TableCell>
                          <TableCell className="font-mono text-sm">{produto.sku || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{produto.codigo_barras || "—"}</TableCell>
                          <TableCell>{(produto as any).marca || "—"}</TableCell>
                          <TableCell>{produto.categoria || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={produto.ativo ? "default" : "secondary"}>
                              {produto.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(produto)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteProduto.mutate(produto.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {data.data.map((produto) => (
                  <Card key={produto.id} className="p-3" onClick={() => handleEdit(produto)}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{produto.descricao}</p>
                        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                          {produto.sku && <span>SKU: {produto.sku}</span>}
                          {produto.codigo_barras && <span>EAN: {produto.codigo_barras}</span>}
                          {(produto as any).marca && <span>{(produto as any).marca}</span>}
                        </div>
                      </div>
                      <Badge variant={produto.ativo ? "default" : "secondary"} className="ml-2 shrink-0">
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {data.count} produto{data.count !== 1 ? "s" : ""} • Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ====== TAB INVENTÁRIOS ====== */}
        <TabsContent value="inventarios" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gerencie seus inventários de estoque</p>
            <Button size="sm" onClick={() => navigate("/inventarios/criar")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Inventário
            </Button>
          </div>

          {loadingInv ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : !inventarios?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold">Nenhum inventário criado</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie um inventário para iniciar a contagem de estoque.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inventarios.map((inv) => (
                <Card key={inv.id} className="overflow-hidden">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{inv.nome}</h3>
                        <Badge variant={statusColors[inv.status] as any}>
                          {statusLabels[inv.status] || inv.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Criado em{" "}
                        {format(new Date(inv.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {inv.status === "criado" && (
                        <Button size="sm" onClick={() => handleIniciarContagem(inv.id)} disabled={updateStatus.isPending}>
                          <Play className="mr-1 h-4 w-4" />
                          Iniciar Contagem
                        </Button>
                      )}
                      {(inv.status === "em_contagem" || inv.status === "em_recontagem") && (
                        <Button size="sm" onClick={() => navigate(`/inventarios/${inv.id}/contagem`)}>
                          <Play className="mr-1 h-4 w-4" />
                          Continuar
                        </Button>
                      )}
                      {inv.status === "em_analise" && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/inventarios/${inv.id}/divergencias`)}>
                          <Eye className="mr-1 h-4 w-4" />
                          Divergências
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/inventarios/${inv.id}/auditoria`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProdutoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        produto={editingProduto}
        key={editingProduto?.id ?? "new"}
      />
      <ImportProdutosDialog open={importOpen} onOpenChange={setImportOpen} />
    </AppLayout>
  );
}

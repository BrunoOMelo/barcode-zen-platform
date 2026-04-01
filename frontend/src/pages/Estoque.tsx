import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ImportProdutosDialog } from "@/components/produtos/ImportProdutosDialog";
import { ProdutoFormDialog } from "@/components/produtos/ProdutoFormDialog";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteProduto, useProdutos, type Produto } from "@/hooks/useProdutos";
import { useInventarios, useUpdateInventarioStatus } from "@/hooks/useInventarios";
import { downloadPlanilhaPadrao } from "@/lib/template";

const PAGE_SIZE = 50;

const statusLabels: Record<string, string> = {
  criado: "Criado",
  em_contagem: "Em contagem",
  em_recontagem: "Em recontagem",
  em_analise: "Em analise",
  finalizado: "Finalizado",
};

const statusBadgeVariant: Record<string, BadgeProps["variant"]> = {
  criado: "secondary",
  em_contagem: "default",
  em_recontagem: "default",
  em_analise: "destructive",
  finalizado: "outline",
};

export default function Estoque() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

  const { data: productsData, isLoading: loadingProducts } = useProdutos({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: inventories, isLoading: loadingInventories } = useInventarios();
  const deleteProduto = useDeleteProduto();
  const updateInventoryStatus = useUpdateInventarioStatus();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil((productsData?.count ?? 0) / PAGE_SIZE);
  const productRows = useMemo(() => productsData?.data ?? [], [productsData?.data]);

  const operationalKpis = useMemo(() => {
    const totalProducts = productsData?.count ?? 0;
    const activeProducts = productRows.filter((product) => product.ativo).length;
    const activeInventories =
      inventories?.filter((inventory) => inventory.status !== "finalizado").length ?? 0;
    const finishedInventories =
      inventories?.filter((inventory) => inventory.status === "finalizado").length ?? 0;
    return {
      totalProducts,
      activeProducts,
      activeInventories,
      finishedInventories,
    };
  }, [inventories, productRows, productsData?.count]);

  const handleEdit = (product: Produto) => {
    setEditingProduto(product);
    setFormOpen(true);
  };

  const handleCreateProduct = () => {
    setEditingProduto(null);
    setFormOpen(true);
  };

  const handleStartCount = async (inventoryId: string) => {
    await updateInventoryStatus.mutateAsync({ id: inventoryId, status: "em_contagem" });
    navigate(`/inventarios/${inventoryId}/contagem`);
  };

  return (
    <AppLayout title="Operacao de estoque e inventario">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
              <p className="text-2xl font-semibold">{loadingProducts ? "..." : operationalKpis.totalProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Produtos ativos</p>
              <p className="text-2xl font-semibold">{loadingProducts ? "..." : operationalKpis.activeProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Inventarios ativos</p>
              <p className="text-2xl font-semibold">{loadingInventories ? "..." : operationalKpis.activeInventories}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Inventarios finalizados</p>
              <p className="text-2xl font-semibold">{loadingInventories ? "..." : operationalKpis.finishedInventories}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="produtos" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="produtos" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="inventarios" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Inventarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU, codigo ou descricao..."
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={downloadPlanilhaPadrao}>
                  <Download className="mr-2 h-4 w-4" />
                  Planilha padrao
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </Button>
                <Button size="sm" onClick={handleCreateProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo produto
                </Button>
              </div>
            </div>

            {loadingProducts ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">Carregando produtos...</CardContent>
              </Card>
            ) : productRows.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <h3 className="text-lg font-semibold">
                    {debouncedSearch ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {debouncedSearch
                      ? "Tente uma busca diferente."
                      : "Baixe a planilha padrao, preencha e importe seus produtos."}
                  </p>
                  {!debouncedSearch ? (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadPlanilhaPadrao}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar planilha
                      </Button>
                      <Button size="sm" onClick={() => setImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="hidden md:block">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descricao</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Cod. barras</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productRows.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.descricao}</TableCell>
                            <TableCell className="font-mono text-sm">{product.sku || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{product.codigo_barras || "-"}</TableCell>
                            <TableCell>{product.marca || "-"}</TableCell>
                            <TableCell>{product.categoria || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={product.ativo ? "default" : "secondary"}>
                                {product.ativo ? "Ativo" : "Inativo"}
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
                                  <DropdownMenuItem onClick={() => handleEdit(product)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => deleteProduto.mutate(product.id)}
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

                <div className="space-y-2 md:hidden">
                  {productRows.map((product) => (
                    <Card key={product.id} className="cursor-pointer p-3" onClick={() => handleEdit(product)}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{product.descricao}</p>
                          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                            {product.sku ? <span>SKU: {product.sku}</span> : null}
                            {product.codigo_barras ? <span>EAN: {product.codigo_barras}</span> : null}
                            {product.marca ? <span>{product.marca}</span> : null}
                          </div>
                        </div>
                        <Badge variant={product.ativo ? "default" : "secondary"} className="ml-2 shrink-0">
                          {product.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {productsData?.count ?? 0} produto{(productsData?.count ?? 0) !== 1 ? "s" : ""} -
                      pagina {page + 1} de {totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page === 0}
                        onClick={() => setPage((current) => current - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>

          <TabsContent value="inventarios" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerencie seus inventarios operacionais.</p>
              <Button size="sm" onClick={() => navigate("/inventarios/criar")}>
                <Plus className="mr-2 h-4 w-4" />
                Novo inventario
              </Button>
            </div>

            {loadingInventories ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">Carregando inventarios...</CardContent>
              </Card>
            ) : !inventories?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <h3 className="text-lg font-semibold">Nenhum inventario criado</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Crie um inventario para iniciar a contagem de estoque.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {inventories.map((inventory) => (
                  <Card key={inventory.id} className="overflow-hidden" data-testid={`inventory-card-${inventory.id}`}>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold">{inventory.nome}</h3>
                          <Badge variant={statusBadgeVariant[inventory.status]}>
                            {statusLabels[inventory.status] || inventory.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Criado em {format(new Date(inventory.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {inventory.status === "criado" ? (
                          <Button
                            data-testid={`inventory-start-count-${inventory.id}`}
                            size="sm"
                            onClick={() => handleStartCount(inventory.id)}
                            disabled={updateInventoryStatus.isPending}
                          >
                            <Play className="mr-1 h-4 w-4" />
                            Iniciar contagem
                          </Button>
                        ) : null}
                        {inventory.status === "em_contagem" || inventory.status === "em_recontagem" ? (
                          <Button
                            data-testid={`inventory-continue-count-${inventory.id}`}
                            size="sm"
                            onClick={() => navigate(`/inventarios/${inventory.id}/contagem`)}
                          >
                            <Play className="mr-1 h-4 w-4" />
                            Continuar
                          </Button>
                        ) : null}
                        {inventory.status === "em_analise" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/inventarios/${inventory.id}/divergencias`)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Divergencias
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/inventarios/${inventory.id}/auditoria`)}>
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
      </div>

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

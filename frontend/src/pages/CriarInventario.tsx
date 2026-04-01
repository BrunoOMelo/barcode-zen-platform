import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateInventario } from "@/hooks/useInventarios";
import { useProdutos, type Produto } from "@/hooks/useProdutos";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

export default function CriarInventario() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [nome, setNome] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [estoques, setEstoques] = useState<Record<string, number>>({});
  const [quantidades, setQuantidades] = useState<Record<string, number | null>>({});

  const { data: produtosData, isLoading } = useProdutos({ search, pageSize: 100, ativo: true });
  const createInventario = useCreateInventario();

  const produtos = produtosData?.data ?? [];
  const selectedProdutos = produtos.filter((product) => selectedIds.has(product.id));

  const toggleProduto = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (produtos.length === 0) {
      return;
    }

    if (selectedIds.size === produtos.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(produtos.map((product) => product.id)));
  };

  const resolveDefaultSystemQuantity = (produto: Produto): number => {
    const draftValue = estoques[produto.id];
    if (draftValue !== undefined) {
      return Math.max(0, Number(draftValue));
    }
    return Math.max(0, Number(produto.quantidade ?? 0));
  };

  const handleCreate = async () => {
    if (!nome.trim()) {
      toast.error("Digite um nome para o inventario.");
      return;
    }

    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um produto.");
      return;
    }

    await createInventario.mutateAsync({
      nome,
      produtoIds: Array.from(selectedIds),
      estoques,
      quantidades,
    });

    navigate("/estoque");
  };

  return (
    <AppLayout title="Criar Inventario">
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((currentStep) => (
          <div key={currentStep} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                currentStep <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep < step ? <Check className="h-4 w-4" /> : currentStep}
            </div>
            {currentStep < 3 ? (
              <div className={`h-0.5 w-8 ${currentStep < step ? "bg-primary" : "bg-muted"}`} />
            ) : null}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Nome do Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Ex: Inventario Mensal - Marco 2026"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!nome.trim()}>
                Proximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Selecionar Produtos</CardTitle>
                <Badge variant="secondary">
                  {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="inventory-product-search"
                    placeholder="Buscar produtos..."
                    className="pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedIds.size === produtos.length ? "Desmarcar" : "Selecionar"} todos
                </Button>
              </div>

              {isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Carregando...</p>
              ) : (
                <div className="max-h-[400px] space-y-1 overflow-y-auto">
                  {produtos.map((produto) => (
                    <label
                      key={produto.id}
                      data-testid={`inventory-product-option-${produto.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-muted"
                    >
                      <Checkbox
                        data-testid={`inventory-product-checkbox-${produto.id}`}
                        checked={selectedIds.has(produto.id)}
                        onCheckedChange={() => toggleProduto(produto.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{produto.descricao}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {produto.sku ? <span>SKU: {produto.sku}</span> : null}
                          {produto.codigo_barras ? <span>EAN: {produto.codigo_barras}</span> : null}
                          <span>Saldo: {produto.quantidade}</span>
                        </div>
                      </div>
                    </label>
                  ))}

                  {produtos.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado. Cadastre produtos primeiro.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={() => setStep(3)} disabled={selectedIds.size === 0}>
              Proximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saldo Inicial e Quantidade</CardTitle>
              <p className="text-sm text-muted-foreground">
                <strong>Saldo inicial</strong> = estoque esperado no sistema.
                <strong> Quantidade</strong> = contagem fisica opcional para pre-preenchimento.
              </p>
            </CardHeader>
            <CardContent>
              <div className="hidden grid-cols-[1fr_100px_100px] gap-2 px-3 pb-2 text-xs font-medium text-muted-foreground sm:grid">
                <span>Produto</span>
                <span className="text-center">Saldo inicial</span>
                <span className="text-center">Quantidade</span>
              </div>
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {selectedProdutos.map((produto) => (
                  <div
                    key={produto.id}
                    data-testid={`inventory-step3-row-${produto.id}`}
                    className="flex flex-col items-start gap-2 rounded-lg p-3 hover:bg-muted sm:grid sm:grid-cols-[1fr_100px_100px] sm:items-center sm:gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{produto.descricao}</p>
                      <p className="text-xs text-muted-foreground">{produto.sku || produto.codigo_barras || "-"}</p>
                    </div>
                    <div className="flex w-full gap-2 sm:block sm:w-auto">
                      <div className="flex-1 text-xs text-muted-foreground sm:hidden">Saldo inicial</div>
                      <Input
                        data-testid={`inventory-step3-system-${produto.id}`}
                        type="number"
                        className="w-full text-center sm:w-24"
                        min={0}
                        placeholder="0"
                        value={resolveDefaultSystemQuantity(produto)}
                        onChange={(event) =>
                          setEstoques((previous) => ({
                            ...previous,
                            [produto.id]: Number(event.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="flex w-full gap-2 sm:block sm:w-auto">
                      <div className="flex-1 text-xs text-muted-foreground sm:hidden">Quantidade</div>
                      <Input
                        data-testid={`inventory-step3-counted-${produto.id}`}
                        type="number"
                        className="w-full text-center sm:w-24"
                        min={0}
                        placeholder="-"
                        value={quantidades[produto.id] ?? ""}
                        onChange={(event) =>
                          setQuantidades((previous) => ({
                            ...previous,
                            [produto.id]: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={handleCreate} disabled={createInventario.isPending}>
              {createInventario.isPending ? "Criando..." : "Criar Inventario"}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import { useProdutos, type Produto } from "@/hooks/useProdutos";
import { useCreateInventario } from "@/hooks/useInventarios";
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

  const { data: produtosData, isLoading } = useProdutos({ search, pageSize: 200, ativo: true });
  const createInventario = useCreateInventario();

  const produtos = produtosData?.data ?? [];

  const toggleProduto = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === produtos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(produtos.map((p) => p.id)));
    }
  };

  const selectedProdutos = produtos.filter((p) => selectedIds.has(p.id));

  const handleCreate = async () => {
    if (!nome.trim()) {
      toast.error("Digite um nome para o inventário");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    const inventario = await createInventario.mutateAsync({
      nome,
      produtoIds: Array.from(selectedIds),
      estoques,
      quantidades,
    });

    navigate(`/estoque`);
  };

  return (
    <AppLayout title="Criar Inventário">
      {/* Steps indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                s <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`h-0.5 w-8 ${s < step ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Nome */}
      {step === 1 && (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Nome do Inventário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Ex: Inventário Mensal - Março 2026"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!nome.trim()}
              >
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Selecionar Produtos */}
      {step === 2 && (
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
                    placeholder="Buscar produtos..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedIds.size === produtos.length ? "Desmarcar" : "Selecionar"} todos
                </Button>
              </div>

              {isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Carregando...</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {produtos.map((produto) => (
                    <label
                      key={produto.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedIds.has(produto.id)}
                        onCheckedChange={() => toggleProduto(produto.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{produto.descricao}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {produto.sku && <span>SKU: {produto.sku}</span>}
                          {produto.codigo_barras && <span>EAN: {produto.codigo_barras}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                  {produtos.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado. Cadastre produtos primeiro.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={selectedIds.size === 0}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Estoque esperado */}
      {step === 3 && (
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saldo Inicial e Quantidade</CardTitle>
              <p className="text-sm text-muted-foreground">
                <strong>Saldo Inicial</strong> = estoque registrado no sistema. <strong>Quantidade</strong> = contagem física (opcional, preencha depois se preferir).
              </p>
            </CardHeader>
            <CardContent>
              <div className="hidden sm:grid grid-cols-[1fr_100px_100px] gap-2 px-3 pb-2 text-xs font-medium text-muted-foreground">
                <span>Produto</span>
                <span className="text-center">Saldo Inicial</span>
                <span className="text-center">Quantidade</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {selectedProdutos.map((produto) => (
                  <div
                    key={produto.id}
                    className="flex flex-col sm:grid sm:grid-cols-[1fr_100px_100px] items-start sm:items-center gap-2 sm:gap-3 rounded-lg p-3 hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{produto.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {produto.sku || produto.codigo_barras || "—"}
                      </p>
                    </div>
                    <div className="flex sm:block gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:hidden text-xs text-muted-foreground">Saldo Inicial</div>
                      <Input
                        type="number"
                        className="w-full sm:w-24 text-center"
                        min={0}
                        placeholder="0"
                        value={estoques[produto.id] ?? 0}
                        onChange={(e) =>
                          setEstoques((prev) => ({
                            ...prev,
                            [produto.id]: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="flex sm:block gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:hidden text-xs text-muted-foreground">Quantidade</div>
                      <Input
                        type="number"
                        className="w-full sm:w-24 text-center"
                        min={0}
                        placeholder="—"
                        value={quantidades[produto.id] ?? ""}
                        onChange={(e) =>
                          setQuantidades((prev) => ({
                            ...prev,
                            [produto.id]: e.target.value ? Number(e.target.value) : null,
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
            <Button
              onClick={handleCreate}
              disabled={createInventario.isPending}
            >
              {createInventario.isPending ? "Criando..." : "Criar Inventário"}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

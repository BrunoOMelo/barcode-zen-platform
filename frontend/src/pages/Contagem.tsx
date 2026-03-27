import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ScanBarcode,
  Check,
  AlertTriangle,
  Package,
  ArrowLeft,
} from "lucide-react";
import {
  useInventario,
  useInventarioProdutos,
  useInventarioStats,
  useRegistrarContagem,
  useUpdateInventarioStatus,
  type InventarioProduto,
} from "@/hooks/useInventarios";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export default function Contagem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventario } = useInventario(id);
  const { data: items } = useInventarioProdutos(id);
  const stats = useInventarioStats(id);
  const registrarContagem = useRegistrarContagem();
  const updateStatus = useUpdateInventarioStatus();
  const { data: profile } = useProfile();

  const [barcode, setBarcode] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [foundItem, setFoundItem] = useState<InventarioProduto | null>(null);
  const [lastCounted, setLastCounted] = useState<{
    descricao: string;
    quantidade: number;
    status: string;
  } | null>(null);
  const [error, setError] = useState("");

  const barcodeRef = useRef<HTMLInputElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode field
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Buscar produto por código de barras
  const buscarProduto = useCallback(
    async (code: string) => {
      if (!code.trim() || !items || !profile?.empresa_id) return;

      setError("");
      setFoundItem(null);

      // Search in inventario_produtos via produto's barcode or SKU
      const { data: produtos } = await supabase
        .from("produtos")
        .select("id")
        .eq("empresa_id", profile.empresa_id)
        .or(`codigo_barras.eq.${code},sku.eq.${code}`)
        .limit(1);

      if (!produtos?.length) {
        setError("Produto não encontrado");
        toast.error("Produto não encontrado");
        return;
      }

      const produtoId = produtos[0].id;
      const item = items.find((i) => i.produto_id === produtoId);

      if (!item) {
        setError("Produto não faz parte deste inventário");
        toast.error("Produto não faz parte deste inventário");
        return;
      }

      setFoundItem(item);
      setQuantidade("");
      // Focus quantity field
      setTimeout(() => quantidadeRef.current?.focus(), 50);
    },
    [items, profile]
  );

  // Handle barcode scanner input (Enter key)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarProduto(barcode);
    }
  };

  // Register count
  const handleConfirmar = async () => {
    if (!foundItem || !id) return;

    const qty = Number(quantidade);
    if (isNaN(qty) || qty < 0) {
      toast.error("Quantidade inválida");
      return;
    }

    try {
      await registrarContagem.mutateAsync({
        inventarioId: id,
        produtoId: foundItem.produto_id,
        quantidade: qty,
        tipo: inventario?.status === "em_recontagem" ? "recontagem" : "primeira",
      });

      const produto = foundItem.produtos;
      setLastCounted({
        descricao: produto?.descricao ?? "Produto",
        quantidade: qty,
        status: qty === foundItem.estoque_sistema ? "ok" : "divergente",
      });

      // Reset for next scan
      setFoundItem(null);
      setBarcode("");
      setQuantidade("");
      setError("");

      toast.success("Contagem registrada!");

      // Return focus to barcode
      setTimeout(() => barcodeRef.current?.focus(), 50);
    } catch {
      toast.error("Erro ao registrar contagem");
    }
  };

  const handleQuantidadeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmar();
    }
  };

  const handleFinalizarContagem = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, status: "em_analise" });
    toast.success("Contagem finalizada! Acesse Divergências para análise.");
    navigate(`/inventarios/${id}/divergencias`);
  };

  const progress = stats.total > 0 ? (stats.contados / stats.total) * 100 : 0;

  return (
    <AppLayout title={inventario?.nome ?? "Contagem"}>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">
            {stats.contados} de {stats.total} produtos contados
          </span>
          <span className="font-mono font-bold">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <div className="mx-auto max-w-lg space-y-4">
        {/* Barcode Input */}
        <Card className={error ? "border-destructive" : foundItem ? "border-success" : ""}>
          <CardContent className="space-y-4 pt-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Código de Barras / SKU
              </label>
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeRef}
                  placeholder="Leia ou digite o código..."
                  className="scanner-input h-14 pl-11 text-lg"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  autoComplete="off"
                />
              </div>
              {error && (
                <p className="mt-2 flex items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </p>
              )}
            </div>

            {/* Product found */}
            {foundItem && foundItem.produtos && (
              <>
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-semibold">{foundItem.produtos.descricao}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    {foundItem.produtos.sku && <span>SKU: {foundItem.produtos.sku}</span>}
                    {foundItem.produtos.codigo_barras && (
                      <span>EAN: {foundItem.produtos.codigo_barras}</span>
                    )}
                  </div>
                  {foundItem.estoque_contado !== null && (
                    <Badge variant="outline" className="mt-2">
                      Última contagem: {foundItem.estoque_contado}
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Quantidade Contada
                  </label>
                  <Input
                    ref={quantidadeRef}
                    type="number"
                    placeholder="0"
                    className="h-14 text-center text-2xl font-bold"
                    min={0}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    onKeyDown={handleQuantidadeKeyDown}
                  />
                </div>

                <Button
                  className="h-14 w-full text-lg font-semibold touch-target"
                  onClick={handleConfirmar}
                  disabled={registrarContagem.isPending || quantidade === ""}
                >
                  {registrarContagem.isPending ? "Registrando..." : "Confirmar Contagem"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Last counted feedback */}
        {lastCounted && (
          <Card
            className={
              lastCounted.status === "ok"
                ? "border-success bg-success/5"
                : "border-warning bg-warning/5"
            }
          >
            <CardContent className="flex items-center gap-3 py-4">
              {lastCounted.status === "ok" ? (
                <Check className="h-6 w-6 text-success shrink-0" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm">{lastCounted.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  Quantidade: {lastCounted.quantidade}
                  {lastCounted.status === "divergente" && " — Divergente"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waiting state when no product found */}
        {!foundItem && !error && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <ScanBarcode className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Aguardando leitura de código de barras...</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/inventarios")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          {stats.contados > 0 && (
            <Button
              variant="default"
              className="flex-1"
              onClick={handleFinalizarContagem}
              disabled={updateStatus.isPending}
            >
              Finalizar Contagem
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

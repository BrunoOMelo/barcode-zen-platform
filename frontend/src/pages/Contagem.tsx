import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  type InventarioProduto,
  useInventario,
  useInventarioProdutos,
  useInventarioStats,
  useRegistrarContagem,
  useUpdateInventarioStatus,
} from "@/hooks/useInventarios";
import { AlertTriangle, ArrowLeft, Check, ScanBarcode } from "lucide-react";
import { toast } from "sonner";

export default function Contagem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventario } = useInventario(id);
  const { data: items } = useInventarioProdutos(id);
  const stats = useInventarioStats(id);
  const registrarContagem = useRegistrarContagem();
  const updateStatus = useUpdateInventarioStatus();

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

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const buscarProduto = useCallback(
    (code: string) => {
      if (!code.trim() || !items) return;

      setError("");
      setFoundItem(null);

      const normalizedCode = code.trim().toLowerCase();
      const item = items.find((inventoryItem) => {
        const sku = inventoryItem.produtos?.sku?.trim().toLowerCase();
        const barcodeValue = inventoryItem.produtos?.codigo_barras?.trim().toLowerCase();
        return sku === normalizedCode || barcodeValue === normalizedCode;
      });

      if (!item) {
        setError("Produto nao encontrado");
        toast.error("Produto nao encontrado");
        return;
      }

      setFoundItem(item);
      setQuantidade("");
      setTimeout(() => quantidadeRef.current?.focus(), 50);
    },
    [items],
  );

  const handleBarcodeKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      buscarProduto(barcode);
    }
  };

  const handleConfirmar = async () => {
    if (!foundItem || !id) return;

    const qty = Number(quantidade);
    if (Number.isNaN(qty) || qty < 0) {
      toast.error("Quantidade invalida");
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

      setFoundItem(null);
      setBarcode("");
      setQuantidade("");
      setError("");

      toast.success("Contagem registrada");
      setTimeout(() => barcodeRef.current?.focus(), 50);
    } catch {
      toast.error("Erro ao registrar contagem");
    }
  };

  const handleQuantidadeKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleConfirmar();
    }
  };

  const handleFinalizarContagem = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, status: "em_analise" });
    toast.success("Contagem finalizada. Acesse Divergencias para analise.");
    navigate(`/inventarios/${id}/divergencias`);
  };

  const progress = stats.total > 0 ? (stats.contados / stats.total) * 100 : 0;

  return (
    <AppLayout title={inventario?.nome ?? "Contagem"}>
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {stats.contados} de {stats.total} produtos contados
          </span>
          <span className="font-mono font-bold">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <div className="mx-auto max-w-lg space-y-4">
        <Card className={error ? "border-destructive" : foundItem ? "border-success" : ""}>
          <CardContent className="space-y-4 pt-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Codigo de Barras / SKU</label>
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeRef}
                  placeholder="Leia ou digite o codigo..."
                  className="scanner-input h-14 pl-11 text-lg"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
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

            {foundItem && foundItem.produtos && (
              <>
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-semibold">{foundItem.produtos.descricao}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    {foundItem.produtos.sku && <span>SKU: {foundItem.produtos.sku}</span>}
                    {foundItem.produtos.codigo_barras && <span>EAN: {foundItem.produtos.codigo_barras}</span>}
                  </div>
                  {foundItem.estoque_contado !== null && (
                    <Badge variant="outline" className="mt-2">
                      Ultima contagem: {foundItem.estoque_contado}
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Quantidade Contada</label>
                  <Input
                    ref={quantidadeRef}
                    type="number"
                    placeholder="0"
                    className="h-14 text-center text-2xl font-bold"
                    min={0}
                    value={quantidade}
                    onChange={(event) => setQuantidade(event.target.value)}
                    onKeyDown={handleQuantidadeKeyDown}
                  />
                </div>

                <Button
                  className="touch-target h-14 w-full text-lg font-semibold"
                  onClick={handleConfirmar}
                  disabled={registrarContagem.isPending || quantidade === ""}
                >
                  {registrarContagem.isPending ? "Registrando..." : "Confirmar Contagem"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {lastCounted && (
          <Card className={lastCounted.status === "ok" ? "border-success bg-success/5" : "border-warning bg-warning/5"}>
            <CardContent className="flex items-center gap-3 py-4">
              {lastCounted.status === "ok" ? (
                <Check className="h-6 w-6 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="h-6 w-6 shrink-0 text-warning" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{lastCounted.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  Quantidade: {lastCounted.quantidade}
                  {lastCounted.status === "divergente" && " - Divergente"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!foundItem && !error && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <ScanBarcode className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Aguardando leitura de codigo de barras...</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/inventarios")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          {stats.contados > 0 && (
            <Button variant="default" className="flex-1" onClick={handleFinalizarContagem} disabled={updateStatus.isPending}>
              Finalizar Contagem
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Check, RefreshCw, ArrowLeft } from "lucide-react";
import {
  useInventario,
  useInventarioProdutos,
  useInventarioStats,
  useUpdateInventarioStatus,
} from "@/hooks/useInventarios";
import { toast } from "sonner";

export default function Divergencias() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventario } = useInventario(id);
  const { data: items } = useInventarioProdutos(id);
  const stats = useInventarioStats(id);
  const updateStatus = useUpdateInventarioStatus();

  const divergentes = items?.filter((i) => i.status === "divergente") ?? [];
  const pendentes = items?.filter((i) => i.estoque_contado === null) ?? [];

  const handleRecontagem = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, status: "em_recontagem" });
    toast.success("Recontagem iniciada");
    navigate(`/inventarios/${id}/contagem`);
  };

  const handleFinalizar = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, status: "finalizado" });
    toast.success("Inventário finalizado!");
    navigate("/inventarios");
  };

  return (
    <AppLayout title={`Divergências — ${inventario?.nome ?? ""}`}>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-success">{stats.contados}</p>
            <p className="text-xs text-muted-foreground">Contados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.divergentes}</p>
            <p className="text-xs text-muted-foreground">Divergentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-warning">{stats.pendentes}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Divergent items */}
      {divergentes.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Produtos Divergentes ({divergentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Estoque Sistema</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divergentes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.produtos?.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.produtos?.sku || item.produtos?.codigo_barras || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.estoque_sistema}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.estoque_contado ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        <span
                          className={
                            (item.divergencia ?? 0) > 0
                              ? "text-success"
                              : "text-destructive"
                          }
                        >
                          {(item.divergencia ?? 0) > 0 ? "+" : ""}
                          {item.divergencia}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 p-3 md:hidden">
              {divergentes.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium text-sm truncate">{item.produtos?.descricao}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Sistema</p>
                      <p className="font-mono font-bold">{item.estoque_sistema}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Contado</p>
                      <p className="font-mono font-bold">{item.estoque_contado ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Diferença</p>
                      <p
                        className={`font-mono font-bold ${
                          (item.divergencia ?? 0) > 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {(item.divergencia ?? 0) > 0 ? "+" : ""}
                        {item.divergencia}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending items */}
      {pendentes.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base text-warning">
              Produtos Não Contados ({pendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pendentes.slice(0, 20).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm py-1">
                  <Badge variant="secondary" className="shrink-0">Pendente</Badge>
                  <span className="truncate">{item.produtos?.descricao}</span>
                </div>
              ))}
              {pendentes.length > 20 && (
                <p className="text-sm text-muted-foreground pt-2">
                  ... e mais {pendentes.length - 20} produtos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {divergentes.length === 0 && pendentes.length === 0 && (
        <Card className="mb-4">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Check className="mb-4 h-12 w-12 text-success" />
            <h3 className="text-lg font-semibold">Nenhuma divergência!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos os produtos foram contados e estão OK.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={() => navigate("/inventarios")} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {divergentes.length > 0 && (
          <Button
            variant="outline"
            onClick={handleRecontagem}
            disabled={updateStatus.isPending}
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Iniciar Recontagem
          </Button>
        )}
        <Button
          onClick={handleFinalizar}
          disabled={updateStatus.isPending}
          className="flex-1"
        >
          <Check className="mr-2 h-4 w-4" />
          Finalizar Inventário
        </Button>
      </div>
    </AppLayout>
  );
}

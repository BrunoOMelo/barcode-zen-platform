import { useMemo, useState } from "react";

import { CategoriaChart } from "@/components/dashboard/CategoriaChart";
import { DivergenciaChart } from "@/components/dashboard/DivergenciaChart";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useContagens, useInventarioProdutos, useInventarios } from "@/hooks/useInventarios";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileBarChart,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

type ReportType = "inventario" | "divergencias" | "nao_contados" | "historico";
type ExportFormat = "csv" | "excel" | "pdf";

const statusLabel: Record<string, string> = {
  criado: "Criado",
  em_contagem: "Em contagem",
  em_recontagem: "Em recontagem",
  em_analise: "Em analise",
  finalizado: "Finalizado",
};

export default function Relatorios() {
  const { data: inventarios } = useInventarios();
  const { data: dashboard, isLoading: loadingDashboard } = useDashboardStats();
  const [selectedInv, setSelectedInv] = useState<string>("");
  const { data: selectedItems = [] } = useInventarioProdutos(selectedInv || undefined);
  const { data: selectedCounts = [] } = useContagens(selectedInv || undefined);
  const [loadingExport, setLoadingExport] = useState(false);

  const selectedInventorySummary = useMemo(() => {
    const total = selectedItems.length;
    const counted = selectedItems.filter((item) => item.estoque_contado !== null).length;
    const pending = total - counted;
    const divergent = selectedItems.filter((item) => item.status === "divergente").length;
    const countedWithoutDivergence = Math.max(0, counted - divergent);
    const accuracy = counted > 0 ? (countedWithoutDivergence / counted) * 100 : 0;
    return { total, counted, pending, divergent, accuracy };
  }, [selectedItems]);

  const managerialCards = [
    {
      title: "Inventarios ativos",
      value: dashboard?.inventariosAtivos ?? 0,
      icon: ClipboardList,
      color: "text-primary",
    },
    {
      title: "Produtos ativos",
      value: dashboard?.totalProdutos ?? 0,
      icon: Package,
      color: "text-blue-500",
    },
    {
      title: "Itens contados",
      value: dashboard?.produtosContados ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      title: "Divergencias abertas",
      value: dashboard?.divergencias ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600",
    },
  ];

  const reports: { type: ReportType; title: string; description: string }[] = [
    {
      type: "inventario",
      title: "Inventario completo",
      description: "Posicao completa de itens, contagens e status.",
    },
    {
      type: "divergencias",
      title: "Divergencias",
      description: "Itens com diferenca entre estoque sistema e contado.",
    },
    {
      type: "nao_contados",
      title: "Nao contados",
      description: "Itens ainda pendentes de contagem.",
    },
    {
      type: "historico",
      title: "Historico de contagens",
      description: "Rastro operacional das contagens realizadas.",
    },
  ];

  const generateReport = async (type: ReportType, format: ExportFormat) => {
    setLoadingExport(true);
    try {
      let data: Record<string, unknown>[] = [];
      let filename = "";
      let title = "";

      if (type === "inventario" && selectedInv) {
        data = selectedItems.map((item) => ({
          Produto: item.produtos?.descricao ?? "",
          SKU: item.produtos?.sku ?? "",
          "Cod. barras": item.produtos?.codigo_barras ?? "",
          "Estoque sistema": item.estoque_sistema,
          "Estoque contado": item.estoque_contado ?? "Nao contado",
          Divergencia: item.divergencia ?? "",
          Status: item.status,
        }));
        filename = "relatorio-inventario-completo";
        title = "Relatorio de inventario completo";
      } else if (type === "divergencias" && selectedInv) {
        const divergentItems = selectedItems.filter((item) => item.status === "divergente");
        data = divergentItems.map((item) => ({
          Produto: item.produtos?.descricao ?? "",
          SKU: item.produtos?.sku ?? "",
          "Cod. barras": item.produtos?.codigo_barras ?? "",
          "Estoque sistema": item.estoque_sistema,
          "Estoque contado": item.estoque_contado,
          Divergencia: item.divergencia,
          "Divergencia %":
            item.estoque_sistema > 0
              ? `${(((item.divergencia ?? 0) / item.estoque_sistema) * 100).toFixed(1)}%`
              : "N/A",
        }));
        filename = "relatorio-divergencias";
        title = "Relatorio de divergencias";
      } else if (type === "nao_contados" && selectedInv) {
        const pendingItems = selectedItems.filter((item) => item.estoque_contado === null);
        data = pendingItems.map((item) => ({
          Produto: item.produtos?.descricao ?? "",
          SKU: item.produtos?.sku ?? "",
          "Cod. barras": item.produtos?.codigo_barras ?? "",
          "Estoque sistema": item.estoque_sistema,
        }));
        filename = "relatorio-nao-contados";
        title = "Relatorio de itens nao contados";
      } else if (type === "historico" && selectedInv) {
        data = selectedCounts.map((count) => ({
          Produto: count.produtos?.descricao ?? "",
          SKU: count.produtos?.sku ?? "",
          Quantidade: count.quantidade,
          Tipo: count.tipo === "primeira" ? "1a contagem" : "Recontagem",
          "Data/hora": new Date(count.data_contagem).toLocaleString("pt-BR"),
        }));
        filename = "relatorio-historico-contagens";
        title = "Historico de contagens";
      } else {
        toast.error("Selecione um inventario para gerar relatorio.");
        setLoadingExport(false);
        return;
      }

      if (!data.length) {
        toast.error("Nenhum dado encontrado para o relatorio selecionado.");
        setLoadingExport(false);
        return;
      }

      if (format === "csv") exportToCSV(data, filename);
      else if (format === "excel") exportToExcel(data, filename);
      else exportToPDF(data, filename, title);

      toast.success(`Relatorio exportado em ${format.toUpperCase()}.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao gerar relatorio.";
      toast.error(`Erro: ${message}`);
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <AppLayout title="Dashboard Gerencial">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Visao executiva de inventario</CardTitle>
            <CardDescription>
              Indicadores operacionais para decisao gerencial e acompanhamento de produtividade.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {managerialCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{loadingDashboard ? "..." : card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ProgressChart data={dashboard?.progressData ?? []} />
          <DivergenciaChart data={dashboard?.divergenciaData ?? []} />
        </div>
        <CategoriaChart data={dashboard?.categoriaData ?? []} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventarios recentes</CardTitle>
            <CardDescription>Ultimos inventarios para acompanhamento de status e ritmo de operacao.</CardDescription>
          </CardHeader>
          <CardContent>
            {!dashboard?.recentInventarios?.length ? (
              <p className="py-4 text-sm text-muted-foreground">Nenhum inventario recente encontrado.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentInventarios.map((inventory) => (
                  <div
                    key={inventory.id}
                    className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{inventory.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(inventory.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="secondary">{statusLabel[inventory.status] ?? inventory.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Centro de exportacao</CardTitle>
            <CardDescription>
              Gere arquivos para auditoria, apresentacao executiva e acompanhamento operacional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Inventario para exportacao</label>
              <Select value={selectedInv} onValueChange={setSelectedInv}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um inventario..." />
                </SelectTrigger>
                <SelectContent>
                  {inventarios?.map((inventory) => (
                    <SelectItem key={inventory.id} value={inventory.id}>
                      {inventory.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedInv ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Total de itens</p>
                    <p className="text-xl font-semibold">{selectedInventorySummary.total}</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Contados</p>
                    <p className="text-xl font-semibold">{selectedInventorySummary.counted}</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-xl font-semibold">{selectedInventorySummary.pending}</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Divergentes</p>
                    <p className="text-xl font-semibold">{selectedInventorySummary.divergent}</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Acuracia</p>
                    <p className="text-xl font-semibold">{selectedInventorySummary.accuracy.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {reports.map((report) => (
                <Card key={report.type}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <CardDescription className="mt-1">{report.description}</CardDescription>
                    </div>
                    <FileBarChart className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(["csv", "excel", "pdf"] as ExportFormat[]).map((format) => (
                        <Button
                          key={format}
                          variant="outline"
                          size="sm"
                          disabled={!selectedInv || loadingExport}
                          onClick={() => generateReport(report.type, format)}
                        >
                          {loadingExport ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="mr-1 h-3 w-3" />
                          )}
                          {format.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

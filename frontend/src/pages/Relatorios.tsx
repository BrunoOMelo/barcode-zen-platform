import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { useInventarios, useInventarioProdutos, useContagens } from "@/hooks/useInventarios";
import { useProdutos } from "@/hooks/useProdutos";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

type ReportType = "inventario" | "divergencias" | "nao_contados" | "historico";
type ExportFormat = "csv" | "excel" | "pdf";

export default function Relatorios() {
  const { data: inventarios } = useInventarios();
  const { data: profile } = useProfile();
  const [selectedInv, setSelectedInv] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generateReport = async (type: ReportType, format: ExportFormat) => {
    if (!profile?.empresa_id) {
      toast.error("Empresa não configurada");
      return;
    }

    setLoading(true);
    try {
      let data: Record<string, unknown>[] = [];
      let filename = "";
      let title = "";

      if (type === "inventario" && selectedInv) {
        const { data: items } = await supabase
          .from("inventario_produtos")
          .select("*, produtos(descricao, sku, codigo_barras, categoria)")
          .eq("inventario_id", selectedInv);

        data = (items ?? []).map((i: any) => ({
          Produto: i.produtos?.descricao ?? "",
          SKU: i.produtos?.sku ?? "",
          "Cód. Barras": i.produtos?.codigo_barras ?? "",
          Categoria: i.produtos?.categoria ?? "",
          "Estoque Sistema": i.estoque_sistema,
          "Estoque Contado": i.estoque_contado ?? "Não contado",
          Divergência: i.divergencia ?? "",
          Status: i.status,
        }));
        filename = "relatorio-inventario";
        title = "Relatório de Inventário Completo";
      } else if (type === "divergencias" && selectedInv) {
        const { data: items } = await supabase
          .from("inventario_produtos")
          .select("*, produtos(descricao, sku, codigo_barras)")
          .eq("inventario_id", selectedInv)
          .eq("status", "divergente");

        data = (items ?? []).map((i: any) => ({
          Produto: i.produtos?.descricao ?? "",
          SKU: i.produtos?.sku ?? "",
          "Cód. Barras": i.produtos?.codigo_barras ?? "",
          "Estoque Sistema": i.estoque_sistema,
          "Estoque Contado": i.estoque_contado,
          Divergência: i.divergencia,
          "Divergência %": i.estoque_sistema > 0
            ? `${((i.divergencia / i.estoque_sistema) * 100).toFixed(1)}%`
            : "N/A",
        }));
        filename = "relatorio-divergencias";
        title = "Relatório de Divergências";
      } else if (type === "nao_contados" && selectedInv) {
        const { data: items } = await supabase
          .from("inventario_produtos")
          .select("*, produtos(descricao, sku, codigo_barras, categoria)")
          .eq("inventario_id", selectedInv)
          .is("estoque_contado", null);

        data = (items ?? []).map((i: any) => ({
          Produto: i.produtos?.descricao ?? "",
          SKU: i.produtos?.sku ?? "",
          "Cód. Barras": i.produtos?.codigo_barras ?? "",
          Categoria: i.produtos?.categoria ?? "",
          "Estoque Sistema": i.estoque_sistema,
        }));
        filename = "relatorio-nao-contados";
        title = "Produtos Não Contados";
      } else if (type === "historico" && selectedInv) {
        const { data: contagens } = await supabase
          .from("contagens")
          .select("*, produtos(descricao, sku, codigo_barras)")
          .eq("inventario_id", selectedInv)
          .order("data_contagem", { ascending: false });

        data = (contagens ?? []).map((c: any) => ({
          Produto: c.produtos?.descricao ?? "",
          SKU: c.produtos?.sku ?? "",
          Quantidade: c.quantidade,
          Tipo: c.tipo === "primeira" ? "1ª Contagem" : "Recontagem",
          "Data/Hora": new Date(c.data_contagem).toLocaleString("pt-BR"),
        }));
        filename = "relatorio-historico";
        title = "Histórico de Contagens";
      } else {
        toast.error("Selecione um inventário");
        setLoading(false);
        return;
      }

      if (!data.length) {
        toast.error("Nenhum dado encontrado para este relatório");
        setLoading(false);
        return;
      }

      if (format === "csv") exportToCSV(data, filename);
      else if (format === "excel") exportToExcel(data, filename);
      else if (format === "pdf") exportToPDF(data, filename, title);

      toast.success(`Relatório exportado em ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reports: { type: ReportType; title: string; description: string }[] = [
    {
      type: "inventario",
      title: "Inventário Completo",
      description: "Todos os produtos e status de contagem",
    },
    {
      type: "divergencias",
      title: "Divergências",
      description: "Produtos com diferença entre sistema e contagem",
    },
    {
      type: "nao_contados",
      title: "Produtos Não Contados",
      description: "Produtos pendentes de contagem",
    },
    {
      type: "historico",
      title: "Histórico de Contagens",
      description: "Log completo de todas as contagens realizadas",
    },
  ];

  return (
    <AppLayout title="Relatórios">
      {/* Inventory selector */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <label className="mb-2 block text-sm font-medium">Selecione o Inventário</label>
          <Select value={selectedInv} onValueChange={setSelectedInv}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um inventário..." />
            </SelectTrigger>
            <SelectContent>
              {inventarios?.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.type}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {report.description}
                </p>
              </div>
              <FileBarChart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {(["csv", "excel", "pdf"] as ExportFormat[]).map((fmt) => (
                  <Button
                    key={fmt}
                    variant="outline"
                    size="sm"
                    disabled={!selectedInv || loading}
                    onClick={() => generateReport(report.type, fmt)}
                  >
                    {loading ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-3 w-3" />
                    )}
                    {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}

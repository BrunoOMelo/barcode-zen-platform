import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Package,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { DivergenciaChart } from "@/components/dashboard/DivergenciaChart";
import { CategoriaChart } from "@/components/dashboard/CategoriaChart";

const statusLabels: Record<string, string> = {
  criado: "Criado",
  em_contagem: "Em Contagem",
  em_recontagem: "Recontagem",
  em_analise: "Em Análise",
  finalizado: "Finalizado",
};

export default function Index() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  const kpis = [
    {
      title: "Inventários Ativos",
      value: stats?.inventariosAtivos ?? 0,
      icon: ClipboardList,
      color: "text-primary",
    },
    {
      title: "Produtos Cadastrados",
      value: stats?.totalProdutos ?? 0,
      icon: Package,
      color: "text-accent",
    },
    {
      title: "Divergências",
      value: stats?.divergencias ?? 0,
      icon: AlertTriangle,
      color: "text-warning",
    },
    {
      title: "Finalizados",
      value: stats?.inventariosFinalizados ?? 0,
      icon: CheckCircle,
      color: "text-success",
    },
  ];

  return (
    <AppLayout title="Dashboard">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {isLoading ? "..." : kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => navigate("/inventarios/criar")}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Inventário
        </Button>
        <Button variant="outline" onClick={() => navigate("/produtos")}>
          <Package className="mr-2 h-4 w-4" />
          Gerenciar Produtos
        </Button>
      </div>
      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ProgressChart data={stats?.progressData ?? []} />
        <DivergenciaChart data={stats?.divergenciaData ?? []} />
      </div>
      <div className="mt-4">
        <CategoriaChart data={stats?.categoriaData ?? []} />
      </div>

      {/* Recent inventories */}
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Inventários Recentes</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/inventarios")}
          >
            Ver todos
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : !stats?.recentInventarios?.length ? (
            <div className="flex flex-col items-center py-8 text-center">
              <ClipboardList className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhum inventário criado ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentInventarios.map((inv: any) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() =>
                    inv.status === "em_contagem" || inv.status === "em_recontagem"
                      ? navigate(`/inventarios/${inv.id}/contagem`)
                      : inv.status === "em_analise"
                        ? navigate(`/inventarios/${inv.id}/divergencias`)
                        : navigate("/inventarios")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm">{inv.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(inv.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="secondary">{statusLabels[inv.status] ?? inv.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}

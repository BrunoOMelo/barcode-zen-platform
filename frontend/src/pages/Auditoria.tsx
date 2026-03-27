import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, User, Clock } from "lucide-react";
import { useInventario, useContagens } from "@/hooks/useInventarios";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Auditoria() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventario } = useInventario(id);
  const { data: contagens, isLoading } = useContagens(id);

  return (
    <AppLayout title={`Auditoria — ${inventario?.nome ?? ""}`}>
      <Button
        variant="outline"
        size="sm"
        className="mb-4"
        onClick={() => navigate("/inventarios")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : !contagens?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhuma contagem registrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O histórico de contagens aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contagens.map((contagem: any) => (
            <Card key={contagem.id}>
              <CardContent className="flex items-start gap-3 py-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {contagem.produtos?.descricao ?? "Produto"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Qtd: <strong>{contagem.quantidade}</strong></span>
                    <Badge variant="outline" className="text-[10px]">
                      {contagem.tipo === "primeira" ? "1ª Contagem" : "Recontagem"}
                    </Badge>
                    <span>
                      {format(new Date(contagem.data_contagem), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

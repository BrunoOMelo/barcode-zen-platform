import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  useInventario,
  useInventarioProdutos,
} from "@/hooks/useInventarios";

export default function Recontagem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventario } = useInventario(id);
  const { data: items } = useInventarioProdutos(id);

  const divergentes = items?.filter((i) => i.status === "divergente") ?? [];

  return (
    <AppLayout title={`Recontagem — ${inventario?.nome ?? ""}`}>
      {divergentes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <RefreshCw className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">Nenhum produto para recontar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos os produtos estão OK ou ainda não foram contados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {divergentes.length} produto{divergentes.length !== 1 ? "s" : ""} divergente{divergentes.length !== 1 ? "s" : ""} para recontar.
          </p>
          <div className="space-y-2 mb-4">
            {divergentes.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.produtos?.descricao}</p>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>Sistema: {item.estoque_sistema}</span>
                      <span>Contado: {item.estoque_contado}</span>
                      <span className="text-destructive font-bold">
                        Dif: {item.divergencia}
                      </span>
                    </div>
                  </div>
                  <Badge variant="destructive">Divergente</Badge>
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={() => navigate(`/inventarios/${id}/contagem`)} className="w-full">
            Iniciar Recontagem (Scanner)
          </Button>
        </>
      )}

      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={() => navigate("/inventarios")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>
    </AppLayout>
  );
}

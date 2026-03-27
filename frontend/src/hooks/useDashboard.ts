import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export interface InventarioProgress {
  nome: string;
  total: number;
  contados: number;
  pendentes: number;
  percentual: number;
}

export interface DivergenciaByInventario {
  nome: string;
  ok: number;
  divergentes: number;
}

export interface CategoriaDist {
  categoria: string;
  quantidade: number;
}

export function useDashboardStats() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["dashboard-stats", profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) {
        return {
          inventariosAtivos: 0,
          inventariosFinalizados: 0,
          totalProdutos: 0,
          produtosContados: 0,
          divergencias: 0,
          recentInventarios: [] as any[],
          progressData: [] as InventarioProgress[],
          divergenciaData: [] as DivergenciaByInventario[],
          categoriaData: [] as CategoriaDist[],
        };
      }

      const empresaId = profile.empresa_id;

      // Parallel fetches
      const [
        { count: ativos },
        { count: finalizados },
        { count: totalProdutos },
        { data: recentInventarios },
        { data: allProdutos },
      ] = await Promise.all([
        supabase
          .from("inventarios")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .neq("status", "finalizado"),
        supabase
          .from("inventarios")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("status", "finalizado"),
        supabase
          .from("produtos")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("ativo", true),
        supabase
          .from("inventarios")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("produtos")
          .select("categoria")
          .eq("empresa_id", empresaId)
          .eq("ativo", true),
      ]);

      // Categoria distribution
      const catMap = new Map<string, number>();
      (allProdutos ?? []).forEach((p) => {
        const cat = p.categoria || "Sem categoria";
        catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
      });
      const categoriaData: CategoriaDist[] = Array.from(catMap.entries())
        .map(([categoria, quantidade]) => ({ categoria, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 8);

      let produtosContados = 0;
      let divergencias = 0;
      let progressData: InventarioProgress[] = [];
      let divergenciaData: DivergenciaByInventario[] = [];

      if (recentInventarios?.length) {
        const invIds = recentInventarios.map((i) => i.id);

        const { data: invItems } = await supabase
          .from("inventario_produtos")
          .select("inventario_id, estoque_contado, status")
          .in("inventario_id", invIds);

        if (invItems) {
          // Group by inventario
          const grouped = new Map<string, typeof invItems>();
          invItems.forEach((item) => {
            const list = grouped.get(item.inventario_id) ?? [];
            list.push(item);
            grouped.set(item.inventario_id, list);
          });

          // Active stats
          const activeItems = invItems.filter((item) => {
            const inv = recentInventarios.find((i) => i.id === item.inventario_id);
            return inv && inv.status !== "finalizado";
          });
          produtosContados = activeItems.filter((i) => i.estoque_contado !== null).length;
          divergencias = activeItems.filter((i) => i.status === "divergente").length;

          // Build chart data
          recentInventarios.forEach((inv) => {
            const items = grouped.get(inv.id) ?? [];
            if (!items.length) return;
            const total = items.length;
            const contados = items.filter((i) => i.estoque_contado !== null).length;
            const pendentes = total - contados;
            progressData.push({
              nome: inv.nome.length > 15 ? inv.nome.slice(0, 15) + "…" : inv.nome,
              total,
              contados,
              pendentes,
              percentual: Math.round((contados / total) * 100),
            });

            const ok = items.filter((i) => i.status === "ok").length;
            const divergentes = items.filter((i) => i.status === "divergente").length;
            if (ok || divergentes) {
              divergenciaData.push({
                nome: inv.nome.length > 15 ? inv.nome.slice(0, 15) + "…" : inv.nome,
                ok,
                divergentes,
              });
            }
          });
        }
      }

      return {
        inventariosAtivos: ativos ?? 0,
        inventariosFinalizados: finalizados ?? 0,
        totalProdutos: totalProdutos ?? 0,
        produtosContados,
        divergencias,
        recentInventarios: recentInventarios ?? [],
        progressData,
        divergenciaData,
        categoriaData,
      };
    },
    enabled: !!profile?.empresa_id,
  });
}

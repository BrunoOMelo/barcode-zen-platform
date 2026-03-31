import { useQuery } from "@tanstack/react-query";

import { getDashboardSummaryFromSession } from "@/platform/api";
import { platformFlags } from "@/platform/flags";
import { loadPlatformSession } from "@/platform/storage";

type BackendInventoryStatus = "created" | "counting" | "recounting" | "review" | "finished";
type LegacyInventoryStatus = "criado" | "em_contagem" | "em_recontagem" | "em_analise" | "finalizado";

interface DashboardInventory {
  id: string;
  nome: string;
  status: LegacyInventoryStatus;
  created_at: string;
}

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

function mapInventoryStatus(status: BackendInventoryStatus): LegacyInventoryStatus {
  if (status === "created") return "criado";
  if (status === "counting") return "em_contagem";
  if (status === "recounting") return "em_recontagem";
  if (status === "review") return "em_analise";
  return "finalizado";
}

function ensureDashboardCutoverEnabled() {
  if (!platformFlags.cutoverProducts || !platformFlags.cutoverInventories) {
    throw new Error("Cutover de dashboard requer modulos de produtos e inventarios ativos via backend.");
  }
}

export function useDashboardStats() {
  const tenantId = loadPlatformSession()?.selectedTenantId;

  return useQuery({
    queryKey: ["dashboard-stats", tenantId],
    queryFn: async () => {
      ensureDashboardCutoverEnabled();
      const summary = await getDashboardSummaryFromSession();

      const recentInventarios: DashboardInventory[] = summary.recent_inventories.map((inventory) => ({
        id: inventory.id,
        nome: inventory.name,
        status: mapInventoryStatus(inventory.status),
        created_at: inventory.created_at,
      }));

      const progressData: InventarioProgress[] = summary.progress_by_inventory.map((row) => ({
        nome: row.name,
        total: row.total,
        contados: row.counted,
        pendentes: row.pending,
        percentual: row.percentage,
      }));

      const divergenciaData: DivergenciaByInventario[] = summary.divergence_by_inventory.map((row) => ({
        nome: row.name,
        ok: row.ok,
        divergentes: row.divergent,
      }));

      const categoriaData: CategoriaDist[] = summary.categories_distribution.map((row) => ({
        categoria: row.category,
        quantidade: row.quantity,
      }));

      return {
        inventariosAtivos: summary.active_inventories,
        inventariosFinalizados: summary.finished_inventories,
        totalProdutos: summary.total_products,
        produtosContados: summary.counted_products,
        divergencias: summary.divergent_items,
        recentInventarios,
        progressData,
        divergenciaData,
        categoriaData,
      };
    },
    enabled: Boolean(tenantId),
  });
}

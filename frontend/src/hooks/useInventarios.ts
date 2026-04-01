import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addInventoryItemsFromSession,
  changeInventoryStatusFromSession,
  createInventoryFromSession,
  getInventoryFromSession,
  listInventoryCountsFromSession,
  listInventoryItemsFromSession,
  listInventoriesFromSession,
  registerInventoryCountFromSession,
} from "@/platform/api";
import { platformFlags } from "@/platform/flags";
import { loadPlatformSession } from "@/platform/storage";
import { toast } from "sonner";

type LegacyInventoryStatus = "criado" | "em_contagem" | "em_recontagem" | "em_analise" | "finalizado";
type BackendInventoryStatus = "created" | "counting" | "recounting" | "review" | "finished";

export interface Inventario {
  id: string;
  nome: string;
  empresa_id: string;
  status: LegacyInventoryStatus;
  criado_por: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventarioProduto {
  id: string;
  inventario_id: string;
  produto_id: string;
  estoque_sistema: number;
  estoque_contado: number | null;
  divergencia: number | null;
  status: "pendente" | "ok" | "divergente";
  created_at: string;
  updated_at: string;
  produtos?: {
    descricao: string;
    sku: string | null;
    codigo_barras: string | null;
  };
}

export interface Contagem {
  id: string;
  inventario_id: string;
  produto_id: string;
  usuario_id: string;
  quantidade: number;
  tipo: "primeira" | "recontagem";
  data_contagem: string;
  created_at: string;
  produtos?: {
    descricao: string;
    sku: string | null;
    codigo_barras: string | null;
  };
}

const BACKEND_TO_LEGACY_STATUS: Record<BackendInventoryStatus, LegacyInventoryStatus> = {
  created: "criado",
  counting: "em_contagem",
  recounting: "em_recontagem",
  review: "em_analise",
  finished: "finalizado",
};

const LEGACY_TO_BACKEND_STATUS: Record<LegacyInventoryStatus, BackendInventoryStatus> = {
  criado: "created",
  em_contagem: "counting",
  em_recontagem: "recounting",
  em_analise: "review",
  finalizado: "finished",
};

function ensureInventoriesCutoverEnabled(): void {
  if (!platformFlags.cutoverInventories) {
    throw new Error("Modulo de inventarios via backend esta desabilitado por feature flag.");
  }
}

function requirePlatformSessionTenantId(): string {
  const session = loadPlatformSession();
  if (!session?.selectedTenantId) {
    throw new Error("Sessao da plataforma nao encontrada. Faca login em /platform/login.");
  }
  return session.selectedTenantId;
}

function mapInventoryStatus(status: BackendInventoryStatus): LegacyInventoryStatus {
  return BACKEND_TO_LEGACY_STATUS[status];
}

function mapLegacyStatus(status: string): BackendInventoryStatus {
  return LEGACY_TO_BACKEND_STATUS[status as LegacyInventoryStatus] ?? "created";
}

function mapInventoryFromApi(item: {
  id: string;
  name: string;
  status: BackendInventoryStatus;
  tenant_id: string;
  created_by: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}): Inventario {
  return {
    id: item.id,
    nome: item.name,
    empresa_id: item.tenant_id,
    status: mapInventoryStatus(item.status),
    criado_por: item.created_by,
    data_inicio: item.started_at,
    data_fim: item.finished_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function mapItemStatus(status: "pending" | "counted" | "divergent"): "pendente" | "ok" | "divergente" {
  if (status === "pending") return "pendente";
  if (status === "counted") return "ok";
  return "divergente";
}

async function listAllInventories(): Promise<Inventario[]> {
  const first = await listInventoriesFromSession({ page: 1, pageSize: 100 });
  const items = [...first.items];

  for (let page = 2; page <= first.total_pages; page += 1) {
    const next = await listInventoriesFromSession({ page, pageSize: 100 });
    items.push(...next.items);
  }

  return items.map(mapInventoryFromApi);
}

async function listAllCounts(inventoryId: string): Promise<Contagem[]> {
  const first = await listInventoryCountsFromSession(inventoryId, { page: 1, pageSize: 100 });
  const all = [...first.items];

  for (let page = 2; page <= first.total_pages; page += 1) {
    const next = await listInventoryCountsFromSession(inventoryId, { page, pageSize: 100 });
    all.push(...next.items);
  }

  return all.map((count) => ({
    id: count.id,
    inventario_id: count.inventory_id,
    produto_id: count.product_id,
    usuario_id: count.counted_by,
    quantidade: count.quantity,
    tipo: count.count_type === "first" ? "primeira" : "recontagem",
    data_contagem: count.created_at,
    created_at: count.created_at,
    produtos: {
      descricao: count.product_name,
      sku: count.product_sku ?? null,
      codigo_barras: count.product_barcode ?? null,
    },
  }));
}

export function useInventarios() {
  const tenantId = loadPlatformSession()?.selectedTenantId;

  return useQuery({
    queryKey: ["inventarios", tenantId],
    queryFn: async () => {
      ensureInventoriesCutoverEnabled();
      requirePlatformSessionTenantId();
      return listAllInventories();
    },
    enabled: !!tenantId,
  });
}

export function useInventario(id: string | undefined) {
  const tenantId = loadPlatformSession()?.selectedTenantId;

  return useQuery({
    queryKey: ["inventario", tenantId, id],
    queryFn: async () => {
      ensureInventoriesCutoverEnabled();
      requirePlatformSessionTenantId();
      if (!id) return null;
      const inventory = await getInventoryFromSession(id);
      return mapInventoryFromApi(inventory);
    },
    enabled: !!id && !!tenantId,
  });
}

export function useInventarioProdutos(inventarioId: string | undefined) {
  const tenantId = loadPlatformSession()?.selectedTenantId;

  return useQuery({
    queryKey: ["inventario_produtos", tenantId, inventarioId],
    queryFn: async () => {
      ensureInventoriesCutoverEnabled();
      requirePlatformSessionTenantId();
      if (!inventarioId) return [];
      const response = await listInventoryItemsFromSession(inventarioId);
      return response.items.map(
        (item): InventarioProduto => ({
          id: item.id,
          inventario_id: item.inventory_id,
          produto_id: item.product_id,
          estoque_sistema: item.system_quantity,
          estoque_contado: item.counted_quantity,
          divergencia: item.difference,
          status: mapItemStatus(item.status),
          created_at: item.created_at,
          updated_at: item.updated_at,
          produtos: {
            descricao: item.product_name,
            sku: item.product_sku ?? null,
            codigo_barras: item.product_barcode ?? null,
          },
        }),
      );
    },
    enabled: !!inventarioId && !!tenantId,
  });
}

export function useInventarioStats(inventarioId: string | undefined) {
  const { data: items } = useInventarioProdutos(inventarioId);

  const total = items?.length ?? 0;
  const contados = items?.filter((i) => i.estoque_contado !== null).length ?? 0;
  const divergentes = items?.filter((i) => i.status === "divergente").length ?? 0;
  const pendentes = total - contados;

  return { total, contados, divergentes, pendentes };
}

export function useCreateInventario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nome,
      produtoIds,
      estoques,
      quantidades,
    }: {
      nome: string;
      produtoIds: string[];
      estoques: Record<string, number>;
      quantidades?: Record<string, number | null>;
    }) => {
      ensureInventoriesCutoverEnabled();
      requirePlatformSessionTenantId();
      const created = await createInventoryFromSession(nome);
      await addInventoryItemsFromSession(created.id, {
        items: produtoIds.map((productId) => {
          const rawSystemQuantity = estoques[productId];
          const rawCountedQuantity = quantidades?.[productId];
          const systemQuantity = Number.isFinite(rawSystemQuantity)
            ? Math.max(0, Number(rawSystemQuantity))
            : undefined;
          const countedQuantity =
            rawCountedQuantity === null || rawCountedQuantity === undefined
              ? null
              : Math.max(0, Number(rawCountedQuantity));

          return {
            product_id: productId,
            system_quantity: systemQuantity,
            counted_quantity: countedQuantity,
          };
        }),
      });

      return mapInventoryFromApi(created);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      toast.success("Inventario criado com sucesso!");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Falha inesperada ao criar inventario.";
      toast.error(`Erro ao criar inventario: ${message}`);
    },
  });
}

export function useUpdateInventarioStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      ensureInventoriesCutoverEnabled();
      requirePlatformSessionTenantId();
      const backendStatus = mapLegacyStatus(status);
      await changeInventoryStatusFromSession(id, backendStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({ queryKey: ["inventario_produtos"] });
      queryClient.invalidateQueries({ queryKey: ["contagens"] });
    },
  });
}

export function useRegistrarContagem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inventarioId,
      produtoId,
      quantidade,
      tipo = "primeira",
    }: {
      inventarioId: string;
      produtoId: string;
      quantidade: number;
      tipo?: "primeira" | "recontagem";
    }) => {
      ensureInventoriesCutoverEnabled();
      requirePlatformSessionTenantId();
      const countType = tipo === "recontagem" ? "recount" : "first";
      return registerInventoryCountFromSession(inventarioId, {
        productId: produtoId,
        quantity: quantidade,
        countType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventario_produtos"] });
      queryClient.invalidateQueries({ queryKey: ["contagens"] });
    },
  });
}

export function useContagens(inventarioId: string | undefined) {
  const tenantId = loadPlatformSession()?.selectedTenantId;

  return useQuery({
    queryKey: ["contagens", tenantId, inventarioId],
    queryFn: async () => {
      ensureInventoriesCutoverEnabled();
      requirePlatformSessionTenantId();
      if (!inventarioId) return [];
      return listAllCounts(inventarioId);
    },
    enabled: !!inventarioId && !!tenantId,
  });
}

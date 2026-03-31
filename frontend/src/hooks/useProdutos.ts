import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProductFromSession,
  deleteProductFromSession,
  listProductsFromSession,
  updateProductFromSession,
} from "@/platform/api";
import { platformFlags } from "@/platform/flags";
import { loadPlatformSession } from "@/platform/storage";
import { toast } from "sonner";

export interface Produto {
  id: string;
  descricao: string;
  sku: string | null;
  codigo_barras: string | null;
  categoria: string | null;
  marca: string | null;
  data_validade: string | null;
  lote: string | null;
  custo: number | null;
  ativo: boolean;
  quantidade: number;
  created_at: string;
  updated_at: string;
}

export interface ProdutoInsert {
  descricao: string;
  sku?: string | null;
  codigo_barras?: string | null;
  categoria?: string | null;
  marca?: string | null;
  data_validade?: string | null;
  lote?: string | null;
  custo?: number | null;
  ativo?: boolean;
  quantidade?: number;
}

export type ProdutoUpdate = Partial<ProdutoInsert>;

interface UseProdutosOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  ativo?: boolean;
}

function ensureProductsCutoverEnabled(): void {
  if (!platformFlags.cutoverProducts) {
    throw new Error("Modulo de produtos via backend esta desabilitado por feature flag.");
  }
}

function requirePlatformSessionTenantId(): string {
  const session = loadPlatformSession();
  if (!session?.selectedTenantId) {
    throw new Error("Sessao da plataforma nao encontrada. Faca login em /platform/login.");
  }
  return session.selectedTenantId;
}

function mapProductToLegacy(item: {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string | null;
  active: boolean;
  cost: number | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}): Produto {
  return {
    id: item.id,
    descricao: item.name,
    sku: item.sku ?? null,
    codigo_barras: item.barcode ?? null,
    categoria: item.category ?? null,
    marca: null,
    data_validade: null,
    lote: null,
    custo: item.cost,
    ativo: item.active,
    quantidade: item.quantity,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export function useProdutos({ search = "", page = 0, pageSize = 50, ativo }: UseProdutosOptions = {}) {
  const tenantId = loadPlatformSession()?.selectedTenantId;

  return useQuery({
    queryKey: ["produtos", tenantId, search, page, pageSize, ativo],
    queryFn: async () => {
      ensureProductsCutoverEnabled();
      const response = await listProductsFromSession({
        page: page + 1,
        pageSize,
        search: search.trim() || undefined,
        active: ativo,
      });
      return {
        data: response.items.map(mapProductToLegacy),
        count: response.total,
      };
    },
    enabled: !!tenantId,
  });
}

export function useCreateProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (produto: ProdutoInsert) => {
      ensureProductsCutoverEnabled();
      requirePlatformSessionTenantId();
      const barcodeCandidate = produto.codigo_barras?.trim() || produto.sku?.trim();
      if (!barcodeCandidate) {
        throw new Error("Informe SKU ou codigo de barras para criar o produto.");
      }
      return createProductFromSession({
        name: produto.descricao.trim(),
        sku: produto.sku?.trim() || barcodeCandidate,
        barcode: barcodeCandidate,
        category: produto.categoria?.trim() || undefined,
        active: produto.ativo ?? true,
        cost: produto.custo ?? undefined,
        quantity: produto.quantidade ?? 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto criado com sucesso");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Falha inesperada ao criar produto.";
      toast.error(`Erro ao criar produto: ${message}`);
    },
  });
}

export function useUpdateProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProdutoUpdate & { id: string }) => {
      ensureProductsCutoverEnabled();
      requirePlatformSessionTenantId();
      const payload: Record<string, unknown> = {};

      if (updates.descricao !== undefined) payload.name = updates.descricao?.trim();
      if (updates.sku !== undefined) payload.sku = updates.sku?.trim() || undefined;
      if (updates.codigo_barras !== undefined) payload.barcode = updates.codigo_barras?.trim() || undefined;
      if (updates.categoria !== undefined) payload.category = updates.categoria?.trim() || undefined;
      if (updates.ativo !== undefined) payload.active = updates.ativo;
      if (updates.custo !== undefined) payload.cost = updates.custo ?? undefined;
      if (updates.quantidade !== undefined) payload.quantity = updates.quantidade;

      return updateProductFromSession(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto atualizado");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Falha inesperada ao atualizar produto.";
      toast.error(`Erro ao atualizar: ${message}`);
    },
  });
}

export function useDeleteProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      ensureProductsCutoverEnabled();
      requirePlatformSessionTenantId();
      await deleteProductFromSession(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto excluido");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Falha inesperada ao excluir produto.";
      toast.error(`Erro ao excluir: ${message}`);
    },
  });
}

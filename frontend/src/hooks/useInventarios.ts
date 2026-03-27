import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Inventario = Tables<"inventarios">;
export type InventarioProduto = Tables<"inventario_produtos"> & {
  produtos?: Tables<"produtos">;
};
export type Contagem = Tables<"contagens">;

export function useInventarios() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["inventarios", profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from("inventarios")
        .select("*")
        .eq("empresa_id", profile.empresa_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Inventario[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useInventario(id: string | undefined) {
  return useQuery({
    queryKey: ["inventario", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("inventarios")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Inventario;
    },
    enabled: !!id,
  });
}

export function useInventarioProdutos(inventarioId: string | undefined) {
  return useQuery({
    queryKey: ["inventario_produtos", inventarioId],
    queryFn: async () => {
      if (!inventarioId) return [];
      const { data, error } = await supabase
        .from("inventario_produtos")
        .select("*, produtos(*)")
        .eq("inventario_id", inventarioId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as InventarioProduto[];
    },
    enabled: !!inventarioId,
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
  const { data: profile } = useProfile();
  const { user } = useAuth();

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
      if (!profile?.empresa_id || !user) throw new Error("Empresa não configurada");

      const { data: inventario, error: invError } = await supabase
        .from("inventarios")
        .insert({
          nome,
          empresa_id: profile.empresa_id,
          criado_por: user.id,
        })
        .select()
        .single();
      if (invError) throw invError;

      const invProdutos = produtoIds.map((produtoId) => {
        const qty = quantidades?.[produtoId];
        const saldo = estoques[produtoId] ?? 0;
        return {
          inventario_id: inventario.id,
          produto_id: produtoId,
          estoque_sistema: saldo,
          estoque_contado: qty ?? null,
          divergencia: qty != null ? qty - saldo : null,
          status: qty != null ? (qty === saldo ? "ok" : "divergente") : "pendente",
        };
      });

      const { error: ipError } = await supabase
        .from("inventario_produtos")
        .insert(invProdutos);
      if (ipError) throw ipError;

      return inventario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      toast.success("Inventário criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar inventário: ${error.message}`);
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
      const updates: Record<string, unknown> = { status };
      if (status === "em_contagem") updates.data_inicio = new Date().toISOString();
      if (status === "finalizado") updates.data_fim = new Date().toISOString();

      const { error } = await supabase
        .from("inventarios")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
  });
}

export function useRegistrarContagem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contagens")
        .insert({
          inventario_id: inventarioId,
          produto_id: produtoId,
          usuario_id: user.id,
          quantidade,
          tipo,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventario_produtos", variables.inventarioId],
      });
    },
  });
}

export function useContagens(inventarioId: string | undefined) {
  return useQuery({
    queryKey: ["contagens", inventarioId],
    queryFn: async () => {
      if (!inventarioId) return [];
      const { data, error } = await supabase
        .from("contagens")
        .select("*, produtos(descricao, sku, codigo_barras)")
        .eq("inventario_id", inventarioId)
        .order("data_contagem", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!inventarioId,
  });
}

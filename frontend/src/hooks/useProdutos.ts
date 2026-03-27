import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Produto = Tables<"produtos">;
export type ProdutoInsert = TablesInsert<"produtos">;
export type ProdutoUpdate = TablesUpdate<"produtos">;

interface UseProdutosOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  ativo?: boolean;
}

export function useProdutos({ search = "", page = 0, pageSize = 50, ativo }: UseProdutosOptions = {}) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["produtos", profile?.empresa_id, search, page, pageSize, ativo],
    queryFn: async () => {
      if (!profile?.empresa_id) return { data: [], count: 0 };

      let query = supabase
        .from("produtos")
        .select("*", { count: "exact" })
        .eq("empresa_id", profile.empresa_id)
        .order("descricao", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (ativo !== undefined) {
        query = query.eq("ativo", ativo);
      }

      if (search.trim()) {
        query = query.or(
          `descricao.ilike.%${search}%,sku.ilike.%${search}%,codigo_barras.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Produto[], count: count ?? 0 };
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCreateProduto() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (produto: Omit<ProdutoInsert, "empresa_id">) => {
      if (!profile?.empresa_id) throw new Error("Empresa não configurada");
      const { data, error } = await supabase
        .from("produtos")
        .insert({ ...produto, empresa_id: profile.empresa_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto criado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar produto: ${error.message}`);
    },
  });
}

export function useUpdateProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProdutoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("produtos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto atualizado");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export function useDeleteProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto excluído");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });
}

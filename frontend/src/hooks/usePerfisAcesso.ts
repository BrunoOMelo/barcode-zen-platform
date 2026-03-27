import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export const MODULOS = ["inventarios", "produtos", "configuracoes", "relatorios"] as const;
export type Modulo = (typeof MODULOS)[number];

export const MODULO_LABELS: Record<Modulo, string> = {
  inventarios: "Inventários",
  produtos: "Produtos",
  configuracoes: "Configurações",
  relatorios: "Relatórios",
};

export interface Permissao {
  id?: string;
  perfil_id?: string;
  modulo: string;
  pode_ler: boolean;
  pode_alterar: boolean;
  pode_excluir: boolean;
  pode_compartilhar: boolean;
}

export interface PerfilAcesso {
  id: string;
  nome: string;
  descricao: string | null;
  empresa_id: string;
  created_at: string;
  permissoes: Permissao[];
}

export function usePerfisAcesso() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["perfis_acesso", profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data: perfis, error } = await supabase
        .from("perfis_acesso")
        .select("*")
        .eq("empresa_id", profile.empresa_id)
        .order("nome");
      if (error) throw error;

      const perfilIds = perfis.map((p: any) => p.id);
      if (!perfilIds.length) return [];

      const { data: permissoes } = await supabase
        .from("perfil_permissoes")
        .select("*")
        .in("perfil_id", perfilIds);

      return perfis.map((p: any) => ({
        ...p,
        permissoes: (permissoes ?? []).filter((perm: any) => perm.perfil_id === p.id),
      })) as PerfilAcesso[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCreatePerfil() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({
      nome,
      descricao,
      permissoes,
    }: {
      nome: string;
      descricao?: string;
      permissoes: Permissao[];
    }) => {
      if (!profile?.empresa_id) throw new Error("Sem empresa");
      const { data: perfil, error } = await supabase
        .from("perfis_acesso")
        .insert({ nome, descricao: descricao || null, empresa_id: profile.empresa_id })
        .select()
        .single();
      if (error) throw error;

      if (permissoes.length) {
        const rows = permissoes.map((p) => ({
          perfil_id: perfil.id,
          modulo: p.modulo,
          pode_ler: p.pode_ler,
          pode_alterar: p.pode_alterar,
          pode_excluir: p.pode_excluir,
          pode_compartilhar: p.pode_compartilhar,
        }));
        const { error: permError } = await supabase.from("perfil_permissoes").insert(rows);
        if (permError) throw permError;
      }
      return perfil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis_acesso"] });
      toast.success("Perfil criado!");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdatePerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      nome,
      descricao,
      permissoes,
    }: {
      id: string;
      nome: string;
      descricao?: string;
      permissoes: Permissao[];
    }) => {
      const { error } = await supabase
        .from("perfis_acesso")
        .update({ nome, descricao: descricao || null })
        .eq("id", id);
      if (error) throw error;

      // Delete existing and re-insert
      await supabase.from("perfil_permissoes").delete().eq("perfil_id", id);
      if (permissoes.length) {
        const rows = permissoes.map((p) => ({
          perfil_id: id,
          modulo: p.modulo,
          pode_ler: p.pode_ler,
          pode_alterar: p.pode_alterar,
          pode_excluir: p.pode_excluir,
          pode_compartilhar: p.pode_compartilhar,
        }));
        const { error: permError } = await supabase.from("perfil_permissoes").insert(rows);
        if (permError) throw permError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis_acesso"] });
      toast.success("Perfil atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeletePerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("perfis_acesso").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis_acesso"] });
      toast.success("Perfil excluído!");
    },
    onError: (e) => toast.error(e.message),
  });
}

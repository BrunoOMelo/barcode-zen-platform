import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useUserEmpresas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-empresas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_empresas")
        .select("empresa_id, empresas(id, nome, cnpj)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((ue: any) => ue.empresas).filter(Boolean);
    },
    enabled: !!user,
  });
}

export function useSwitchEmpresa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (empresaId: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ empresa_id: empresaId })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Empresa alterada!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

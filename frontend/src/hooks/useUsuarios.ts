import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type ProfileWithRole = Tables<"profiles"> & {
  user_roles?: { role: string }[];
};

export function useUsuarios() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["usuarios", profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("empresa_id", profile.empresa_id)
        .order("nome", { ascending: true });
      if (error) throw error;

      // Fetch roles separately since there's no direct FK from profiles to user_roles
      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      return profiles.map((p) => ({
        ...p,
        user_roles: (roles ?? [])
          .filter((r) => r.user_id === p.user_id)
          .map((r) => ({ role: r.role })),
      })) as ProfileWithRole[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "supervisor" | "operador";
    }) => {
      // Delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Role atualizada");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ativo }: { userId: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário atualizado");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

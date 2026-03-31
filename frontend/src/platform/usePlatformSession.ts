import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMeContext, listAvailableTenants, switchTenant } from "@/platform/api";
import { loadPlatformSession, savePlatformSession } from "@/platform/storage";
import type { AvailableTenant, MeContext } from "@/platform/types";

export interface PlatformSessionContextData {
  session: {
    apiBaseUrl: string;
    token: string;
    selectedTenantId: string;
  } | null;
  tenants: AvailableTenant[];
  me: MeContext | null;
  isLoading: boolean;
}

export function usePlatformSessionContext() {
  const queryClient = useQueryClient();
  const session = loadPlatformSession();

  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants", session?.apiBaseUrl, session?.selectedTenantId],
    queryFn: async () => {
      if (!session) return [] as AvailableTenant[];
      return listAvailableTenants(session.apiBaseUrl, session.token);
    },
    enabled: !!session,
  });

  const meQuery = useQuery({
    queryKey: ["platform", "me", session?.apiBaseUrl, session?.selectedTenantId],
    queryFn: async () => {
      if (!session) return null as MeContext | null;
      return getMeContext(session.apiBaseUrl, session.token, session.selectedTenantId);
    },
    enabled: !!session,
  });

  const switchTenantMutation = useMutation({
    mutationFn: async (targetTenantId: string) => {
      if (!session) {
        throw new Error("Sessao da plataforma nao encontrada.");
      }
      await switchTenant(session.apiBaseUrl, session.token, session.selectedTenantId, targetTenantId);
      savePlatformSession({
        apiBaseUrl: session.apiBaseUrl,
        token: session.token,
        selectedTenantId: targetTenantId,
      });
      return targetTenantId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      queryClient.invalidateQueries({ queryKey: ["inventario_produtos"] });
      queryClient.invalidateQueries({ queryKey: ["contagens"] });
    },
  });

  const data: PlatformSessionContextData = {
    session,
    tenants: tenantsQuery.data ?? [],
    me: meQuery.data ?? null,
    isLoading: tenantsQuery.isLoading || meQuery.isLoading,
  };

  return {
    ...data,
    switchTenant: switchTenantMutation.mutateAsync,
    isSwitching: switchTenantMutation.isPending,
  };
}

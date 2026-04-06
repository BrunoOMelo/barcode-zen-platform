import { loadPlatformSession } from "@/platform/storage";
import type {
  ApiErrorPayload,
  AvailableTenant,
  DashboardApiSummary,
  InventoryApiCountListResponse,
  InventoryApiCountRow,
  InventoryApiItem,
  InventoryImportApiRequest,
  InventoryImportApiResponse,
  InventoryApiItemsUpsertRequest,
  InventoryApiItemsResponse,
  InventoryApiListResponse,
  LoginResponse,
  MeContext,
  ProductApiCreateRequest,
  ProductApiItem,
  ProductApiListResponse,
  ProductApiUpdateRequest,
  SwitchTenantResponse,
} from "@/platform/types";
import { PlatformApiError } from "@/platform/types";

interface RequestOptions extends RequestInit {
  tenantId?: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function parseError(response: Response): Promise<PlatformApiError> {
  let payload: ApiErrorPayload = {};
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = {};
  }
  const message = payload.message ?? "Erro inesperado ao chamar a API.";
  return new PlatformApiError(response.status, message, payload.code);
}

async function request<T>(
  baseUrl: string,
  path: string,
  token: string,
  options?: RequestOptions,
): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options?.tenantId) {
    headers.set("X-Tenant-Id", options.tenantId);
  }
  if (options?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function publicRequest<T>(
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

function getStoredSessionOrThrow() {
  const session = loadPlatformSession();
  if (!session) {
    throw new PlatformApiError(401, "Sessao da plataforma nao encontrada. Faca login em /platform/login.", "platform.session_missing");
  }
  return session;
}

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export async function listAvailableTenants(baseUrl: string, token: string): Promise<AvailableTenant[]> {
  return request<AvailableTenant[]>(baseUrl, "/api/v1/me/tenants", token);
}

export async function loginWithPassword(
  baseUrl: string,
  payload: { email: string; password: string },
): Promise<LoginResponse> {
  return publicRequest<LoginResponse>(baseUrl, "/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });
}

export async function getMeContext(baseUrl: string, token: string, tenantId: string): Promise<MeContext> {
  return request<MeContext>(baseUrl, "/api/v1/me/context", token, {
    method: "GET",
    tenantId,
  });
}

export async function switchTenant(
  baseUrl: string,
  token: string,
  currentTenantId: string,
  targetTenantId: string,
): Promise<SwitchTenantResponse> {
  return request<SwitchTenantResponse>(baseUrl, "/api/v1/me/switch-tenant", token, {
    method: "POST",
    tenantId: currentTenantId,
    body: JSON.stringify({ tenant_id: targetTenantId }),
  });
}

export async function listProductsFromSession(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: boolean;
  category?: string;
}): Promise<ProductApiListResponse> {
  const session = getStoredSessionOrThrow();
  const query = toQueryString({
    page: params?.page,
    page_size: params?.pageSize,
    search: params?.search,
    active: params?.active,
    category: params?.category,
  });
  return request<ProductApiListResponse>(
    session.apiBaseUrl,
    `/api/v1/products/${query}`,
    session.token,
    {
      method: "GET",
      tenantId: session.selectedTenantId,
    },
  );
}

export async function createProductFromSession(payload: ProductApiCreateRequest): Promise<ProductApiItem> {
  const session = getStoredSessionOrThrow();
  return request<ProductApiItem>(session.apiBaseUrl, "/api/v1/products/", session.token, {
    method: "POST",
    tenantId: session.selectedTenantId,
    body: JSON.stringify(payload),
  });
}

export async function updateProductFromSession(productId: string, payload: ProductApiUpdateRequest): Promise<ProductApiItem> {
  const session = getStoredSessionOrThrow();
  return request<ProductApiItem>(session.apiBaseUrl, `/api/v1/products/${productId}`, session.token, {
    method: "PUT",
    tenantId: session.selectedTenantId,
    body: JSON.stringify(payload),
  });
}

export async function deleteProductFromSession(productId: string): Promise<void> {
  const session = getStoredSessionOrThrow();
  await request<void>(session.apiBaseUrl, `/api/v1/products/${productId}`, session.token, {
    method: "DELETE",
    tenantId: session.selectedTenantId,
  });
}

export async function listInventoriesFromSession(params?: {
  page?: number;
  pageSize?: number;
  status?: InventoryApiItem["status"];
  search?: string;
}): Promise<InventoryApiListResponse> {
  const session = getStoredSessionOrThrow();
  const query = toQueryString({
    page: params?.page,
    page_size: params?.pageSize,
    status: params?.status,
    search: params?.search,
  });
  return request<InventoryApiListResponse>(
    session.apiBaseUrl,
    `/api/v1/inventories/${query}`,
    session.token,
    {
      method: "GET",
      tenantId: session.selectedTenantId,
    },
  );
}

export async function getInventoryFromSession(inventoryId: string): Promise<InventoryApiItem> {
  const session = getStoredSessionOrThrow();
  return request<InventoryApiItem>(session.apiBaseUrl, `/api/v1/inventories/${inventoryId}`, session.token, {
    method: "GET",
    tenantId: session.selectedTenantId,
  });
}

export async function createInventoryFromSession(name: string): Promise<InventoryApiItem> {
  const session = getStoredSessionOrThrow();
  return request<InventoryApiItem>(session.apiBaseUrl, "/api/v1/inventories/", session.token, {
    method: "POST",
    tenantId: session.selectedTenantId,
    body: JSON.stringify({ name }),
  });
}

export async function createInventoryFromSpreadsheetFromSession(
  payload: InventoryImportApiRequest,
): Promise<InventoryImportApiResponse> {
  const session = getStoredSessionOrThrow();
  return request<InventoryImportApiResponse>(
    session.apiBaseUrl,
    "/api/v1/inventories/import",
    session.token,
    {
      method: "POST",
      tenantId: session.selectedTenantId,
      body: JSON.stringify(payload),
    },
  );
}

export async function changeInventoryStatusFromSession(
  inventoryId: string,
  status: InventoryApiItem["status"],
): Promise<InventoryApiItem> {
  const session = getStoredSessionOrThrow();
  return request<InventoryApiItem>(
    session.apiBaseUrl,
    `/api/v1/inventories/${inventoryId}/status`,
    session.token,
    {
      method: "PATCH",
      tenantId: session.selectedTenantId,
      body: JSON.stringify({ status }),
    },
  );
}

export async function listInventoryItemsFromSession(inventoryId: string): Promise<InventoryApiItemsResponse> {
  const session = getStoredSessionOrThrow();
  return request<InventoryApiItemsResponse>(
    session.apiBaseUrl,
    `/api/v1/inventories/${inventoryId}/items`,
    session.token,
    {
      method: "GET",
      tenantId: session.selectedTenantId,
    },
  );
}

export async function addInventoryItemsFromSession(
  inventoryId: string,
  payload: InventoryApiItemsUpsertRequest,
): Promise<InventoryApiItemsResponse> {
  const session = getStoredSessionOrThrow();
  const requestBody =
    payload.items && payload.items.length > 0
      ? {
          items: payload.items.map((item) => ({
            product_id: item.product_id,
            system_quantity: item.system_quantity,
            counted_quantity: item.counted_quantity,
          })),
        }
      : {
          product_ids: payload.product_ids ?? [],
        };

  return request<InventoryApiItemsResponse>(
    session.apiBaseUrl,
    `/api/v1/inventories/${inventoryId}/items`,
    session.token,
    {
      method: "POST",
      tenantId: session.selectedTenantId,
      body: JSON.stringify(requestBody),
    },
  );
}

export async function registerInventoryCountFromSession(
  inventoryId: string,
  payload: {
    productId: string;
    quantity: number;
    countType?: "first" | "recount";
  },
): Promise<InventoryApiCountRow> {
  const session = getStoredSessionOrThrow();
  return request<InventoryApiCountRow>(
    session.apiBaseUrl,
    `/api/v1/inventories/${inventoryId}/counts`,
    session.token,
    {
      method: "POST",
      tenantId: session.selectedTenantId,
      body: JSON.stringify({
        product_id: payload.productId,
        quantity: payload.quantity,
        count_type: payload.countType,
      }),
    },
  );
}

export async function listInventoryCountsFromSession(
  inventoryId: string,
  params?: {
    page?: number;
    pageSize?: number;
    productId?: string;
  },
): Promise<InventoryApiCountListResponse> {
  const session = getStoredSessionOrThrow();
  const query = toQueryString({
    page: params?.page,
    page_size: params?.pageSize,
    product_id: params?.productId,
  });
  return request<InventoryApiCountListResponse>(
    session.apiBaseUrl,
    `/api/v1/inventories/${inventoryId}/counts${query}`,
    session.token,
    {
      method: "GET",
      tenantId: session.selectedTenantId,
    },
  );
}

export async function getDashboardSummaryFromSession(): Promise<DashboardApiSummary> {
  const session = getStoredSessionOrThrow();
  return request<DashboardApiSummary>(
    session.apiBaseUrl,
    "/api/v1/dashboard/summary",
    session.token,
    {
      method: "GET",
      tenantId: session.selectedTenantId,
    },
  );
}

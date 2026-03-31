export interface ApiErrorPayload {
  message?: string;
  code?: string;
}

export class PlatformApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface AvailableTenant {
  tenant_id: string;
  membership_id: string;
  tenant_name: string;
  tenant_slug: string;
  role: string;
  is_default: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  available_tenants: AvailableTenant[];
  default_tenant_id: string;
}

export interface MeContext {
  user_id: string;
  email: string | null;
  tenant_id: string;
  membership_id: string;
  role: string;
  permissions: string[];
}

export interface SwitchTenantResponse {
  previous_tenant_id: string;
  current_tenant_id: string;
  role: string;
  permissions: string[];
}

export interface PlatformSessionData {
  apiBaseUrl: string;
  token: string;
  selectedTenantId: string;
}

export interface ProductApiItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  description: string | null;
  category: string | null;
  active: boolean;
  cost: number | null;
  price: number | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ProductApiListResponse {
  items: ProductApiItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ProductApiCreateRequest {
  name: string;
  sku?: string;
  barcode: string;
  description?: string;
  category?: string;
  active?: boolean;
  cost?: number;
  price?: number;
  quantity?: number;
}

export interface ProductApiUpdateRequest {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  active?: boolean;
  cost?: number;
  price?: number;
  quantity?: number;
}

export interface InventoryApiItem {
  id: string;
  tenant_id: string;
  name: string;
  status: "created" | "counting" | "recounting" | "review" | "finished";
  created_by: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryApiListResponse {
  items: InventoryApiItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface InventoryApiItemRow {
  id: string;
  inventory_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_barcode: string;
  system_quantity: number;
  counted_quantity: number | null;
  difference: number | null;
  status: "pending" | "counted" | "divergent";
  counted_by: string | null;
  counted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryApiItemsResponse {
  items: InventoryApiItemRow[];
  total: number;
}

export interface InventoryApiCountRow {
  id: string;
  inventory_id: string;
  inventory_item_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_barcode: string;
  counted_by: string;
  count_type: "first" | "recount";
  quantity: number;
  created_at: string;
}

export interface InventoryApiCountListResponse {
  items: InventoryApiCountRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface DashboardApiRecentInventory {
  id: string;
  name: string;
  status: "created" | "counting" | "recounting" | "review" | "finished";
  created_at: string;
}

export interface DashboardApiProgressRow {
  inventory_id: string;
  name: string;
  total: number;
  counted: number;
  pending: number;
  percentage: number;
}

export interface DashboardApiDivergenceRow {
  inventory_id: string;
  name: string;
  ok: number;
  divergent: number;
}

export interface DashboardApiCategoryRow {
  category: string;
  quantity: number;
}

export interface DashboardApiSummary {
  active_inventories: number;
  finished_inventories: number;
  total_products: number;
  counted_products: number;
  divergent_items: number;
  recent_inventories: DashboardApiRecentInventory[];
  progress_by_inventory: DashboardApiProgressRow[];
  divergence_by_inventory: DashboardApiDivergenceRow[];
  categories_distribution: DashboardApiCategoryRow[];
}

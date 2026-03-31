import type { PlatformSessionData } from "@/platform/types";

const PLATFORM_SESSION_KEY = "barcode_zen_platform_session";

export function loadPlatformSession(): PlatformSessionData | null {
  const raw = localStorage.getItem(PLATFORM_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PlatformSessionData;
    if (!parsed.apiBaseUrl || !parsed.token || !parsed.selectedTenantId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePlatformSession(data: PlatformSessionData): void {
  localStorage.setItem(PLATFORM_SESSION_KEY, JSON.stringify(data));
}

export function clearPlatformSession(): void {
  localStorage.removeItem(PLATFORM_SESSION_KEY);
}

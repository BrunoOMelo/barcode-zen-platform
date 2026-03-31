function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value.trim().toLowerCase() === "true";
}

export const platformFlags = {
  cutoverProducts: parseBoolean(import.meta.env.VITE_PLATFORM_CUTOVER_PRODUCTS, true),
  cutoverInventories: parseBoolean(import.meta.env.VITE_PLATFORM_CUTOVER_INVENTORIES, true),
};

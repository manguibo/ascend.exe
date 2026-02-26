export type RailDensity = "FULL" | "COMPACT";

export const UI_RAIL_DENSITY_STORAGE_KEY = "ascend.ui.rail-density.v1";
export const UI_RAIL_DENSITY_UPDATED_EVENT = "ascend:ui-rail-density-updated";
export const defaultRailDensity: RailDensity = "FULL";

let cachedSerialized: string | null | undefined;
let cachedDensity: RailDensity = defaultRailDensity;

function parseRailDensity(value: unknown): RailDensity {
  return value === "COMPACT" ? "COMPACT" : defaultRailDensity;
}

export function getRailDensitySnapshot(): RailDensity {
  if (typeof window === "undefined") {
    return defaultRailDensity;
  }

  const stored = window.localStorage.getItem(UI_RAIL_DENSITY_STORAGE_KEY);
  if (stored === cachedSerialized) {
    return cachedDensity;
  }

  cachedSerialized = stored;
  if (!stored) {
    cachedDensity = defaultRailDensity;
    return cachedDensity;
  }

  cachedDensity = parseRailDensity(stored);
  return cachedDensity;
}

export function saveRailDensity(value: RailDensity): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = parseRailDensity(value);
  cachedSerialized = normalized;
  cachedDensity = normalized;
  window.localStorage.setItem(UI_RAIL_DENSITY_STORAGE_KEY, normalized);
  window.dispatchEvent(new Event(UI_RAIL_DENSITY_UPDATED_EVENT));
}

export function subscribeRailDensity(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === UI_RAIL_DENSITY_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(UI_RAIL_DENSITY_UPDATED_EVENT, handleUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(UI_RAIL_DENSITY_UPDATED_EVENT, handleUpdate);
  };
}

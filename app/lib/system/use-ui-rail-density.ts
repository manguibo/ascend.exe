"use client";

import { useCallback, useSyncExternalStore } from "react";
import { defaultRailDensity, getRailDensitySnapshot, saveRailDensity, subscribeRailDensity, type RailDensity } from "./ui-rail-state";

export function useUiRailDensity() {
  const density = useSyncExternalStore(subscribeRailDensity, getRailDensitySnapshot, () => defaultRailDensity);

  const setDensity = useCallback((value: RailDensity) => {
    saveRailDensity(value);
  }, []);

  const toggleDensity = useCallback(() => {
    saveRailDensity(density === "FULL" ? "COMPACT" : "FULL");
  }, [density]);

  return { density, setDensity, toggleDensity };
}

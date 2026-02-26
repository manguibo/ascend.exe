"use client";

import { useMemo } from "react";
import { buildPerformanceView } from "./performance-view";
import type { SystemSnapshot } from "./types";

export function usePerformanceView(snapshot: SystemSnapshot) {
  return useMemo(() => buildPerformanceView(snapshot), [snapshot]);
}

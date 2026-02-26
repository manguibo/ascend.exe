"use client";

import { useSyncExternalStore } from "react";
import { loadSessionHistoryEntries, subscribeSessionHistory } from "./session-history";

const emptyHistoryEntries: readonly [] = [];

export function useSessionHistory() {
  const entries = useSyncExternalStore(subscribeSessionHistory, loadSessionHistoryEntries, () => emptyHistoryEntries);
  return { entries };
}

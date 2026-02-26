"use client";

import { useCallback, useMemo, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { buildSystemSnapshotFromLogInput } from "@/lib/system/mock-data";
import {
  defaultSessionLogInput,
  getSessionLogInputSnapshot,
  subscribeSessionLogInput,
  saveSessionLogInput,
  type SessionLogInput,
} from "@/lib/system/session-state";

export function useSystemSnapshot() {
  const input = useSyncExternalStore(subscribeSessionLogInput, getSessionLogInputSnapshot, () => defaultSessionLogInput);

  const setInput = useCallback<Dispatch<SetStateAction<SessionLogInput>>>(
    (value) => {
      const current = getSessionLogInputSnapshot();
      const nextValue = typeof value === "function" ? value(current) : value;
      saveSessionLogInput(nextValue);
    },
    [],
  );

  const snapshot = useMemo(() => buildSystemSnapshotFromLogInput(input), [input]);

  return { snapshot, input, setInput };
}

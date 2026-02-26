"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getPanelOpenSnapshot, savePanelOpenSnapshot, subscribePanelState } from "./ui-panel-state";

export function useUiPanelOpen(panelId: string, defaultOpen: boolean) {
  const open = useSyncExternalStore(
    subscribePanelState,
    () => getPanelOpenSnapshot(panelId, defaultOpen),
    () => defaultOpen,
  );

  const setOpen = useCallback(
    (value: boolean) => {
      savePanelOpenSnapshot(panelId, value);
    },
    [panelId],
  );

  const toggleOpen = useCallback(() => {
    savePanelOpenSnapshot(panelId, !open);
  }, [panelId, open]);

  return { open, setOpen, toggleOpen };
}

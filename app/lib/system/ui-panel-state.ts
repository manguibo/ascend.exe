export const UI_PANEL_STATE_STORAGE_KEY = "ascend.ui.panel-state.v1";
export const UI_PANEL_STATE_UPDATED_EVENT = "ascend:ui-panel-state-updated";

type PanelStateRecord = Record<string, boolean>;

let cachedSerialized: string | null | undefined;
let cachedRecord: PanelStateRecord = {};

function parseRecord(value: unknown): PanelStateRecord {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const output: PanelStateRecord = {};
  for (const [key, state] of Object.entries(raw)) {
    if (typeof state === "boolean") {
      output[key] = state;
    }
  }
  return output;
}

function loadRecordFromStorage(): PanelStateRecord {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(UI_PANEL_STATE_STORAGE_KEY);
  if (stored === cachedSerialized) {
    return cachedRecord;
  }

  cachedSerialized = stored;
  if (!stored) {
    cachedRecord = {};
    return cachedRecord;
  }

  try {
    cachedRecord = parseRecord(JSON.parse(stored));
    return cachedRecord;
  } catch {
    cachedRecord = {};
    return cachedRecord;
  }
}

function saveRecordToStorage(record: PanelStateRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(record);
  cachedSerialized = serialized;
  cachedRecord = record;
  window.localStorage.setItem(UI_PANEL_STATE_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(UI_PANEL_STATE_UPDATED_EVENT));
}

export function getPanelOpenSnapshot(panelId: string, fallback: boolean): boolean {
  const record = loadRecordFromStorage();
  return panelId in record ? record[panelId] : fallback;
}

export function savePanelOpenSnapshot(panelId: string, open: boolean): void {
  const current = loadRecordFromStorage();
  saveRecordToStorage({ ...current, [panelId]: open });
}

export function subscribePanelState(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === UI_PANEL_STATE_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(UI_PANEL_STATE_UPDATED_EVENT, handleUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(UI_PANEL_STATE_UPDATED_EVENT, handleUpdate);
  };
}

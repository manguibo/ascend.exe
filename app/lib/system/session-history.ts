import { buildBodyRecoveryView } from "./body-recovery";
import { buildSystemSnapshotFromLogInput } from "./mock-data";
import { sanitizeSessionLogInput, type SessionLogInput } from "./session-state";

export type SessionHistoryEntry = {
  id: string;
  timestampIso: string;
  totalXp: number;
  sessionXp: number;
  discipline: string;
  activityCodename: string;
  profile: string;
  regionReadiness: Record<string, number>;
  developmentAvgPct: number;
};

type SessionHistoryRecord = {
  entries: SessionHistoryEntry[];
};

export const SESSION_HISTORY_STORAGE_KEY = "ascend.session.history.v1";
export const SESSION_HISTORY_UPDATED_EVENT = "ascend:session-history-updated";
const MAX_ENTRIES = 60;

let cachedSerialized: string | null | undefined;
let cachedRecord: SessionHistoryRecord = { entries: [] };

function parseRecord(value: unknown): SessionHistoryRecord {
  if (typeof value !== "object" || value === null) {
    return { entries: [] };
  }

  const raw = value as { entries?: unknown };
  if (!Array.isArray(raw.entries)) {
    return { entries: [] };
  }

  const entries = raw.entries
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => entry as SessionHistoryEntry)
    .filter((entry) => typeof entry.id === "string" && typeof entry.timestampIso === "string")
    .slice(-MAX_ENTRIES);

  return { entries };
}

function getRecordSnapshot(): SessionHistoryRecord {
  if (typeof window === "undefined") {
    return cachedRecord;
  }

  const stored = window.localStorage.getItem(SESSION_HISTORY_STORAGE_KEY);
  if (stored === cachedSerialized) {
    return cachedRecord;
  }

  cachedSerialized = stored;
  if (!stored) {
    cachedRecord = { entries: [] };
    return cachedRecord;
  }

  try {
    cachedRecord = parseRecord(JSON.parse(stored));
    return cachedRecord;
  } catch {
    cachedRecord = { entries: [] };
    return cachedRecord;
  }
}

function saveRecord(record: SessionHistoryRecord): void {
  const serialized = JSON.stringify(record);
  cachedSerialized = serialized;
  cachedRecord = record;

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(SESSION_HISTORY_UPDATED_EVENT));
}

export function loadSessionHistoryEntries(): readonly SessionHistoryEntry[] {
  return getRecordSnapshot().entries;
}

export function appendSessionHistoryEntry(input: SessionLogInput): SessionHistoryEntry | null {
  const sanitized = sanitizeSessionLogInput(input);
  const snapshot = buildSystemSnapshotFromLogInput(sanitized);
  const body = buildBodyRecoveryView(sanitized);
  const regionReadiness = Object.fromEntries(body.regions.map((region) => [region.id, region.readinessPct]));
  const developmentAvgPct = Math.round((body.development.compositionPct + body.development.strengthPct + body.development.conditioningPct) / 3);
  const timestampIso = new Date().toISOString();

  const entry: SessionHistoryEntry = {
    id: `${timestampIso}-${Math.random().toString(36).slice(2, 8)}`,
    timestampIso,
    totalXp: snapshot.xp.totalXp,
    sessionXp: snapshot.xp.sessionXp,
    discipline: snapshot.discipline,
    activityCodename: sanitized.primaryActivityCodename,
    profile: body.profile,
    regionReadiness,
    developmentAvgPct,
  };

  const current = getRecordSnapshot();
  const next = { entries: [...current.entries, entry].slice(-MAX_ENTRIES) };
  saveRecord(next);
  return entry;
}

export function clearSessionHistory(): void {
  saveRecord({ entries: [] });
}

export function subscribeSessionHistory(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SESSION_HISTORY_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleUpdate = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SESSION_HISTORY_UPDATED_EVENT, handleUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SESSION_HISTORY_UPDATED_EVENT, handleUpdate);
  };
}

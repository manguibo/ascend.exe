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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, min, max);
}

function parseText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : fallback;
}

function parseTimestampIso(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? value : null;
}

function parseRegionReadiness(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([key]) => typeof key === "string" && key.length > 0 && key.length <= 24)
      .map(([key, metric]) => [key, parseNumber(metric, 0, 0, 100)]),
  );
}

function sanitizeHistoryEntry(value: unknown, index: number): SessionHistoryEntry | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Partial<SessionHistoryEntry>;
  const timestampIso = parseTimestampIso(raw.timestampIso);
  if (!timestampIso) {
    return null;
  }

  const fallbackId = `${timestampIso}-${String(index + 1).padStart(2, "0")}`;
  return {
    id: parseText(raw.id, fallbackId, 64),
    timestampIso,
    totalXp: parseNumber(raw.totalXp, 0, 0, 1_000_000_000),
    sessionXp: parseNumber(raw.sessionXp, 0, 0, 1_000_000),
    discipline: parseText(raw.discipline, "STABLE", 24),
    activityCodename: parseText(raw.activityCodename, "UNKNOWN", 64),
    profile: parseText(raw.profile, "FULL", 24),
    regionReadiness: parseRegionReadiness(raw.regionReadiness),
    developmentAvgPct: parseNumber(raw.developmentAvgPct, 0, 0, 100),
  };
}

function parseRecord(value: unknown): SessionHistoryRecord {
  if (typeof value !== "object" || value === null) {
    return { entries: [] };
  }

  const raw = value as { entries?: unknown };
  if (!Array.isArray(raw.entries)) {
    return { entries: [] };
  }

  const entries = raw.entries.map((entry, index) => sanitizeHistoryEntry(entry, index)).filter((entry) => entry !== null).slice(-MAX_ENTRIES);

  return { entries: entries as SessionHistoryEntry[] };
}

function buildEntryId(existingEntries: readonly SessionHistoryEntry[], timestampIso: string): string {
  const sequence = existingEntries.reduce((count, entry) => (entry.timestampIso === timestampIso ? count + 1 : count), 0) + 1;
  return `${timestampIso}-${String(sequence).padStart(2, "0")}`;
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

  const current = getRecordSnapshot();
  const entry: SessionHistoryEntry = {
    id: buildEntryId(current.entries, timestampIso),
    timestampIso,
    totalXp: snapshot.xp.totalXp,
    sessionXp: snapshot.xp.sessionXp,
    discipline: snapshot.discipline,
    activityCodename: sanitized.primaryActivityCodename,
    profile: body.profile,
    regionReadiness,
    developmentAvgPct,
  };

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

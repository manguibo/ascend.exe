import type { DisciplineState } from "@/lib/system/types";
import type { TrainingCadence } from "@/lib/xp/calculations";
import { activityCatalog, defaultActivityDefinition } from "./activity-catalog";

export type BodyTrainingProfile = "AUTO" | "FULL" | "PUSH" | "PULL" | "LOWER" | "CONDITIONING";
export type InjuryRegionId = "NONE" | "CHEST" | "BACK" | "SHOULDERS" | "ARMS" | "CORE" | "GLUTES" | "QUADS" | "HAMSTRINGS";

export type SessionLogInput = {
  primaryActivityCodename: string;
  activityId: string;
  bodyTrainingProfile: BodyTrainingProfile;
  expectedCadence: TrainingCadence;
  baseRate: number;
  intensityMultiplier: number;
  durationMultiplier: number;
  outcomeMultiplier: number;
  consistencyMultiplier: number;
  totalXpBeforeSession: number;
  inactiveDays: number;
  decayRatePct: number;
  levelStartXp: number;
  heightCm: number;
  bodyWeightKg: number;
  targetWeightKg: number;
  fitnessBaselinePct: number;
  injuryRegionId: InjuryRegionId;
  injurySeverityLevel: number;
  recentDisciplineStates: DisciplineState[];
};

export const SESSION_LOG_STORAGE_KEY = "ascend.session.log.v1";
export const SESSION_LOG_UPDATED_EVENT = "ascend:session-log-updated";

export const defaultSessionLogInput: SessionLogInput = {
  primaryActivityCodename: defaultActivityDefinition.codename,
  activityId: defaultActivityDefinition.id,
  bodyTrainingProfile: "AUTO",
  expectedCadence: "DAILY",
  baseRate: 120,
  intensityMultiplier: 1.3,
  durationMultiplier: 1.15,
  outcomeMultiplier: 0.85,
  consistencyMultiplier: 1.1,
  totalXpBeforeSession: 12272,
  inactiveDays: 1,
  decayRatePct: 2,
  levelStartXp: 12000,
  heightCm: 178,
  bodyWeightKg: 82,
  targetWeightKg: 80,
  fitnessBaselinePct: 66,
  injuryRegionId: "NONE",
  injurySeverityLevel: 0,
  recentDisciplineStates: ["OPTIMAL", "STABLE", "STABLE", "DECLINING", "DECLINING", "DECLINING", "DECLINING"],
};

let cachedSerialized: string | null | undefined;
let cachedSnapshot: SessionLogInput = defaultSessionLogInput;

type SessionLogField = {
  key: Exclude<
    keyof SessionLogInput,
    | "primaryActivityCodename"
    | "activityId"
    | "bodyTrainingProfile"
    | "expectedCadence"
    | "recentDisciplineStates"
    | "heightCm"
    | "bodyWeightKg"
    | "targetWeightKg"
    | "fitnessBaselinePct"
    | "injuryRegionId"
    | "injurySeverityLevel"
  >;
  label: string;
  step?: string;
};

type BodySignalField = {
  key: "heightCm" | "bodyWeightKg" | "targetWeightKg" | "fitnessBaselinePct";
  label: string;
  step?: string;
};

export const sessionLogFields: readonly SessionLogField[] = [
  { key: "baseRate", label: "BASE RATE", step: "1" },
  { key: "intensityMultiplier", label: "INTENSITY MULTIPLIER", step: "0.01" },
  { key: "durationMultiplier", label: "DURATION MULTIPLIER", step: "0.01" },
  { key: "outcomeMultiplier", label: "OUTCOME MULTIPLIER", step: "0.01" },
  { key: "consistencyMultiplier", label: "CONSISTENCY MULTIPLIER", step: "0.01" },
  { key: "totalXpBeforeSession", label: "TOTAL XP BEFORE SESSION", step: "1" },
  { key: "inactiveDays", label: "INACTIVE DAYS", step: "1" },
  { key: "decayRatePct", label: "DECAY RATE (%)", step: "0.1" },
  { key: "levelStartXp", label: "LEVEL START XP", step: "1" },
];

export const bodySignalFields: readonly BodySignalField[] = [
  { key: "heightCm", label: "HEIGHT (CM)", step: "1" },
  { key: "bodyWeightKg", label: "BODY WEIGHT (KG)", step: "0.1" },
  { key: "targetWeightKg", label: "TARGET WEIGHT (KG)", step: "0.1" },
  { key: "fitnessBaselinePct", label: "FITNESS BASELINE (%)", step: "1" },
];

export const disciplineStateOptions: readonly DisciplineState[] = ["OPTIMAL", "STABLE", "DECLINING", "COMPROMISED"];
export const cadenceOptions: readonly TrainingCadence[] = ["DAILY", "THREE_PER_WEEK", "WEEKLY"];
export const bodyTrainingProfileOptions: readonly BodyTrainingProfile[] = ["AUTO", "FULL", "PUSH", "PULL", "LOWER", "CONDITIONING"];
export const injuryRegionOptions: readonly InjuryRegionId[] = ["NONE", "CHEST", "BACK", "SHOULDERS", "ARMS", "CORE", "GLUTES", "QUADS", "HAMSTRINGS"];
export const activityOptions = activityCatalog.map((activity) => ({ id: activity.id, label: activity.label }));

function parseNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = parseNumber(value, fallback);
  return Math.max(min, Math.min(max, parsed));
}

function parsePercent(value: unknown, fallback: number): number {
  return parseBoundedNumber(value, fallback, 0, 100);
}

function parseActivityCodename(value: unknown): string {
  if (typeof value !== "string") {
    return defaultSessionLogInput.primaryActivityCodename;
  }

  const trimmed = value.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed.slice(0, 48) : defaultSessionLogInput.primaryActivityCodename;
}

function parseActivityId(value: unknown): string {
  if (typeof value !== "string") {
    return defaultSessionLogInput.activityId;
  }

  return activityCatalog.some((activity) => activity.id === value) ? value : defaultSessionLogInput.activityId;
}

function parseCadence(value: unknown): TrainingCadence {
  if (typeof value !== "string") {
    return defaultSessionLogInput.expectedCadence;
  }

  return cadenceOptions.includes(value as TrainingCadence) ? (value as TrainingCadence) : defaultSessionLogInput.expectedCadence;
}

function parseBodyTrainingProfile(value: unknown): BodyTrainingProfile {
  if (typeof value !== "string") {
    return defaultSessionLogInput.bodyTrainingProfile;
  }

  return bodyTrainingProfileOptions.includes(value as BodyTrainingProfile)
    ? (value as BodyTrainingProfile)
    : defaultSessionLogInput.bodyTrainingProfile;
}

function parseInjuryRegion(value: unknown): InjuryRegionId {
  if (typeof value !== "string") {
    return defaultSessionLogInput.injuryRegionId;
  }

  return injuryRegionOptions.includes(value as InjuryRegionId) ? (value as InjuryRegionId) : defaultSessionLogInput.injuryRegionId;
}

function parseDisciplineState(value: unknown, fallback: DisciplineState): DisciplineState {
  if (typeof value !== "string") {
    return fallback;
  }

  return disciplineStateOptions.includes(value as DisciplineState) ? (value as DisciplineState) : fallback;
}

function parseRecentDisciplineStates(value: unknown): DisciplineState[] {
  const fallback = defaultSessionLogInput.recentDisciplineStates;
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = fallback.map((defaultState, index) => parseDisciplineState(value[index], defaultState));
  return normalized;
}

export function sanitizeSessionLogInput(rawValue: unknown): SessionLogInput {
  const raw = typeof rawValue === "object" && rawValue !== null ? (rawValue as Record<string, unknown>) : {};

  return {
    primaryActivityCodename: parseActivityCodename(raw.primaryActivityCodename),
    activityId: parseActivityId(raw.activityId),
    bodyTrainingProfile: parseBodyTrainingProfile(raw.bodyTrainingProfile),
    expectedCadence: parseCadence(raw.expectedCadence),
    baseRate: parseBoundedNumber(raw.baseRate, defaultSessionLogInput.baseRate, 1, 10_000),
    intensityMultiplier: parseBoundedNumber(raw.intensityMultiplier, defaultSessionLogInput.intensityMultiplier, 0, 3),
    durationMultiplier: parseBoundedNumber(raw.durationMultiplier, defaultSessionLogInput.durationMultiplier, 0, 3),
    outcomeMultiplier: parseBoundedNumber(raw.outcomeMultiplier, defaultSessionLogInput.outcomeMultiplier, 0, 2),
    consistencyMultiplier: parseBoundedNumber(raw.consistencyMultiplier, defaultSessionLogInput.consistencyMultiplier, 0, 3),
    totalXpBeforeSession: parseBoundedNumber(raw.totalXpBeforeSession, defaultSessionLogInput.totalXpBeforeSession, 0, 1_000_000_000),
    inactiveDays: parseBoundedNumber(raw.inactiveDays, defaultSessionLogInput.inactiveDays, 0, 365),
    decayRatePct: parseBoundedNumber(raw.decayRatePct, defaultSessionLogInput.decayRatePct, 0, 20),
    levelStartXp: parseBoundedNumber(raw.levelStartXp, defaultSessionLogInput.levelStartXp, 0, 1_000_000_000),
    heightCm: parseBoundedNumber(raw.heightCm, defaultSessionLogInput.heightCm, 120, 230),
    bodyWeightKg: parseBoundedNumber(raw.bodyWeightKg, defaultSessionLogInput.bodyWeightKg, 20, 350),
    targetWeightKg: parseBoundedNumber(raw.targetWeightKg, defaultSessionLogInput.targetWeightKg, 20, 350),
    fitnessBaselinePct: parsePercent(raw.fitnessBaselinePct, defaultSessionLogInput.fitnessBaselinePct),
    injuryRegionId: parseInjuryRegion(raw.injuryRegionId),
    injurySeverityLevel: parseBoundedNumber(raw.injurySeverityLevel, defaultSessionLogInput.injurySeverityLevel, 0, 10),
    recentDisciplineStates: parseRecentDisciplineStates(raw.recentDisciplineStates),
  };
}

export function loadSessionLogInput(): SessionLogInput {
  return getSessionLogInputSnapshot();
}

export function getSessionLogInputSnapshot(): SessionLogInput {
  if (typeof window === "undefined") {
    return defaultSessionLogInput;
  }

  const stored = window.localStorage.getItem(SESSION_LOG_STORAGE_KEY);
  if (stored === cachedSerialized) {
    return cachedSnapshot;
  }

  cachedSerialized = stored;
  if (!stored) {
    cachedSnapshot = defaultSessionLogInput;
    return cachedSnapshot;
  }

  try {
    cachedSnapshot = sanitizeSessionLogInput(JSON.parse(stored));
    return cachedSnapshot;
  } catch {
    cachedSnapshot = defaultSessionLogInput;
    return cachedSnapshot;
  }
}

export function saveSessionLogInput(value: SessionLogInput): void {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizeSessionLogInput(value);
  const serialized = JSON.stringify(sanitized);
  cachedSerialized = serialized;
  cachedSnapshot = sanitized;

  window.localStorage.setItem(SESSION_LOG_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(SESSION_LOG_UPDATED_EVENT));
}

export function subscribeSessionLogInput(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SESSION_LOG_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SESSION_LOG_UPDATED_EVENT, handleCustomUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SESSION_LOG_UPDATED_EVENT, handleCustomUpdate);
  };
}

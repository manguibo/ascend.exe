import type { DisciplineState } from "./types";
import type { BodyTrainingProfile, SessionLogInput } from "./session-state";
import type { SessionHistoryEntry } from "./session-history";
import { getActivityDefinition } from "./activity-catalog";

export type BodyRegionId = "CHEST" | "BACK" | "SHOULDERS" | "ARMS" | "CORE" | "GLUTES" | "QUADS" | "HAMSTRINGS";
export type BodyRegionStatus = "READY" | "MONITOR" | "RECOVER";
export type DevelopmentStatus = "ADVANCING" | "HOLD" | "DEGRADED";

export type BodyRegionSignal = {
  id: BodyRegionId;
  label: string;
  readinessPct: number;
  loadPct: number;
  recoveryPct: number;
  status: BodyRegionStatus;
};

export type PhysicalDevelopmentSignals = {
  bodyWeightKg: number;
  targetWeightKg: number;
  weightDeltaKg: number;
  compositionPct: number;
  strengthPct: number;
  conditioningPct: number;
  status: DevelopmentStatus;
};

export type BodyRecoveryView = {
  profile: Exclude<BodyTrainingProfile, "AUTO">;
  regions: readonly BodyRegionSignal[];
  development: PhysicalDevelopmentSignals;
};

export type BodyRegionInsight = {
  deltaPct: number;
  etaDays: number | null;
};

const regionOrder: readonly BodyRegionId[] = ["CHEST", "BACK", "SHOULDERS", "ARMS", "CORE", "GLUTES", "QUADS", "HAMSTRINGS"];

const disciplineRecoveryBonus: Record<DisciplineState, number> = {
  OPTIMAL: 12,
  STABLE: 6,
  DECLINING: -8,
  COMPROMISED: -18,
};

const regionLoadProfiles: Record<Exclude<BodyTrainingProfile, "AUTO">, Record<BodyRegionId, number>> = {
  FULL: { CHEST: 0.55, BACK: 0.55, SHOULDERS: 0.5, ARMS: 0.45, CORE: 0.65, GLUTES: 0.55, QUADS: 0.65, HAMSTRINGS: 0.6 },
  PUSH: { CHEST: 0.9, BACK: 0.25, SHOULDERS: 0.8, ARMS: 0.65, CORE: 0.45, GLUTES: 0.2, QUADS: 0.25, HAMSTRINGS: 0.2 },
  PULL: { CHEST: 0.2, BACK: 0.9, SHOULDERS: 0.65, ARMS: 0.75, CORE: 0.5, GLUTES: 0.3, QUADS: 0.25, HAMSTRINGS: 0.45 },
  LOWER: { CHEST: 0.15, BACK: 0.3, SHOULDERS: 0.25, ARMS: 0.2, CORE: 0.55, GLUTES: 0.85, QUADS: 0.9, HAMSTRINGS: 0.9 },
  CONDITIONING: { CHEST: 0.35, BACK: 0.4, SHOULDERS: 0.4, ARMS: 0.35, CORE: 0.75, GLUTES: 0.65, QUADS: 0.75, HAMSTRINGS: 0.75 },
};

function resolveRegionLoadProfile(input: SessionLogInput, profile: Exclude<BodyTrainingProfile, "AUTO">): Record<BodyRegionId, number> {
  const base = regionLoadProfiles[profile];
  const activity = getActivityDefinition(input.activityId);
  const baselineBias = 0.08;
  const merged = Object.fromEntries(
    regionOrder.map((regionId) => {
      const activityBias = activity.regionBias[regionId] ?? baselineBias;
      const value = base[regionId] * 0.75 + activityBias * 0.7;
      return [regionId, value];
    }),
  ) as Record<BodyRegionId, number>;
  const total = Object.values(merged).reduce((sum, value) => sum + value, 0);
  const normalizationTarget = regionOrder.length * 0.56;
  const scale = total > 0 ? normalizationTarget / total : 1;

  return Object.fromEntries(regionOrder.map((regionId) => [regionId, Math.max(0.08, merged[regionId] * scale)])) as Record<BodyRegionId, number>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value);
}

function inferProfile(codename: string): Exclude<BodyTrainingProfile, "AUTO"> {
  const text = codename.toUpperCase();
  if (text.includes("PUSH") || text.includes("PRESS")) return "PUSH";
  if (text.includes("PULL") || text.includes("ROW")) return "PULL";
  if (text.includes("LOWER") || text.includes("LEG") || text.includes("SQUAT") || text.includes("HINGE")) return "LOWER";
  if (text.includes("RUN") || text.includes("CARDIO") || text.includes("ENGINE") || text.includes("CONDITION")) return "CONDITIONING";
  return "FULL";
}

function resolveProfile(input: SessionLogInput): Exclude<BodyTrainingProfile, "AUTO"> {
  if (input.bodyTrainingProfile !== "AUTO") {
    return input.bodyTrainingProfile;
  }

  return inferProfile(input.primaryActivityCodename);
}

function statusFromReadiness(readinessPct: number): BodyRegionStatus {
  if (readinessPct >= 67) return "READY";
  if (readinessPct >= 45) return "MONITOR";
  return "RECOVER";
}

function getGraceDays(expectedCadence: SessionLogInput["expectedCadence"]): number {
  if (expectedCadence === "DAILY") return 1;
  if (expectedCadence === "THREE_PER_WEEK") return 2;
  return 4;
}

function getSessionStress(input: SessionLogInput): number {
  return clamp(
    (input.intensityMultiplier - 0.8) * 35 +
      (input.durationMultiplier - 0.8) * 30 +
      (input.consistencyMultiplier - 0.8) * 25 +
      (1 - input.outcomeMultiplier) * 15,
    8,
    95,
  );
}

function getRecoveryCapacity(input: SessionLogInput): number {
  const discipline = input.recentDisciplineStates.at(-1) ?? "STABLE";
  const graceDays = getGraceDays(input.expectedCadence);
  const overInactive = Math.max(0, input.inactiveDays - graceDays);
  return (
    input.fitnessBaselinePct * 0.52 +
    disciplineRecoveryBonus[discipline] +
    Math.min(input.inactiveDays, 2) * 4 -
    overInactive * 6
  );
}

function estimateEtaDays(region: BodyRegionSignal, deltaPct: number): number {
  if (region.readinessPct >= 67) {
    return 0;
  }

  const readiness = clamp(region.readinessPct, 0, 100);
  const recoveryPct = clamp(region.recoveryPct, 0, 100);
  const loadPct = clamp(region.loadPct, 0, 100);
  const severeFatigue = readiness <= 20 && recoveryPct <= 25 && loadPct >= 85;

  let etaBase = 2;
  if (readiness >= 55) etaBase = 1;
  else if (readiness >= 45) etaBase = 2;
  else if (readiness >= 35) etaBase = 3;
  else if (readiness >= 25) etaBase = 4;
  else etaBase = severeFatigue ? 6 : 4;

  const loadAdjustment = loadPct >= 85 ? 1 : loadPct >= 75 ? 0.5 : 0;
  const recoveryAdjustment = recoveryPct <= 25 ? 1 : recoveryPct <= 40 ? 0.5 : 0;
  const trendAdjustment = deltaPct >= 5 ? -1 : deltaPct <= -5 ? 1 : 0;

  const eta = Math.round(etaBase + loadAdjustment + recoveryAdjustment + trendAdjustment);
  return clamp(eta, 1, severeFatigue ? 7 : 4);
}

export function buildBodyRecoveryView(input: SessionLogInput): BodyRecoveryView {
  const profile = resolveProfile(input);
  const loadProfile = resolveRegionLoadProfile(input, profile);
  const stress = getSessionStress(input);
  const recovery = getRecoveryCapacity(input);
  const weightPenalty = Math.abs(input.bodyWeightKg - input.targetWeightKg) * 1.2;

  const regions = regionOrder.map((id) => {
    const loadPct = round(loadProfile[id] * 100);
    const readinessPct = round(clamp(52 + recovery * 0.7 - loadProfile[id] * stress * 1.05 - weightPenalty, 5, 99));
    const recoveryPct = round(clamp(recovery + 30 - loadProfile[id] * stress * 0.45, 0, 100));
    return {
      id,
      label: id,
      readinessPct,
      loadPct,
      recoveryPct,
      status: statusFromReadiness(readinessPct),
    };
  });

  const graceDays = getGraceDays(input.expectedCadence);
  const overInactive = Math.max(0, input.inactiveDays - graceDays);
  const weightDeltaKg = round((input.bodyWeightKg - input.targetWeightKg) * 10) / 10;
  const compositionPct = round(
    clamp(56 + input.fitnessBaselinePct * 0.42 + input.consistencyMultiplier * 8 - Math.abs(weightDeltaKg) * 4 - overInactive * 5, 0, 100),
  );
  const strengthPct = round(
    clamp(
      38 +
        input.intensityMultiplier * 26 +
        input.durationMultiplier * 18 +
        input.consistencyMultiplier * 22 +
        input.outcomeMultiplier * 14 +
        input.fitnessBaselinePct * 0.18 -
        input.inactiveDays * 3,
      0,
      100,
    ),
  );
  const conditioningPct = round(
    clamp(
      32 + input.outcomeMultiplier * 26 + input.consistencyMultiplier * 20 + input.fitnessBaselinePct * 0.34 - overInactive * 6,
      0,
      100,
    ),
  );
  const developmentAverage = (compositionPct + strengthPct + conditioningPct) / 3;
  const status: DevelopmentStatus = developmentAverage >= 70 ? "ADVANCING" : developmentAverage >= 50 ? "HOLD" : "DEGRADED";

  return {
    profile,
    regions,
    development: {
      bodyWeightKg: input.bodyWeightKg,
      targetWeightKg: input.targetWeightKg,
      weightDeltaKg,
      compositionPct,
      strengthPct,
      conditioningPct,
      status,
    },
  };
}

export function buildBodyRegionInsights(view: BodyRecoveryView, historyEntries: readonly SessionHistoryEntry[]): Record<BodyRegionId, BodyRegionInsight> {
  const previous = historyEntries.at(-2);

  return Object.fromEntries(
    view.regions.map((region) => {
      const previousReadiness = previous?.regionReadiness?.[region.id];
      const deltaPct = typeof previousReadiness === "number" ? Math.round(region.readinessPct - previousReadiness) : 0;
      const etaDays = estimateEtaDays(region, deltaPct);
      return [region.id, { deltaPct, etaDays: Number.isFinite(etaDays) ? etaDays : null }];
    }),
  ) as Record<BodyRegionId, BodyRegionInsight>;
}

export function getLowestReadinessRegion(view: BodyRecoveryView): BodyRegionSignal | null {
  if (view.regions.length === 0) {
    return null;
  }

  return [...view.regions].sort((a, b) => a.readinessPct - b.readinessPct)[0];
}

export function getAverageReadinessPct(view: BodyRecoveryView): number {
  if (view.regions.length === 0) {
    return 0;
  }

  const total = view.regions.reduce((sum, region) => sum + region.readinessPct, 0);
  return Math.round(total / view.regions.length);
}

export function getRecentStressRegionIds(
  historyEntries: readonly SessionHistoryEntry[],
  windowSize = 3,
  maxRegions = 4,
): readonly BodyRegionId[] {
  const stressByRegion = getRecentStressLevels(historyEntries, windowSize);
  const sorted = Object.entries(stressByRegion)
    .map(([regionId, score]) => ({ regionId: regionId as BodyRegionId, score }))
    .filter((entry) => entry.score >= 0.14)
    .sort((a, b) => b.score - a.score)
    .slice(0, clamp(maxRegions, 1, regionOrder.length));

  return sorted.map((entry) => entry.regionId);
}

export function getRecentStressLevels(
  historyEntries: readonly SessionHistoryEntry[],
  windowSize = 3,
): Partial<Record<BodyRegionId, number>> {
  if (historyEntries.length === 0) {
    return {};
  }

  const sliceSize = clamp(windowSize, 1, 10);
  const recentEntries = historyEntries.slice(-sliceSize);
  const weightedStress = new Map<BodyRegionId, number>(regionOrder.map((regionId) => [regionId, 0]));
  let totalWeight = 0;

  recentEntries.forEach((entry, index) => {
    const weight = 1 + index * 0.4;
    totalWeight += weight;

    regionOrder.forEach((regionId) => {
      const readinessRaw = entry.regionReadiness?.[regionId];
      const readiness = typeof readinessRaw === "number" ? clamp(readinessRaw, 0, 100) : 67;
      const stress = clamp((67 - readiness) / 67, 0, 1);
      weightedStress.set(regionId, (weightedStress.get(regionId) ?? 0) + stress * weight);
    });
  });

  return Object.fromEntries(
    regionOrder.map((regionId) => {
      const score = totalWeight > 0 ? (weightedStress.get(regionId) ?? 0) / totalWeight : 0;
      return [regionId, clamp(Number(score.toFixed(3)), 0, 1)];
    }),
  ) as Partial<Record<BodyRegionId, number>>;
}

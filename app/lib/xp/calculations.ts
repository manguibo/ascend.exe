export type DisciplineState = "OPTIMAL" | "STABLE" | "DECLINING" | "COMPROMISED";
export type TrainingCadence = "DAILY" | "THREE_PER_WEEK" | "WEEKLY";

export type SessionXpInput = {
  baseRate: number;
  intensityMultiplier: number;
  durationMultiplier: number;
  outcomeMultiplier: number;
  consistencyMultiplier: number;
};

export type SessionXpSegmentInput = {
  sharePct: number;
  intensityMultiplier: number;
  durationMultiplier: number;
  outcomeMultiplier: number;
};

export type InactivityDecayInput = {
  totalXp: number;
  inactiveDays: number;
  graceDays: number;
  decayRatePct: number;
  levelStartXp: number;
  minLevelFloorPct?: number;
};

const DEFAULT_LEVEL_FLOOR_PCT = 0.85;
const DEFAULT_COMPROMISED_DAYS_FOR_DEMOTION = 7;

const graceDaysByCadence: Record<TrainingCadence, number> = {
  DAILY: 1,
  THREE_PER_WEEK: 2,
  WEEKLY: 4,
};

export function calculateSessionXp(input: SessionXpInput): number {
  const rawSessionXp =
    input.baseRate *
    input.intensityMultiplier *
    input.durationMultiplier *
    input.outcomeMultiplier *
    input.consistencyMultiplier;

  return Math.round(rawSessionXp);
}

export function calculateHybridSessionXp(baseRate: number, consistencyMultiplier: number, segments: readonly SessionXpSegmentInput[]): number {
  if (segments.length === 0) {
    return 0;
  }

  const totalShare = segments.reduce((sum, segment) => sum + Math.max(0, segment.sharePct), 0);
  if (totalShare <= 0) {
    return 0;
  }

  const weightedMultiplier = segments.reduce((sum, segment) => {
    const normalizedShare = Math.max(0, segment.sharePct) / totalShare;
    const component =
      Math.max(0, segment.intensityMultiplier) * Math.max(0, segment.durationMultiplier) * Math.max(0, segment.outcomeMultiplier);
    return sum + component * normalizedShare;
  }, 0);

  return Math.round(baseRate * consistencyMultiplier * weightedMultiplier);
}

export function calculateDecayFloorXp(levelStartXp: number, minLevelFloorPct = DEFAULT_LEVEL_FLOOR_PCT): number {
  return Math.round(levelStartXp * minLevelFloorPct);
}

export function getGraceDaysForCadence(cadence: TrainingCadence): number {
  return graceDaysByCadence[cadence];
}

export function applyInactivityDecay(input: InactivityDecayInput): number {
  const floorXp = calculateDecayFloorXp(input.levelStartXp, input.minLevelFloorPct ?? DEFAULT_LEVEL_FLOOR_PCT);
  const decayingDays = Math.max(0, input.inactiveDays - input.graceDays);

  if (decayingDays === 0) {
    return Math.max(floorXp, Math.round(input.totalXp));
  }

  const dailyFactor = 1 - input.decayRatePct / 100;
  const decayedTotal = input.totalXp * Math.pow(dailyFactor, decayingDays);

  return Math.max(floorXp, Math.round(decayedTotal));
}

export function shouldDemoteRank(
  totalXp: number,
  rankThresholdXp: number,
  recentDisciplineStates: readonly DisciplineState[],
  requiredCompromisedDays = DEFAULT_COMPROMISED_DAYS_FOR_DEMOTION,
): boolean {
  if (totalXp >= rankThresholdXp || requiredCompromisedDays <= 0) {
    return false;
  }

  const recentWindow = recentDisciplineStates.slice(-requiredCompromisedDays);
  if (recentWindow.length < requiredCompromisedDays) {
    return false;
  }

  return recentWindow.every((state) => state === "COMPROMISED");
}

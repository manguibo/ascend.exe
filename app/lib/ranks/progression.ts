import { shouldDemoteRank, type DisciplineState } from "../xp/calculations";

export type RankId = "RECRUIT" | "OPERATOR" | "VANGUARD" | "ASCENDANT";

export type RankDefinition = {
  id: RankId;
  minXp: number;
};

export type DemotionStatus = {
  shouldDemote: boolean;
  compromisedStreak: number;
  requiredCompromisedDays: number;
};

export type ProgressEventState = "PROMOTION READY" | "PROMOTION PROXIMITY" | "DEMOTION RISK" | "RANK STABLE";
export type RankProgress = {
  currentRank: RankDefinition;
  nextRank: RankDefinition | null;
  xpToNextRank: number;
  bandProgressPct: number;
};

const REQUIRED_COMPROMISED_DAYS = 7;
const PROMOTION_PROXIMITY_XP = 250;

export const rankTable: readonly RankDefinition[] = [
  { id: "RECRUIT", minXp: 0 },
  { id: "OPERATOR", minXp: 12000 },
  { id: "VANGUARD", minXp: 15000 },
  { id: "ASCENDANT", minXp: 18000 },
];

export function resolveRank(totalXp: number): RankDefinition {
  for (let index = rankTable.length - 1; index >= 0; index -= 1) {
    if (totalXp >= rankTable[index].minXp) {
      return rankTable[index];
    }
  }

  return rankTable[0];
}

export function getNextRank(totalXp: number): RankDefinition | null {
  const current = resolveRank(totalXp);
  const currentIndex = rankTable.findIndex((rank) => rank.id === current.id);
  if (currentIndex < 0 || currentIndex >= rankTable.length - 1) {
    return null;
  }

  return rankTable[currentIndex + 1];
}

export function getRankProgress(totalXp: number): RankProgress {
  const currentRank = resolveRank(totalXp);
  const nextRank = getNextRank(totalXp);
  const currentFloor = currentRank.minXp;
  const nextFloor = nextRank?.minXp ?? currentFloor;
  const span = Math.max(1, nextFloor - currentFloor);

  const xpToNextRank = nextRank ? Math.max(0, nextRank.minXp - totalXp) : 0;
  const rawBandProgress = ((totalXp - currentFloor) / span) * 100;
  const bandProgressPct = nextRank ? Math.max(0, Math.min(100, Math.round(rawBandProgress))) : 100;

  return {
    currentRank,
    nextRank,
    xpToNextRank,
    bandProgressPct,
  };
}

export function countCompromisedStreak(recentDisciplineStates: readonly DisciplineState[]): number {
  let streak = 0;
  for (let index = recentDisciplineStates.length - 1; index >= 0; index -= 1) {
    if (recentDisciplineStates[index] !== "COMPROMISED") {
      break;
    }
    streak += 1;
  }
  return streak;
}

export function assessDemotionStatus(
  totalXp: number,
  protectedRankThresholdXp: number,
  recentDisciplineStates: readonly DisciplineState[],
): DemotionStatus {
  return {
    shouldDemote: shouldDemoteRank(totalXp, protectedRankThresholdXp, recentDisciplineStates, REQUIRED_COMPROMISED_DAYS),
    compromisedStreak: countCompromisedStreak(recentDisciplineStates),
    requiredCompromisedDays: REQUIRED_COMPROMISED_DAYS,
  };
}

export function evaluateProgressEvent(
  totalXp: number,
  preDecayTotalXp: number,
  demotion: DemotionStatus,
): ProgressEventState {
  if (demotion.shouldDemote) {
    return "DEMOTION RISK";
  }

  const currentRank = resolveRank(totalXp);
  const projectedRankBeforeDecay = resolveRank(preDecayTotalXp);
  if (projectedRankBeforeDecay.minXp > currentRank.minXp) {
    return "PROMOTION READY";
  }

  const nextRank = getNextRank(totalXp);
  if (nextRank && totalXp >= nextRank.minXp - PROMOTION_PROXIMITY_XP) {
    return "PROMOTION PROXIMITY";
  }

  return "RANK STABLE";
}

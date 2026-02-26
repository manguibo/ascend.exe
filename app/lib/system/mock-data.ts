import { buildScaledDirectives } from "../directives/scaling";
import { resolveRank } from "../ranks/progression";
import { applyInactivityDecay, calculateDecayFloorXp, calculateSessionXp, getGraceDaysForCadence } from "../xp/calculations";
import { defaultSessionLogInput, type SessionLogInput } from "./session-state";
import type { SystemSnapshot } from "./types";

const defaultLogInput: SessionLogInput = defaultSessionLogInput;

export function buildSystemSnapshotFromLogInput(input: SessionLogInput): SystemSnapshot {
  const sessionXp = calculateSessionXp({
    baseRate: input.baseRate,
    intensityMultiplier: input.intensityMultiplier,
    durationMultiplier: input.durationMultiplier,
    outcomeMultiplier: input.outcomeMultiplier,
    consistencyMultiplier: input.consistencyMultiplier,
  });
  const totalXpBeforeDecay = input.totalXpBeforeSession + sessionXp;
  const graceDays = getGraceDaysForCadence(input.expectedCadence);
  const totalXp = applyInactivityDecay({
    totalXp: totalXpBeforeDecay,
    inactiveDays: input.inactiveDays,
    graceDays,
    decayRatePct: input.decayRatePct,
    levelStartXp: input.levelStartXp,
  });
  const decayDeltaXp = Math.max(0, totalXpBeforeDecay - totalXp);
  const decayFloorXp = calculateDecayFloorXp(input.levelStartXp);

  const recentDisciplineStates = input.recentDisciplineStates;
  const discipline = recentDisciplineStates.at(-1) ?? "STABLE";
  const activity = {
    codename: input.primaryActivityCodename,
    protocol: "PRIMARY ACTIVITY",
    nextDirective: "1900 HOURS EXECUTION WINDOW",
    complianceWindow: "04:12:26 REMAINING",
  } as const;
  const currentRank = resolveRank(totalXp);
  const directives = buildScaledDirectives(activity, currentRank.id);

  return {
    mode: "SINGLE ACTIVITY",
    activity,
    discipline,
    recentDisciplineStates,
    directives,
    xp: {
      sessionXp,
      totalXpBeforeDecay,
      totalXp,
      decayDeltaXp,
      levelFloorXp: input.levelStartXp,
      decayFloorXp,
      decayRatePct: input.decayRatePct,
      inactiveDays: input.inactiveDays,
      graceDays,
      expectedCadence: input.expectedCadence,
      factors: [
        { label: "BASE RATE", value: input.baseRate },
        { label: "INTENSITY MULTIPLIER", value: input.intensityMultiplier },
        { label: "DURATION MULTIPLIER", value: input.durationMultiplier },
        { label: "OUTCOME MULTIPLIER", value: input.outcomeMultiplier },
        { label: "CONSISTENCY MULTIPLIER", value: input.consistencyMultiplier },
      ],
    },
    statusLine: "SESSION PROCESSED. PERFORMANCE WITHIN THRESHOLD. DISCIPLINE VARIANCE DETECTED.",
  };
}

export const systemSnapshot: SystemSnapshot = buildSystemSnapshotFromLogInput(defaultLogInput);

import { buildScaledDirectives } from "../directives/scaling";
import { resolveRank } from "../ranks/progression";
import { applyInactivityDecay, calculateDecayFloorXp, calculateHybridSessionXp, calculateSessionXp, getGraceDaysForCadence } from "../xp/calculations";
import { getActivityDefinition } from "./activity-catalog";
import { defaultSessionLogInput, getEffectiveHybridSegments, type SessionLogInput } from "./session-state";
import type { SystemSnapshot } from "./types";

const defaultLogInput: SessionLogInput = defaultSessionLogInput;

function getDisciplineScore(state: SessionLogInput["recentDisciplineStates"][number]): number {
  if (state === "OPTIMAL") return 3;
  if (state === "STABLE") return 2;
  if (state === "DECLINING") return 1;
  return 0;
}

function scoreToDiscipline(score: number): SessionLogInput["recentDisciplineStates"][number] {
  if (score >= 3) return "OPTIMAL";
  if (score >= 2) return "STABLE";
  if (score >= 1) return "DECLINING";
  return "COMPROMISED";
}

export function buildSystemSnapshotFromLogInput(input: SessionLogInput): SystemSnapshot {
  const segments = getEffectiveHybridSegments(input);
  const sessionXp =
    input.hybridMode && segments.length > 1
      ? calculateHybridSessionXp(
          input.baseRate,
          input.consistencyMultiplier,
          segments.map((segment) => ({
            sharePct: segment.sharePct,
            intensityMultiplier: segment.intensityMultiplier,
            durationMultiplier: segment.durationMultiplier,
            outcomeMultiplier: segment.outcomeMultiplier,
          })),
        )
      : calculateSessionXp({
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
  const baseDiscipline = recentDisciplineStates.at(-1) ?? "STABLE";
  const hasConditioning = segments.some((segment) => segment.category === "CONDITIONING");
  const hasStrength = segments.some((segment) => segment.category === "STRENGTH");
  const weightedOutcome =
    segments.reduce((sum, segment) => sum + segment.outcomeMultiplier * (segment.sharePct / 100), 0) || input.outcomeMultiplier;
  const qualitySignal = (sessionXp / Math.max(1, input.baseRate)) * weightedOutcome;
  const disciplineAdjustment =
    input.hybridMode && hasConditioning && hasStrength && qualitySignal >= 1.1
      ? 1
      : input.hybridMode && (!hasConditioning || !hasStrength) && qualitySignal < 0.9
        ? -1
        : 0;
  const discipline = scoreToDiscipline(Math.max(0, Math.min(3, getDisciplineScore(baseDiscipline) + disciplineAdjustment)));
  const hybridCodename =
    input.hybridMode && segments.length > 1
      ? segments
          .map((segment) => getActivityDefinition(segment.activityId).label)
          .slice(0, 2)
          .join(" + ")
      : input.primaryActivityCodename;
  const activity = {
    codename: hybridCodename,
    protocol: input.hybridMode && segments.length > 1 ? "HYBRID COMPOSITION" : "PRIMARY ACTIVITY",
    nextDirective: "1900 HOURS EXECUTION WINDOW",
    complianceWindow: "04:12:26 REMAINING",
  } as const;
  const currentRank = resolveRank(totalXp);
  const directives = buildScaledDirectives(activity, currentRank.id);

  return {
    mode: input.hybridMode && segments.length > 1 ? "HYBRID SESSION" : "SINGLE ACTIVITY",
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
        {
          label: "INTENSITY MULTIPLIER",
          value:
            input.hybridMode && segments.length > 1
              ? Number(
                  (
                    segments.reduce((sum, segment) => sum + segment.intensityMultiplier * (segment.sharePct / 100), 0) || input.intensityMultiplier
                  ).toFixed(2),
                )
              : input.intensityMultiplier,
        },
        {
          label: "DURATION MULTIPLIER",
          value:
            input.hybridMode && segments.length > 1
              ? Number(
                  (
                    segments.reduce((sum, segment) => sum + segment.durationMultiplier * (segment.sharePct / 100), 0) || input.durationMultiplier
                  ).toFixed(2),
                )
              : input.durationMultiplier,
        },
        {
          label: "OUTCOME MULTIPLIER",
          value:
            input.hybridMode && segments.length > 1
              ? Number(
                  (segments.reduce((sum, segment) => sum + segment.outcomeMultiplier * (segment.sharePct / 100), 0) || input.outcomeMultiplier).toFixed(2),
                )
              : input.outcomeMultiplier,
        },
        { label: "CONSISTENCY MULTIPLIER", value: input.consistencyMultiplier },
        ...(input.hybridMode && segments.length > 1 ? [{ label: "HYBRID MIX", value: segments[0].sharePct }] : []),
      ],
    },
    statusLine: "SESSION PROCESSED. PERFORMANCE WITHIN THRESHOLD. DISCIPLINE VARIANCE DETECTED.",
  };
}

export const systemSnapshot: SystemSnapshot = buildSystemSnapshotFromLogInput(defaultLogInput);

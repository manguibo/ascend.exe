import type { DisciplineState } from "./types";
import type { SystemSnapshot } from "./types";

export type NextActionAdvice = {
  id: "LOG_SESSION" | "REBUILD_CONSISTENCY" | "PROTECT_XP" | "PROGRESS";
  title: string;
  detail: string;
};

export type RiskBand = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export function getCompromisedDayCount(states: readonly DisciplineState[]): number {
  return states.filter((state) => state === "COMPROMISED").length;
}

export function getDisciplineRiskPct(states: readonly DisciplineState[]): number {
  if (states.length === 0) {
    return 0;
  }

  return Math.round((getCompromisedDayCount(states) / states.length) * 100);
}

export function getDecayPressurePct(inactiveDays: number, graceDays: number, pressureWindowDays = 7): number {
  const decayingDays = Math.max(0, inactiveDays - graceDays);
  if (decayingDays === 0) {
    return 0;
  }

  const normalized = Math.round((decayingDays / Math.max(1, pressureWindowDays)) * 100);
  return Math.max(0, Math.min(100, normalized));
}

export function getRetentionPct(preDecayTotalXp: number, postDecayTotalXp: number): number {
  if (preDecayTotalXp <= 0) {
    return 100;
  }

  const raw = Math.round((postDecayTotalXp / preDecayTotalXp) * 100);
  return Math.max(0, Math.min(100, raw));
}

export function getRiskBand(valuePct: number): RiskBand {
  const clamped = Math.max(0, Math.min(100, Math.round(valuePct)));
  if (clamped >= 75) return "CRITICAL";
  if (clamped >= 50) return "HIGH";
  if (clamped >= 25) return "MODERATE";
  return "LOW";
}

export function getNextActionAdvice(
  snapshot: SystemSnapshot,
  disciplineRiskPct: number,
  decayPressurePct: number,
  retentionPct: number,
): NextActionAdvice {
  const overdueDays = Math.max(0, snapshot.xp.inactiveDays - snapshot.xp.graceDays);

  if (decayPressurePct >= 50 || overdueDays >= 3) {
    return {
      id: "LOG_SESSION",
      title: "Log a session today",
      detail: "Inactivity pressure is high. Completing a session now protects progress.",
    };
  }

  if (disciplineRiskPct >= 43 || snapshot.discipline === "DECLINING" || snapshot.discipline === "COMPROMISED") {
    return {
      id: "REBUILD_CONSISTENCY",
      title: "Rebuild consistency",
      detail: "Use shorter sessions on schedule to stabilize your consistency state.",
    };
  }

  if (snapshot.xp.decayDeltaXp > 0 && retentionPct < 98) {
    return {
      id: "PROTECT_XP",
      title: "Protect retained XP",
      detail: "You are taking decay loss. Keep cadence inside the grace window this week.",
    };
  }

  return {
    id: "PROGRESS",
    title: "Progress training load",
    detail: "Recovery signals are stable. Increase challenge gradually and keep frequency.",
  };
}

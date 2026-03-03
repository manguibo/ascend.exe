"use client";

import { getDirectiveTierInfo } from "@/lib/directives/tier";
import { getRankProgress } from "@/lib/ranks/progression";
import { getDecayPressurePct, getRetentionPct, getRiskBand } from "@/lib/system/telemetry";
import { useUiRailDensity } from "@/lib/system/use-ui-rail-density";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";
import { MiniMeter } from "./mini-meter";
import { StatusChip } from "./status-chip";

export function GlobalStatusRail() {
  const { snapshot } = useSystemSnapshot();
  const { density } = useUiRailDensity();
  const rankProgress = getRankProgress(snapshot.xp.totalXp);
  const rank = rankProgress.currentRank;
  const directiveTier = getDirectiveTierInfo(snapshot.xp.totalXp);
  const decayPressurePct = getDecayPressurePct(snapshot.xp.inactiveDays, snapshot.xp.graceDays);
  const decayPressureBand = getRiskBand(decayPressurePct);
  const retentionPct = getRetentionPct(snapshot.xp.totalXpBeforeDecay, snapshot.xp.totalXp);
  const retentionRiskBand = getRiskBand(100 - retentionPct);
  const compact = density === "COMPACT";
  const consistencyLabel =
    snapshot.discipline === "COMPROMISED"
      ? "Needs attention"
      : snapshot.discipline === "DECLINING"
        ? "Slipping"
        : snapshot.discipline === "STABLE"
          ? "Steady"
          : "On track";
  const pressureLabel =
    decayPressureBand === "LOW"
      ? "Low"
      : decayPressureBand === "MODERATE"
        ? "Medium"
        : decayPressureBand === "HIGH"
          ? "High"
          : "Very high";

  return (
    <section className="border-b border-cyan-500/25 bg-black/85 px-6 py-2 sm:px-10 lg:px-16">
      <div className={`mx-auto grid w-full max-w-6xl gap-2 ${compact ? "sm:grid-cols-2 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-8"}`}>
        <StatusChip label="TODAY'S ACTIVITY" value={snapshot.activity.label.toUpperCase()} />
        <StatusChip label="TOTAL POINTS" value={`${snapshot.xp.totalXp}`} />
        <StatusChip label="CURRENT LEVEL" value={rank.id} />
        <StatusChip label="WORKOUT PLAN" value={directiveTier.tier} />
        {!compact ? <MiniMeter label="LEVEL PROGRESS" value={rankProgress.bandProgressPct} /> : null}
        {!compact ? <MiniMeter label={`PROGRESS HOLD ${retentionRiskBand}`} value={retentionPct} /> : null}
        <StatusChip
          label="CONSISTENCY"
          value={consistencyLabel.toUpperCase()}
          tone={snapshot.discipline === "COMPROMISED" ? "red" : snapshot.discipline === "DECLINING" ? "purple" : "default"}
        />
        <StatusChip
          label="TIME OFF RISK"
          value={`${decayPressurePct}% ${pressureLabel.toUpperCase()}`}
          tone={decayPressureBand === "CRITICAL" || decayPressureBand === "HIGH" ? "red" : decayPressureBand === "MODERATE" ? "purple" : "default"}
        />
      </div>
      {!compact ? (
        <p className="mx-auto mt-2 w-full max-w-6xl font-mono text-[10px] tracking-[0.14em] text-cyan-500/85">
          TARGET: {snapshot.xp.expectedCadence} | BREAK BUFFER: {snapshot.xp.graceDays} DAY(S) | RECENT BREAK: {snapshot.xp.inactiveDays} DAY(S)
        </p>
      ) : null}
    </section>
  );
}

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

  return (
    <section className="border-b border-cyan-500/25 bg-black/85 px-6 py-2 sm:px-10 lg:px-16">
      <div className={`mx-auto grid w-full max-w-6xl gap-2 ${compact ? "sm:grid-cols-2 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-8"}`}>
        <StatusChip label="ACTIVITY" value={snapshot.activity.codename} />
        <StatusChip label="TOTAL XP" value={`${snapshot.xp.totalXp}`} />
        <StatusChip label="RANK" value={rank.id} />
        <StatusChip label="PLAN LEVEL" value={directiveTier.tier} />
        {!compact ? <MiniMeter label="RANK BAND" value={rankProgress.bandProgressPct} /> : null}
        {!compact ? <MiniMeter label={`XP RETENTION ${retentionRiskBand}`} value={retentionPct} /> : null}
        <StatusChip
          label="CONSISTENCY"
          value={snapshot.discipline}
          tone={snapshot.discipline === "COMPROMISED" ? "red" : snapshot.discipline === "DECLINING" ? "purple" : "default"}
        />
        <StatusChip
          label="DECAY PRESSURE"
          value={`${decayPressurePct}% ${decayPressureBand}`}
          tone={decayPressureBand === "CRITICAL" || decayPressureBand === "HIGH" ? "red" : decayPressureBand === "MODERATE" ? "purple" : "default"}
        />
      </div>
      {!compact ? (
        <p className="mx-auto mt-2 w-full max-w-6xl font-mono text-[10px] tracking-[0.14em] text-cyan-500/85">
          FREQUENCY {snapshot.xp.expectedCadence} | GRACE {snapshot.xp.graceDays} DAY(S) | INACTIVE {snapshot.xp.inactiveDays} DAY(S)
        </p>
      ) : null}
    </section>
  );
}

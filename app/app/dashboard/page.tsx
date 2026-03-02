"use client";

import { BodyRecoveryDiagram } from "@/components/system/body-recovery-diagram";
import { DirectiveStack } from "@/components/system/directive-stack";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { DisciplineTimeline } from "@/components/system/discipline-timeline";
import { MicroMetricGrid } from "@/components/system/micro-metric-grid";
import { PageHeader } from "@/components/system/page-header";
import { ProgressStatusBadge } from "@/components/system/progress-status-badge";
import { SystemTelemetryPanel } from "@/components/system/system-telemetry-panel";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { XpFactorBars } from "@/components/system/xp-factor-bars";
import { XpRetentionBars } from "@/components/system/xp-retention-bars";
import { buildBodyRecoveryView, buildBodyRegionInsights } from "@/lib/system/body-recovery";
import { usePerformanceView } from "@/lib/system/use-performance-view";
import { useSessionHistory } from "@/lib/system/use-session-history";
import type { DisciplineState } from "@/lib/system/types";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";

const disciplineToneClass: Record<DisciplineState, string> = {
  OPTIMAL: "border-cyan-500/60 bg-cyan-950/30 text-cyan-200",
  STABLE: "border-cyan-500/60 bg-cyan-950/30 text-cyan-200",
  DECLINING: "border-[#4b2a78] bg-[#11091b] text-[#b08cff]",
  COMPROMISED: "border-[#7a2f35] bg-[#1a080a] text-[#ff8d97]",
};

export default function DashboardPage() {
  const { snapshot, input } = useSystemSnapshot();
  const { entries: sessionHistory } = useSessionHistory();
  const { rankProgress, currentRank, directiveTier, demotion, progressEvent, disciplineRiskPct, decayPressurePct, retentionPct } =
    usePerformanceView(snapshot);
  const bodyRecoveryView = buildBodyRecoveryView(input);
  const bodyInsights = buildBodyRegionInsights(bodyRecoveryView, sessionHistory);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="ASCEND // Overview"
          title="Performance Snapshot"
          description={snapshot.statusLine}
        />

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <article className="border border-cyan-500/50 bg-black p-5 font-mono">
            <h2 className="text-xs tracking-[0.22em] text-cyan-500">XP Breakdown</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border border-cyan-500/40 p-4">
                <p className="text-[11px] tracking-[0.2em] text-cyan-500/90">Session XP</p>
                <p className="mt-2 text-3xl text-cyan-200">{snapshot.xp.sessionXp}</p>
                <p className="mt-2 text-xs text-cyan-300/80" title="Session XP = round(BaseRate x Intensity x Duration x Outcome x Consistency)">
                  Based on effort, duration, outcome, and consistency.
                </p>
              </div>
              <div className="border border-cyan-500/40 p-4">
                <p className="text-[11px] tracking-[0.2em] text-cyan-500/90">Total XP</p>
                <p className="mt-2 text-3xl text-cyan-200">{snapshot.xp.totalXp}</p>
                <p className="mt-2 text-xs text-cyan-300/80">Minimum protected XP: {snapshot.xp.levelFloorXp}</p>
              </div>
            </div>
            <div className="mt-4 border border-cyan-500/35 p-4">
              <XpFactorBars factors={snapshot.xp.factors} />
            </div>
          </article>

          <aside className="grid gap-6">
            <CollapsiblePanel panelId="dashboard-rank-status" title="Rank summary">
              <div className="font-mono">
                <p className="text-xl tracking-[0.06em] text-cyan-200">{currentRank.id}</p>
                <p className="mt-2 text-xs text-cyan-300/85">Rank floor: {currentRank.minXp} XP</p>
                <p className="mt-2 text-xs text-cyan-300/85">
                  {rankProgress.nextRank ? `Next rank: ${rankProgress.nextRank.id} at ${rankProgress.nextRank.minXp} XP` : "Highest rank reached"}
                </p>
                <p className="mt-2 text-xs text-cyan-300/85">Plan level: {directiveTier.tier}</p>
                <p className="mt-2 text-xs text-cyan-300/85">Workout frequency: {snapshot.xp.expectedCadence} | grace {snapshot.xp.graceDays} day(s)</p>
                <p className="mt-2 text-xs text-cyan-300/85">XP to next: {rankProgress.xpToNextRank} | progress {rankProgress.bandProgressPct}%</p>
                <div className="mt-3">
                  <ProgressStatusBadge status={progressEvent} prefix="Status: " />
                </div>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="dashboard-discipline-index" title="Consistency trend" defaultOpen={false}>
              <div className="font-mono">
                <p className={`border px-3 py-2 text-sm tracking-[0.18em] ${disciplineToneClass[snapshot.discipline]}`}>
                  Current state: {snapshot.discipline}
                </p>
                <p className="mt-3 text-xs text-cyan-300/80">Recovery improves when you keep logging activity, not by waiting.</p>
                <p className="mt-3 text-xs text-cyan-500/90">
                  Rank protection check: {demotion.shouldDemote ? "Triggered" : "Not triggered"} ({demotion.compromisedStreak}/{demotion.requiredCompromisedDays} compromised days)
                </p>
              </div>
            </CollapsiblePanel>

            <DisciplineTimeline states={snapshot.recentDisciplineStates} />

            <CollapsiblePanel panelId="dashboard-body-recovery-map" title="Body recovery and development" defaultOpen={false}>
              <BodyRecoveryDiagram view={bodyRecoveryView} insights={bodyInsights} activityCodename={snapshot.activity.codename} input={input} />
            </CollapsiblePanel>

            <SystemTelemetryPanel
              primaryLabel="Rank progress"
              primaryValuePct={rankProgress.bandProgressPct}
              primaryHint="How far you are through this rank band"
              disciplineRiskPct={disciplineRiskPct}
              decayPressurePct={decayPressurePct}
              disciplineStates={snapshot.recentDisciplineStates}
            />

            <CollapsiblePanel panelId="dashboard-xp-decay-control" title="XP decay details" defaultOpen={false}>
              <div className="font-mono">
                <MicroMetricGrid
                  columns={2}
                  items={[
                    { label: "PRE-DECAY TOTAL", value: `${snapshot.xp.totalXpBeforeDecay} XP` },
                    { label: "POST-DECAY TOTAL", value: `${snapshot.xp.totalXp} XP` },
                    { label: "DECAY DELTA", value: `-${snapshot.xp.decayDeltaXp} XP`, tone: "red" },
                    { label: "DECAY RATE", value: `${snapshot.xp.decayRatePct}%/DAY`, tone: "red" },
                    { label: "WORKOUT FREQUENCY", value: snapshot.xp.expectedCadence, tone: "subtle" },
                    { label: "GRACE DAYS", value: `${snapshot.xp.graceDays}`, tone: "subtle" },
                    { label: "INACTIVE DAYS", value: `${snapshot.xp.inactiveDays}`, tone: "subtle" },
                    { label: "DECAY FLOOR", value: `${snapshot.xp.decayFloorXp} XP` },
                  ]}
                />
                <div className="mt-3">
                  <XpRetentionBars
                    preDecayTotalXp={snapshot.xp.totalXpBeforeDecay}
                    postDecayTotalXp={snapshot.xp.totalXp}
                    decayDeltaXp={snapshot.xp.decayDeltaXp}
                    retentionPct={retentionPct}
                  />
                </div>
                <p className="mt-3 text-xs text-cyan-500/90">A rank drop only happens with low XP and 7 compromised days.</p>
              </div>
            </CollapsiblePanel>
          </aside>
          </section>
        </TacticalReveal>

        <TacticalReveal delay={0.08}>
          <CollapsiblePanel panelId="dashboard-directive-channel" title="Current plan" className="font-mono">
            <DirectiveStack directives={snapshot.directives} showIndex={false} />
          </CollapsiblePanel>
        </TacticalReveal>
      </section>
    </main>
  );
}

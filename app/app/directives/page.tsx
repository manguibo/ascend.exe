"use client";

import { DirectiveStack } from "@/components/system/directive-stack";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { DisciplineTimeline } from "@/components/system/discipline-timeline";
import { MicroMetricGrid } from "@/components/system/micro-metric-grid";
import { PageHeader } from "@/components/system/page-header";
import { ProgressStatusBadge } from "@/components/system/progress-status-badge";
import { SystemTelemetryPanel } from "@/components/system/system-telemetry-panel";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { usePerformanceView } from "@/lib/system/use-performance-view";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";

export default function DirectivesPage() {
  const { snapshot } = useSystemSnapshot();
  const { directiveTier: scaleTier, rankProgress, currentRank, demotion, progressEvent, disciplineRiskPct, decayPressurePct } =
    usePerformanceView(snapshot);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="ASCEND.EXE // PLANS"
          title="WORKOUT PLAN BOARD"
          description="PLAN LEVEL IS BASED ON YOUR CURRENT XP BAND."
        />

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <CollapsiblePanel panelId="directives-active-directives" title="ACTIVE PLANS" className="font-mono">
              <DirectiveStack directives={snapshot.directives} />
            </CollapsiblePanel>

          <aside className="grid gap-4 font-mono">
            <CollapsiblePanel panelId="directives-scale" title="PLAN LEVEL">
              <p className="text-2xl text-cyan-200">{scaleTier.tier}</p>
              <p className="mt-2 text-sm text-cyan-300/90">TOTAL XP: {snapshot.xp.totalXp}</p>
              <p className="mt-2 text-xs text-cyan-300/90">FREQUENCY: {snapshot.xp.expectedCadence} | GRACE {snapshot.xp.graceDays} DAY(S)</p>
              <p className="mt-2 text-xs text-cyan-300/90">
                XP TO NEXT: {rankProgress.xpToNextRank} | BAND PROGRESS: {rankProgress.bandProgressPct}%
              </p>
              <p className="mt-2 text-xs text-cyan-500/90">
                {scaleTier.nextThreshold === null ? "HIGHEST PLAN LEVEL ACTIVE." : `NEXT LEVEL AT: ${scaleTier.nextThreshold} XP.`}
              </p>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="directives-discipline-status" title="CONSISTENCY STATUS" defaultOpen={false}>
              <p className="text-sm text-cyan-200">STATE: {snapshot.discipline}</p>
              <p className="mt-2 text-xs text-cyan-300/80">A DECLINING STATE LOWERS PLAN RELIABILITY.</p>
            </CollapsiblePanel>

            <DisciplineTimeline states={snapshot.recentDisciplineStates} title="CONSISTENCY TIMELINE" />

            <SystemTelemetryPanel
              primaryLabel="PLAN READINESS"
              primaryValuePct={rankProgress.bandProgressPct}
              primaryHint="PROGRESS WITHIN CURRENT RANK BAND"
              disciplineRiskPct={disciplineRiskPct}
              decayPressurePct={decayPressurePct}
              disciplineStates={snapshot.recentDisciplineStates}
            />

            <CollapsiblePanel panelId="directives-rank-integrity" title="RANK INTEGRITY" defaultOpen={false}>
              <MicroMetricGrid
                columns={2}
                items={[
                  { label: "CURRENT RANK", value: currentRank.id },
                  { label: "RANK FLOOR", value: `${currentRank.minXp} XP`, tone: "subtle" },
                  {
                    label: "NEXT RANK",
                    value: rankProgress.nextRank
                      ? `${rankProgress.nextRank.id} @ ${rankProgress.nextRank.minXp} XP`
                      : "MAXIMUM RANK ACHIEVED",
                    tone: "subtle",
                  },
                  {
                    label: "DEMOTION CHECK",
                    value: `${demotion.shouldDemote ? "TRIGGERED" : "NOT TRIGGERED"} (${demotion.compromisedStreak}/${demotion.requiredCompromisedDays})`,
                    tone: demotion.shouldDemote ? "red" : "purple",
                  },
                ]}
              />
              <div className="mt-3">
                <ProgressStatusBadge status={progressEvent} prefix="STATUS: " />
              </div>
            </CollapsiblePanel>
          </aside>
          </section>
        </TacticalReveal>
      </section>
    </main>
  );
}

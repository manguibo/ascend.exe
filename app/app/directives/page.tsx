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
          node="GUIDANCE"
          title="Your Workout Guidance"
          description="Simple next steps based on your recent workouts and consistency."
        />

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <CollapsiblePanel panelId="directives-active-directives" title="Today's guidance" className="font-mono">
              <DirectiveStack directives={snapshot.directives} />
            </CollapsiblePanel>

          <aside className="grid gap-4 font-mono">
            <CollapsiblePanel panelId="directives-scale" title="Plan summary">
              <p className="text-2xl text-cyan-200">{scaleTier.tier}</p>
              <p className="mt-2 text-sm text-cyan-300/90">Workout goal: {snapshot.xp.expectedCadence}</p>
              <p className="mt-2 text-xs text-cyan-300/90">
                Level progress: {rankProgress.bandProgressPct >= 75 ? "Almost there" : rankProgress.bandProgressPct >= 40 ? "Making progress" : "Getting started"}
              </p>
              <p className="mt-2 text-xs text-cyan-500/90">
                {scaleTier.nextThreshold === null ? "You are on the highest plan." : "Your plan increases as you stay consistent."}
              </p>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="directives-discipline-status" title="Consistency status" defaultOpen={false}>
              <p className="text-sm text-cyan-200">
                State: {snapshot.discipline === "OPTIMAL" ? "On track" : snapshot.discipline === "STABLE" ? "Steady" : snapshot.discipline === "DECLINING" ? "Slipping" : "Needs attention"}
              </p>
              <p className="mt-2 text-xs text-cyan-300/80">When consistency drops, recommendations become lighter and easier to maintain.</p>
            </CollapsiblePanel>

            <DisciplineTimeline states={snapshot.recentDisciplineStates} title="Recent consistency" />

            <SystemTelemetryPanel
              primaryLabel="Plan readiness"
              primaryValuePct={rankProgress.bandProgressPct}
              primaryHint="How close you are to your next level"
              disciplineRiskPct={disciplineRiskPct}
              decayPressurePct={decayPressurePct}
              disciplineStates={snapshot.recentDisciplineStates}
            />

            <CollapsiblePanel panelId="directives-rank-integrity" title="Level health" defaultOpen={false}>
              <MicroMetricGrid
                columns={2}
                items={[
                  { label: "CURRENT LEVEL", value: currentRank.id },
                  { label: "LEVEL PROTECTION", value: "ACTIVE", tone: "subtle" },
                  {
                    label: "NEXT LEVEL",
                    value: rankProgress.nextRank ? rankProgress.nextRank.id : "TOP LEVEL REACHED",
                    tone: "subtle",
                  },
                  {
                    label: "DROP CHECK",
                    value: demotion.shouldDemote ? "TRIGGERED" : "NOT TRIGGERED",
                    tone: demotion.shouldDemote ? "red" : "purple",
                  },
                ]}
              />
              <div className="mt-3">
                <ProgressStatusBadge status={progressEvent} prefix="Status: " />
              </div>
            </CollapsiblePanel>
          </aside>
          </section>
        </TacticalReveal>
      </section>
    </main>
  );
}

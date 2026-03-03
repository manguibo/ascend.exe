"use client";

import { DirectiveStack } from "@/components/system/directive-stack";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { DisciplineTimeline } from "@/components/system/discipline-timeline";
import { PageHeader } from "@/components/system/page-header";
import { ProgressStatusBadge } from "@/components/system/progress-status-badge";
import { SystemTelemetryPanel } from "@/components/system/system-telemetry-panel";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { usePerformanceView } from "@/lib/system/use-performance-view";
import type { DisciplineState } from "@/lib/system/types";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";

const disciplineToneClass: Record<DisciplineState, string> = {
  OPTIMAL: "border-cyan-500/60 bg-cyan-950/30 text-cyan-200",
  STABLE: "border-cyan-500/60 bg-cyan-950/30 text-cyan-200",
  DECLINING: "border-[#4b2a78] bg-[#11091b] text-[#b08cff]",
  COMPROMISED: "border-[#7a2f35] bg-[#1a080a] text-[#ff8d97]",
};

function getProgressBand(progressPct: number): string {
  if (progressPct >= 75) return "Almost there";
  if (progressPct >= 40) return "Making progress";
  return "Getting started";
}

function getPressureBand(valuePct: number): string {
  if (valuePct >= 70) return "High";
  if (valuePct >= 35) return "Medium";
  return "Low";
}

function getSessionOutcomeLabel(sessionXp: number): string {
  if (sessionXp >= 180) return "Great session";
  if (sessionXp >= 110) return "Solid session";
  return "Light session";
}

function getDisciplineLabel(state: DisciplineState): string {
  if (state === "OPTIMAL") return "On track";
  if (state === "STABLE") return "Steady";
  if (state === "DECLINING") return "Slipping";
  return "Needs attention";
}

export default function DashboardPage() {
  const { snapshot } = useSystemSnapshot();
  const { rankProgress, currentRank, directiveTier, demotion, progressEvent, disciplineRiskPct, decayPressurePct } =
    usePerformanceView(snapshot);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="OVERVIEW"
          title="Progress Snapshot"
          description="A simple summary of your recent workout quality, level progress, and consistency."
        />

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <article className="border border-cyan-500/50 bg-black p-5 font-mono">
            <h2 className="text-xs tracking-[0.22em] text-cyan-500">Performance summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border border-cyan-500/40 p-4">
                <p className="text-[11px] tracking-[0.2em] text-cyan-500/90">Session output</p>
                <p className="mt-2 text-lg text-cyan-200">{getSessionOutcomeLabel(snapshot.xp.sessionXp)}</p>
                <p className="mt-2 text-xs text-cyan-300/80">
                  Based on your recent workout effort and consistency.
                </p>
              </div>
              <div className="border border-cyan-500/40 p-4">
                <p className="text-[11px] tracking-[0.2em] text-cyan-500/90">Current progress</p>
                <p className="mt-2 text-lg text-cyan-200">{getProgressBand(rankProgress.bandProgressPct)}</p>
                <p className="mt-2 text-xs text-cyan-300/80">Shows where you are in your current level.</p>
              </div>
            </div>
            <div className="mt-4 border border-cyan-500/35 p-4 text-xs text-cyan-300/85">
              This page keeps the math in the background and focuses on practical guidance.
            </div>
          </article>

          <aside className="grid gap-6">
            <CollapsiblePanel panelId="dashboard-rank-status" title="Level summary">
              <div className="font-mono">
                <p className="text-xl tracking-[0.06em] text-cyan-200">{currentRank.id}</p>
                <p className="mt-2 text-xs text-cyan-300/85">Progress stage: {getProgressBand(rankProgress.bandProgressPct)}</p>
                <p className="mt-2 text-xs text-cyan-300/85">{rankProgress.nextRank ? `Next level: ${rankProgress.nextRank.id}` : "Top level reached"}</p>
                <p className="mt-2 text-xs text-cyan-300/85">Workout plan: {directiveTier.tier}</p>
                <p className="mt-2 text-xs text-cyan-300/85">Workout goal: {snapshot.xp.expectedCadence}</p>
                <div className="mt-3">
                  <ProgressStatusBadge status={progressEvent} prefix="Status: " />
                </div>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="dashboard-discipline-index" title="Consistency trend" defaultOpen={false}>
              <div className="font-mono">
                <p className={`border px-3 py-2 text-sm tracking-[0.18em] ${disciplineToneClass[snapshot.discipline]}`}>
                  Current state: {getDisciplineLabel(snapshot.discipline)}
                </p>
                <p className="mt-3 text-xs text-cyan-300/80">Small, regular workouts help more than occasional long breaks.</p>
                <p className="mt-3 text-xs text-cyan-500/90">
                  Level protection check: {demotion.shouldDemote ? "Triggered" : "Not triggered"}.
                </p>
              </div>
            </CollapsiblePanel>

            <DisciplineTimeline states={snapshot.recentDisciplineStates} />

            <SystemTelemetryPanel
              primaryLabel="Level progress"
              primaryValuePct={rankProgress.bandProgressPct}
              primaryHint="How close you are to the next level"
              disciplineRiskPct={disciplineRiskPct}
              decayPressurePct={decayPressurePct}
              disciplineStates={snapshot.recentDisciplineStates}
            />

            <CollapsiblePanel panelId="dashboard-xp-decay-control" title="Break risk" defaultOpen={false}>
              <div className="font-mono">
                <p className="text-xs text-cyan-200">Time-off risk: {getPressureBand(decayPressurePct)}</p>
                <p className="mt-2 text-xs text-cyan-300/85">Routine risk: {getPressureBand(disciplineRiskPct)}</p>
                <p className="mt-2 text-xs text-cyan-300/85">Workout goal: {snapshot.xp.expectedCadence}</p>
                <p className="mt-3 text-xs text-cyan-500/90">Level drops are rare and only happen after extended inactivity.</p>
              </div>
            </CollapsiblePanel>
          </aside>
          </section>
        </TacticalReveal>

        <TacticalReveal delay={0.08}>
          <CollapsiblePanel panelId="dashboard-directive-channel" title="Current guidance" className="font-mono">
            <DirectiveStack directives={snapshot.directives} showIndex={false} />
          </CollapsiblePanel>
        </TacticalReveal>
      </section>
    </main>
  );
}

"use client";

import { BodyRecoveryDiagram } from "@/components/system/body-recovery-diagram";
import { ProgressStatusBadge } from "@/components/system/progress-status-badge";
import { SessionProfileButtons } from "@/components/system/session-profile-buttons";
import { StatusTile } from "@/components/system/status-tile";
import { SystemTelemetryPanel } from "@/components/system/system-telemetry-panel";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { PageHeader } from "@/components/system/page-header";
import { buildBodyRecoveryView, buildBodyRegionInsights, getRecentStressLevels } from "@/lib/system/body-recovery";
import { applySessionProfile, sessionProfiles } from "@/lib/system/profiles";
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

function getPressureBand(valuePct: number): string {
  if (valuePct >= 70) return "High";
  if (valuePct >= 35) return "Medium";
  return "Low";
}

function getProgressBand(progressPct: number): string {
  if (progressPct >= 75) return "Almost there";
  if (progressPct >= 40) return "Making progress";
  return "Getting started";
}

function getDisciplineLabel(state: DisciplineState): string {
  if (state === "OPTIMAL") return "On track";
  if (state === "STABLE") return "Steady";
  if (state === "DECLINING") return "Slipping";
  return "Needs attention";
}

export default function Home() {
  const { snapshot, input, setInput } = useSystemSnapshot();
  const { entries: sessionHistory } = useSessionHistory();
  const { rankProgress, currentRank, directiveTier, progressEvent, disciplineRiskPct, decayPressurePct, nextAction } = usePerformanceView(snapshot);
  const bodyRecoveryView = buildBodyRecoveryView(input);
  const bodyInsights = buildBodyRegionInsights(bodyRecoveryView, sessionHistory);
  const stressedRegionLevels = getRecentStressLevels(sessionHistory, 3);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="HOME"
          title="Your Training Assistant"
          description="A simple view of what to do next, how your body is feeling, and how your week is going."
        />

        <TacticalReveal delay={0.04}>
          <section className="border border-cyan-500/50 bg-black p-4 font-mono sm:p-5">
            <p className="text-xs tracking-[0.2em] text-cyan-500">Next best step</p>
            <p className="mt-2 text-lg tracking-[0.05em] text-cyan-100">{nextAction.title}</p>
            <p className="mt-2 text-sm text-cyan-300/85">{nextAction.detail}</p>
          </section>
        </TacticalReveal>

        <TacticalReveal delay={0.07}>
          <section className="mx-auto w-full max-w-5xl">
            <BodyRecoveryDiagram
              view={bodyRecoveryView}
              insights={bodyInsights}
              stressedRegionLevels={stressedRegionLevels}
              activityCodename={snapshot.activity.codename}
              input={input}
              historyEntries={sessionHistory}
            />
          </section>
        </TacticalReveal>

        <TacticalReveal delay={0.08}>
          <section className="grid gap-4 sm:grid-cols-3">
            <StatusTile label="Mode" value={snapshot.mode} />
            <StatusTile label="Consistency">
              <p className={`border px-2 py-1 text-sm tracking-[0.16em] ${disciplineToneClass[snapshot.discipline]}`}>{getDisciplineLabel(snapshot.discipline)}</p>
            </StatusTile>
            <StatusTile
              label="Time-off risk"
              value={getPressureBand(decayPressurePct)}
              detail={`Workout goal: ${snapshot.xp.expectedCadence}`}
            />
            <StatusTile
              label="Current level"
              value={currentRank.id}
              detail={
                <>
                  <p>{rankProgress.nextRank ? `Next level: ${rankProgress.nextRank.id}` : "You are at the top level"}</p>
                  <p>{getProgressBand(rankProgress.bandProgressPct)}</p>
                </>
              }
            />
            <StatusTile
              label="Workout plan"
              value={directiveTier.tier}
              detail={directiveTier.nextThreshold ? "Your plan will step up as you stay consistent" : "You are on the highest plan"}
            />
            <StatusTile label="Status">
              <ProgressStatusBadge status={progressEvent} />
            </StatusTile>
          </section>
        </TacticalReveal>

        <TacticalReveal delay={0.12}>
          <SystemTelemetryPanel
            primaryLabel="Level progress"
            primaryValuePct={rankProgress.bandProgressPct}
            primaryHint="How close you are to your next level"
            disciplineRiskPct={disciplineRiskPct}
            decayPressurePct={decayPressurePct}
            disciplineStates={snapshot.recentDisciplineStates}
          />
        </TacticalReveal>

        <TacticalReveal delay={0.16}>
          <section className="border border-cyan-500/50 p-5 font-mono">
            <h2 className="text-xs tracking-[0.22em] text-cyan-500">Quick actions</h2>
            <p className="mt-2 text-xs text-cyan-300/80">Use a preset to fill common workout settings quickly.</p>
            <SessionProfileButtons
              className="mt-4 grid gap-2 sm:grid-cols-3"
              profiles={sessionProfiles}
              onApply={(profileId) => setInput((current) => applySessionProfile(current, profileId))}
            />
          </section>
        </TacticalReveal>

      </section>
    </main>
  );
}

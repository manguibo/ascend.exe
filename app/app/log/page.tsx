"use client";

import { useMemo, useState } from "react";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { MicroMetricGrid } from "@/components/system/micro-metric-grid";
import { PageHeader } from "@/components/system/page-header";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { getActivityDefinition } from "@/lib/system/activity-catalog";
import { buildRegionTrends, buildSessionHistorySummary, appendSessionHistoryEntry, clearSessionHistory } from "@/lib/system/session-history";
import { useSessionHistory } from "@/lib/system/use-session-history";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";

function formatTimestamp(timestampIso: string): string {
  const parsed = Date.parse(timestampIso);
  if (!Number.isFinite(parsed)) {
    return "UNKNOWN";
  }
  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveActivityLabel(entry: { activityLabel?: string; activityId?: string; activityCodename: string }): string {
  if (entry.activityLabel && entry.activityLabel.trim().length > 0) {
    return entry.activityLabel;
  }
  if (entry.activityId && entry.activityId.trim().length > 0) {
    return getActivityDefinition(entry.activityId).label;
  }
  return entry.activityCodename;
}

export default function LogPage() {
  const { input, setInput } = useSystemSnapshot();
  const { entries } = useSessionHistory();
  const [statusLine, setStatusLine] = useState<string>("");
  const summary = useMemo(() => buildSessionHistorySummary(entries), [entries]);
  const regionTrends = useMemo(() => buildRegionTrends(entries).slice(0, 6), [entries]);
  const latestFirstEntries = useMemo(() => [...entries].reverse(), [entries]);

  const handleLogCurrentEntry = () => {
    const entry = appendSessionHistoryEntry(input);
    if (!entry) {
      setStatusLine("ENTRY REJECTED");
      return;
    }
    setInput((prev) => ({
      ...prev,
      totalXpBeforeSession: entry.totalXp,
      inactiveDays: 0,
    }));
    setStatusLine("ENTRY STORED");
  };

  const handleClearHistory = () => {
    clearSessionHistory();
    setStatusLine("HISTORY CLEARED");
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="ACTIVITY HISTORY"
          title="Activity History"
          description="Review stored activity entries and cumulative stress records."
          statusLine="Entry store is persistent"
        />

        {statusLine ? <p className="border border-cyan-500/35 px-3 py-2 font-mono text-xs tracking-[0.14em] text-cyan-300/90">{statusLine}</p> : null}

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="grid gap-4">
              <CollapsiblePanel panelId="history-entries" title={`Stored entries (${entries.length})`} className="font-mono">
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleLogCurrentEntry}
                    className="border border-cyan-300/75 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.16em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                  >
                    LOG CURRENT ENTRY
                  </button>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="border border-[#7a2f35]/70 px-3 py-2 text-xs tracking-[0.16em] text-[#ff9aa4] transition-colors hover:bg-[#7a2f35]/20"
                  >
                    CLEAR HISTORY
                  </button>
                </div>

                {latestFirstEntries.length === 0 ? (
                  <p className="border border-cyan-500/25 px-3 py-3 text-xs text-cyan-300/85">
                    No entries stored. Use the bottom-right activity panel and press LOG ENTRY.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {latestFirstEntries.map((entry) => {
                      const activityLabel = resolveActivityLabel(entry);
                      return (
                        <article key={entry.id} className="border border-cyan-500/30 px-3 py-3">
                          <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">{formatTimestamp(entry.timestampIso)}</p>
                          <p className="mt-1 text-xs tracking-[0.14em] text-cyan-100">{activityLabel}</p>
                          <p className="mt-1 text-[11px] text-cyan-300/90">
                            Session XP {entry.sessionXp} | Total XP {entry.totalXp} | Discipline {entry.discipline}
                          </p>
                          <p className="mt-1 text-[11px] text-cyan-300/80">
                            Duration {entry.durationMinutes ?? "-"}m | Intensity {entry.intensityLevel ?? "-"}/10 | Profile {entry.profile}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </CollapsiblePanel>
            </section>

            <aside className="grid gap-4 font-mono">
              <CollapsiblePanel panelId="history-summary" title="History summary">
                <MicroMetricGrid
                  columns={2}
                  items={[
                    { label: "ENTRY COUNT", value: String(summary.entryCount) },
                    { label: "AVG SESSION XP", value: String(summary.averageSessionXp) },
                    { label: "AVG DEVELOPMENT", value: `${summary.averageDevelopmentPct}%` },
                    { label: "LATEST TOTAL XP", value: String(summary.latestTotalXp) },
                    { label: "XP DELTA", value: `${summary.xpDeltaFromPrevious >= 0 ? "+" : ""}${summary.xpDeltaFromPrevious}` },
                    { label: "DISCIPLINE TREND", value: summary.disciplineTrend, tone: summary.disciplineTrend === "DECLINING" ? "red" : "subtle" },
                  ]}
                />
              </CollapsiblePanel>

              <CollapsiblePanel panelId="history-regions" title="Latest region trends" defaultOpen={false}>
                {regionTrends.length === 0 ? (
                  <p className="text-xs text-cyan-300/85">Insufficient entries for trend output.</p>
                ) : (
                  <div className="grid gap-1">
                    {regionTrends.map((trend) => (
                      <p key={`trend-${trend.regionId}`} className="border border-cyan-500/25 px-2 py-1 text-[11px] text-cyan-300/90">
                        {trend.regionId} | readiness {trend.latestReadinessPct}% | delta {trend.deltaPct >= 0 ? "+" : ""}
                        {trend.deltaPct}% | {trend.direction}
                      </p>
                    ))}
                  </div>
                )}
              </CollapsiblePanel>
            </aside>
          </section>
        </TacticalReveal>
      </section>
    </main>
  );
}

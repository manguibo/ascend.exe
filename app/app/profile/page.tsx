"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { PageHeader } from "@/components/system/page-header";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";
import { usePerformanceView } from "@/lib/system/use-performance-view";
import { useSessionHistory } from "@/lib/system/use-session-history";
import { useAccount } from "@/lib/system/use-account";
import { getLeaderboardsForAccount } from "@/lib/system/group-leaderboard";
import { useGroupLeaderboards } from "@/lib/system/use-group-leaderboards";
import { getActivityDefinition } from "@/lib/system/activity-catalog";

type ActivitySummary = {
  activityId: string;
  label: string;
  count: number;
};

export default function ProfilePage() {
  const { snapshot } = useSystemSnapshot();
  const { currentRank } = usePerformanceView(snapshot);
  const { entries } = useSessionHistory();
  const { currentAccount } = useAccount();
  const { groups } = useGroupLeaderboards();

  const activities = useMemo(() => {
    const buckets = new Map<string, ActivitySummary>();
    entries.forEach((entry) => {
      const activityId = entry.activityId || "WEIGHTLIFTING";
      const label = entry.activityLabel || getActivityDefinition(activityId).label;
      const current = buckets.get(activityId);
      if (!current) {
        buckets.set(activityId, { activityId, label, count: 1 });
      } else {
        buckets.set(activityId, { ...current, count: current.count + 1 });
      }
    });
    return [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [entries]);

  const squads = useMemo(() => {
    if (!currentAccount) return [];
    const mine = getLeaderboardsForAccount(currentAccount.id);
    return mine.map((squad) => groups.find((item) => item.id === squad.id) ?? squad);
  }, [currentAccount, groups]);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="PROFILE"
          title="Operator Profile"
          description="Identity and competitive status summary."
          statusLine={currentAccount ? `Signed in as ${currentAccount.username}` : "No active account"}
        />

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-3">
            <CollapsiblePanel panelId="profile-rank" title="Rank" className="font-mono">
              <p className="text-2xl text-cyan-100">{currentRank.id}</p>
              <p className="mt-2 text-xs text-cyan-300/85">Total XP {snapshot.xp.totalXp}</p>
              <p className="mt-1 text-xs text-cyan-300/85">Session XP {snapshot.xp.sessionXp}</p>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="profile-activities" title="Activities" className="font-mono">
              {activities.length === 0 ? (
                <p className="text-xs text-cyan-300/85">No activity entries yet.</p>
              ) : (
                <div className="grid gap-1">
                  {activities.map((activity) => (
                    <p key={`profile-activity-${activity.activityId}`} className="border border-cyan-500/25 px-2 py-1 text-[11px] text-cyan-300/90">
                      {activity.label} | entries {activity.count}
                    </p>
                  ))}
                </div>
              )}
            </CollapsiblePanel>

            <CollapsiblePanel panelId="profile-squads" title="Squad" className="font-mono">
              {!currentAccount ? (
                <div className="grid gap-2">
                  <p className="text-xs text-cyan-300/85">Account required for squad membership.</p>
                  <Link
                    href="/account"
                    className="w-fit border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                  >
                    OPEN ACCOUNT
                  </Link>
                </div>
              ) : squads.length === 0 ? (
                <div className="grid gap-2">
                  <p className="text-xs text-cyan-300/85">No squad membership detected.</p>
                  <Link
                    href="/groups"
                    className="w-fit border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                  >
                    OPEN SQUADS
                  </Link>
                </div>
              ) : (
                <div className="grid gap-1">
                  {squads.map((squad) => (
                    <p key={`profile-squad-${squad.id}`} className="border border-cyan-500/25 px-2 py-1 text-[11px] text-cyan-300/90">
                      {squad.name} | code {squad.joinCode}
                    </p>
                  ))}
                </div>
              )}
            </CollapsiblePanel>
          </section>
        </TacticalReveal>
      </section>
    </main>
  );
}


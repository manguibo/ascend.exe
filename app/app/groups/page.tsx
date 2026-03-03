"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { PageHeader } from "@/components/system/page-header";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { buildSessionHistorySummary } from "@/lib/system/session-history";
import { useSessionHistory } from "@/lib/system/use-session-history";
import { useAccount } from "@/lib/system/use-account";
import {
  addManualLeaderboardMember,
  createLeaderboardGroup,
  getLeaderboardsForAccount,
  syncSelfMemberXp,
  type GroupLeaderboard,
} from "@/lib/system/group-leaderboard";
import { useGroupLeaderboards } from "@/lib/system/use-group-leaderboards";

function formatDate(timestampIso: string): string {
  const parsed = Date.parse(timestampIso);
  if (!Number.isFinite(parsed)) return "UNKNOWN";
  return new Date(parsed).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

export default function GroupsPage() {
  const { currentAccount } = useAccount();
  const { groups } = useGroupLeaderboards();
  const { entries } = useSessionHistory();
  const summary = useMemo(() => buildSessionHistorySummary(entries), [entries]);
  const accountGroups = useMemo(
    () => (currentAccount ? getLeaderboardsForAccount(currentAccount.id).map((group) => groups.find((item) => item.id === group.id) ?? group) : []),
    [currentAccount, groups],
  );

  const [groupName, setGroupName] = useState("");
  const [status, setStatus] = useState("");
  const [friendInputs, setFriendInputs] = useState<Record<string, { username: string; xp: string }>>({});

  const handleCreateGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentAccount) {
      setStatus("AUTH REQUIRED.");
      return;
    }
    const created = createLeaderboardGroup(currentAccount.id, currentAccount.username, groupName, summary.latestTotalXp);
    if (!created) {
      setStatus("GROUP CREATION FAILED.");
      return;
    }
    setGroupName("");
    setStatus("GROUP CREATED.");
  };

  const syncMyXp = (group: GroupLeaderboard) => {
    if (!currentAccount) return;
    const synced = syncSelfMemberXp(group.id, currentAccount.id, currentAccount.username, summary.latestTotalXp);
    setStatus(synced ? "SELF XP SYNCHRONIZED." : "SYNC FAILED.");
  };

  const addFriend = (group: GroupLeaderboard) => {
    const input = friendInputs[group.id] ?? { username: "", xp: "" };
    const xp = Number(input.xp);
    const next = addManualLeaderboardMember(group.id, input.username, Number.isFinite(xp) ? xp : 0);
    if (!next) {
      setStatus("MEMBER ADD FAILED.");
      return;
    }
    setFriendInputs((prev) => ({ ...prev, [group.id]: { username: "", xp: "" } }));
    setStatus("MEMBER ADDED.");
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="GROUP LEADERBOARD"
          title="Competition Groups"
          description="Create a group and track comparative XP standings with friends."
          statusLine="Leaderboard storage active"
        />

        {status ? <p className="border border-cyan-500/35 px-3 py-2 font-mono text-xs tracking-[0.14em] text-cyan-300/90">{status}</p> : null}

        {!currentAccount ? (
          <TacticalReveal delay={0.04}>
            <CollapsiblePanel panelId="groups-auth-gate" title="Authentication required" className="font-mono">
              <p className="text-xs text-cyan-300/85">CREATE OR SIGN IN TO ENABLE GROUP LEADERBOARDS.</p>
              <Link
                href="/account"
                className="mt-3 inline-block border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
              >
                OPEN ACCOUNT
              </Link>
            </CollapsiblePanel>
          </TacticalReveal>
        ) : (
          <>
            <TacticalReveal delay={0.04}>
              <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <CollapsiblePanel panelId="groups-create" title="Create group" className="font-mono">
                  <form onSubmit={handleCreateGroup} className="grid gap-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] tracking-[0.14em] text-cyan-500">GROUP NAME</span>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(event) => setGroupName(event.target.value)}
                        className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                      />
                    </label>
                    <p className="text-[11px] text-cyan-300/80">
                      Current operator XP {summary.latestTotalXp} | Entries {summary.entryCount}
                    </p>
                    <button
                      type="submit"
                      className="mt-1 border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                    >
                      CREATE GROUP
                    </button>
                  </form>
                </CollapsiblePanel>

                <CollapsiblePanel panelId="groups-active" title={`Your groups (${accountGroups.length})`} className="font-mono">
                  {accountGroups.length === 0 ? (
                    <p className="text-xs text-cyan-300/85">NO GROUPS FOUND. CREATE A GROUP TO START COMPETITION.</p>
                  ) : (
                    <div className="grid gap-3">
                      {accountGroups.map((group) => {
                        const rankedMembers = [...group.members].sort((a, b) => b.xp - a.xp);
                        const friendInput = friendInputs[group.id] ?? { username: "", xp: "" };
                        return (
                          <article key={group.id} className="border border-cyan-500/30 p-3">
                            <p className="text-xs tracking-[0.14em] text-cyan-100">{group.name}</p>
                            <p className="mt-1 text-[10px] tracking-[0.14em] text-cyan-500/90">
                              INVITE {group.inviteCode} | CREATED {formatDate(group.createdAtIso)}
                            </p>
                            <div className="mt-2 grid gap-1">
                              {rankedMembers.map((member, index) => (
                                <p key={member.id} className="border border-cyan-500/20 px-2 py-1 text-[11px] text-cyan-300/90">
                                  {index + 1}. {member.username} | XP {member.xp}
                                </p>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => syncMyXp(group)}
                                className="border border-cyan-500/40 px-3 py-1.5 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                              >
                                SYNC MY XP
                              </button>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                              <input
                                type="text"
                                placeholder="Friend username"
                                value={friendInput.username}
                                onChange={(event) =>
                                  setFriendInputs((prev) => ({
                                    ...prev,
                                    [group.id]: { ...friendInput, username: event.target.value },
                                  }))
                                }
                                className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                              />
                              <input
                                type="number"
                                placeholder="XP"
                                value={friendInput.xp}
                                onChange={(event) =>
                                  setFriendInputs((prev) => ({
                                    ...prev,
                                    [group.id]: { ...friendInput, xp: event.target.value },
                                  }))
                                }
                                className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                              />
                              <button
                                type="button"
                                onClick={() => addFriend(group)}
                                className="border border-cyan-500/40 px-2 py-1.5 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                              >
                                ADD FRIEND
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </CollapsiblePanel>
              </section>
            </TacticalReveal>
          </>
        )}
      </section>
    </main>
  );
}

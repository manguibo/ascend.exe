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
  createLeaderboardGroup,
  getLeaderboardsForAccount,
  joinLeaderboardGroupByCode,
  syncSelfMemberXp,
  type GroupLeaderboard,
} from "@/lib/system/group-leaderboard";
import { useGroupLeaderboards } from "@/lib/system/use-group-leaderboards";

type SquadActionMode = "CREATE" | "JOIN";

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
  const squadList = useMemo(
    () => (currentAccount ? getLeaderboardsForAccount(currentAccount.id).map((squad) => groups.find((item) => item.id === squad.id) ?? squad) : []),
    [currentAccount, groups],
  );

  const [mode, setMode] = useState<SquadActionMode>("CREATE");
  const [squadName, setSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState("");

  const handleCreateSquad = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentAccount) {
      setStatus("AUTH REQUIRED.");
      return;
    }
    const created = createLeaderboardGroup(currentAccount.id, currentAccount.username, squadName, summary.latestTotalXp);
    if (!created) {
      setStatus("SQUAD CREATION FAILED.");
      return;
    }
    setSquadName("");
    setStatus(`SQUAD CREATED. JOIN CODE ${created.joinCode}.`);
  };

  const handleJoinSquad = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentAccount) {
      setStatus("AUTH REQUIRED.");
      return;
    }
    const joined = joinLeaderboardGroupByCode(currentAccount.id, currentAccount.username, joinCode, summary.latestTotalXp);
    if (!joined) {
      setStatus("JOIN FAILED. CHECK SIX-DIGIT CODE.");
      return;
    }
    setJoinCode("");
    setStatus(`JOINED SQUAD ${joined.name}.`);
  };

  const syncMyXp = (squad: GroupLeaderboard) => {
    if (!currentAccount) return;
    const synced = syncSelfMemberXp(squad.id, currentAccount.id, currentAccount.username, summary.latestTotalXp);
    setStatus(synced ? "SELF XP SYNCHRONIZED." : "SYNC FAILED.");
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="SQUADS"
          title="Squad Competition"
          description="Create or join a squad, then compete on shared XP standings."
          statusLine="Join code protocol active"
        />

        {status ? <p className="border border-cyan-500/35 px-3 py-2 font-mono text-xs tracking-[0.14em] text-cyan-300/90">{status}</p> : null}

        {!currentAccount ? (
          <TacticalReveal delay={0.04}>
            <CollapsiblePanel panelId="squads-auth-gate" title="Authentication required" className="font-mono">
              <p className="text-xs text-cyan-300/85">CREATE OR SIGN IN TO ENABLE SQUAD FEATURES.</p>
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
                <CollapsiblePanel panelId="squads-actions" title="Squad actions" className="font-mono">
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("CREATE")}
                      className={`border px-3 py-1.5 text-xs tracking-[0.14em] ${mode === "CREATE" ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300"}`}
                    >
                      CREATE SQUAD
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("JOIN")}
                      className={`border px-3 py-1.5 text-xs tracking-[0.14em] ${mode === "JOIN" ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300"}`}
                    >
                      JOIN SQUAD
                    </button>
                  </div>

                  {mode === "CREATE" ? (
                    <form onSubmit={handleCreateSquad} className="grid gap-2">
                      <label className="grid gap-1">
                        <span className="text-[10px] tracking-[0.14em] text-cyan-500">SQUAD NAME</span>
                        <input
                          type="text"
                          value={squadName}
                          onChange={(event) => setSquadName(event.target.value)}
                          className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                        />
                      </label>
                      <button
                        type="submit"
                        className="mt-1 border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                      >
                        CREATE SQUAD
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleJoinSquad} className="grid gap-2">
                      <label className="grid gap-1">
                        <span className="text-[10px] tracking-[0.14em] text-cyan-500">SIX-DIGIT JOIN CODE</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={joinCode}
                          onChange={(event) => setJoinCode(event.target.value.replaceAll(/\D/g, "").slice(0, 6))}
                          className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                        />
                      </label>
                      <button
                        type="submit"
                        className="mt-1 border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                      >
                        JOIN SQUAD
                      </button>
                    </form>
                  )}

                  <p className="mt-3 text-[11px] text-cyan-300/80">
                    Current operator XP {summary.latestTotalXp} | Entries {summary.entryCount}
                  </p>
                </CollapsiblePanel>

                <CollapsiblePanel panelId="squads-active" title={`Your squads (${squadList.length})`} className="font-mono">
                  {squadList.length === 0 ? (
                    <p className="text-xs text-cyan-300/85">NO SQUADS FOUND. CREATE OR JOIN A SQUAD.</p>
                  ) : (
                    <div className="grid gap-3">
                      {squadList.map((squad) => {
                        const rankedMembers = [...squad.members].sort((a, b) => b.xp - a.xp);
                        return (
                          <article key={squad.id} className="border border-cyan-500/30 p-3">
                            <p className="text-xs tracking-[0.14em] text-cyan-100">{squad.name}</p>
                            <p className="mt-1 text-[10px] tracking-[0.14em] text-cyan-500/90">
                              JOIN CODE {squad.joinCode} | CREATED {formatDate(squad.createdAtIso)}
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
                                onClick={() => syncMyXp(squad)}
                                className="border border-cyan-500/40 px-3 py-1.5 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                              >
                                SYNC MY XP
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


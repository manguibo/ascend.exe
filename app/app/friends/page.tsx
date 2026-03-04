"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { PageHeader } from "@/components/system/page-header";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { isAccountOnline } from "@/lib/system/account-state";
import { addFriendByUsername } from "@/lib/system/friend-state";
import { useAccount } from "@/lib/system/use-account";
import { useFriendIds } from "@/lib/system/use-friends";

function statusTextFromError(error?: string): string {
  if (error === "ACCOUNT_REQUIRED") return "ACCOUNT REQUIRED.";
  if (error === "USERNAME_REQUIRED") return "USERNAME REQUIRED.";
  if (error === "ACCOUNT_NOT_FOUND") return "USERNAME NOT FOUND.";
  if (error === "CANNOT_ADD_SELF") return "CANNOT ADD SELF.";
  if (error === "ALREADY_FRIEND") return "ALREADY IN FRIENDS LIST.";
  return "REQUEST FAILED.";
}

export default function FriendsPage() {
  const { currentAccount, accounts } = useAccount();
  const { ids } = useFriendIds(currentAccount?.id);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const friendAccounts = useMemo(() => {
    if (!currentAccount) return [];
    const friendIdSet = new Set(ids);
    return accounts.filter((account) => friendIdSet.has(account.id)).sort((a, b) => a.username.localeCompare(b.username));
  }, [accounts, currentAccount, ids]);

  const searchResults = useMemo(() => {
    if (!currentAccount) return [];
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const friendIds = new Set(friendAccounts.map((account) => account.id));
    return accounts
      .filter((account) => account.id !== currentAccount.id)
      .filter((account) => account.username.toLowerCase().includes(query))
      .map((account) => ({
        account,
        alreadyFriend: friendIds.has(account.id),
      }))
      .slice(0, 8);
  }, [accounts, currentAccount, friendAccounts, search]);

  const handleAddFriend = (username: string) => {
    if (!currentAccount) return;
    const result = addFriendByUsername(currentAccount.id, username, accounts);
    if (!result.ok) {
      setStatus(statusTextFromError(result.error));
      return;
    }
    setStatus(`FRIEND ADDED: ${username.toUpperCase()}`);
    setSearch("");
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="FRIENDS"
          title="Friend Network"
          description="Track friends and monitor live online status."
          statusLine={currentAccount ? `Signed in as ${currentAccount.username}` : "No active account"}
        />

        {status ? <p className="border border-cyan-500/35 px-3 py-2 font-mono text-xs tracking-[0.14em] text-cyan-300/90">{status}</p> : null}

        {!currentAccount ? (
          <TacticalReveal delay={0.04}>
            <CollapsiblePanel panelId="friends-auth-gate" title="Authentication required" className="font-mono">
              <p className="text-xs text-cyan-300/85">CREATE OR SIGN IN TO MANAGE FRIENDS.</p>
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
                <CollapsiblePanel panelId="friends-search" title="Add friends by username" className="font-mono">
                  <label className="grid gap-1">
                    <span className="text-[10px] tracking-[0.14em] text-cyan-500">USERNAME SEARCH</span>
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search username"
                      className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none placeholder:text-cyan-700/70 focus:border-cyan-300"
                    />
                  </label>
                  {search.trim().length > 0 ? (
                    <div className="mt-3 grid gap-1">
                      {searchResults.length === 0 ? (
                        <p className="text-[11px] text-cyan-300/80">NO MATCHES.</p>
                      ) : (
                        searchResults.map((item) => (
                          <div key={`search-${item.account.id}`} className="flex items-center justify-between gap-2 border border-cyan-500/25 px-2 py-1.5">
                            <p className="text-[11px] text-cyan-200">{item.account.username}</p>
                            <button
                              type="button"
                              onClick={() => handleAddFriend(item.account.username)}
                              disabled={item.alreadyFriend}
                              className="border border-cyan-500/35 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-40"
                            >
                              {item.alreadyFriend ? "ADDED" : "ADD"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-cyan-300/80">ENTER A USERNAME TO SEARCH.</p>
                  )}
                </CollapsiblePanel>

                <CollapsiblePanel panelId="friends-list" title={`Friends list (${friendAccounts.length})`} className="font-mono">
                  {friendAccounts.length === 0 ? (
                    <p className="text-xs text-cyan-300/85">NO FRIENDS LINKED YET.</p>
                  ) : (
                    <div className="grid gap-1">
                      {friendAccounts.map((friend) => {
                        const online = isAccountOnline(friend.id);
                        return (
                          <div key={`friend-${friend.id}`} className="flex items-center justify-between gap-2 border border-cyan-500/25 px-2 py-1.5">
                            <p className="text-[11px] text-cyan-200">{friend.username}</p>
                            <p className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${online ? "border-cyan-300 text-cyan-100" : "border-cyan-500/35 text-cyan-500"}`}>
                              {online ? "ONLINE" : "OFFLINE"}
                            </p>
                          </div>
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

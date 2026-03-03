"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { PageHeader } from "@/components/system/page-header";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { createAccount, signIn, signOut, type AccountValidationError } from "@/lib/system/account-state";
import { useAccount } from "@/lib/system/use-account";

function messageForError(error: AccountValidationError | undefined): string {
  if (error === "EMAIL_REQUIRED") return "EMAIL REQUIRED.";
  if (error === "EMAIL_INVALID") return "EMAIL FORMAT INVALID.";
  if (error === "EMAIL_EXISTS") return "EMAIL ALREADY REGISTERED.";
  if (error === "USERNAME_REQUIRED") return "USERNAME REQUIRED.";
  if (error === "USERNAME_EXISTS") return "USERNAME ALREADY REGISTERED.";
  if (error === "PASSWORD_REQUIRED") return "PASSWORD REQUIRED.";
  if (error === "PASSWORD_TOO_SHORT") return "PASSWORD MUST BE 8+ CHARACTERS.";
  if (error === "ACCOUNT_NOT_FOUND") return "ACCOUNT NOT FOUND.";
  if (error === "PASSWORD_INVALID") return "PASSWORD INVALID.";
  return "REQUEST REJECTED.";
}

export default function AccountPage() {
  const { currentAccount, accounts } = useAccount();
  const [createEmail, setCreateEmail] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createAccount(createEmail, createUsername, createPassword);
    if (!result.ok) {
      setStatus(messageForError(result.error));
      return;
    }
    setCreateEmail("");
    setCreateUsername("");
    setCreatePassword("");
    setStatus("ACCOUNT CREATED. SESSION ACTIVE.");
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = signIn(loginEmail, loginPassword);
    if (!result.ok) {
      setStatus(messageForError(result.error));
      return;
    }
    setLoginEmail("");
    setLoginPassword("");
    setStatus("LOGIN ACCEPTED.");
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="ACCOUNT"
          title="Operator Profile"
          description="Create and authenticate an account for squad competition features."
          statusLine="Local mode credentials"
        />

        {status ? <p className="border border-cyan-500/35 px-3 py-2 font-mono text-xs tracking-[0.14em] text-cyan-300/90">{status}</p> : null}

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-2">
            <CollapsiblePanel panelId="account-session" title="Session status" className="font-mono">
              {currentAccount ? (
                <div className="grid gap-2">
                  <p className="text-xs text-cyan-200">ACTIVE USERNAME {currentAccount.username}</p>
                  <p className="text-xs text-cyan-300/85">EMAIL {currentAccount.email}</p>
                  <p className="text-xs text-cyan-300/80">CREATED {new Date(currentAccount.createdAtIso).toLocaleString("en-US")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setStatus("SESSION CLOSED.");
                      }}
                      className="border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                    >
                      SIGN OUT
                    </button>
                    <Link
                      href="/groups"
                      className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                    >
                      OPEN SQUADS
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-cyan-300/85">NO ACTIVE SESSION. CREATE OR SIGN IN BELOW.</p>
              )}
              <p className="mt-4 text-xs text-cyan-500/90">REGISTERED ACCOUNTS {accounts.length}</p>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="account-create" title="Create account" className="font-mono">
              <form onSubmit={handleCreate} className="grid gap-2">
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500">EMAIL</span>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500">USERNAME</span>
                  <input
                    type="text"
                    value={createUsername}
                    onChange={(event) => setCreateUsername(event.target.value)}
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500">PASSWORD</span>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value)}
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                >
                  CREATE ACCOUNT
                </button>
              </form>
            </CollapsiblePanel>
          </section>
        </TacticalReveal>

        <TacticalReveal delay={0.07}>
          <CollapsiblePanel panelId="account-login" title="Sign in existing account" className="font-mono">
            <form onSubmit={handleLogin} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-1">
                <span className="text-[10px] tracking-[0.14em] text-cyan-500">EMAIL</span>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] tracking-[0.14em] text-cyan-500">PASSWORD</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="border border-cyan-500/40 bg-black px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-300"
                />
              </label>
              <button
                type="submit"
                className="self-end border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
              >
                SIGN IN
              </button>
            </form>
          </CollapsiblePanel>
        </TacticalReveal>
      </section>
    </main>
  );
}

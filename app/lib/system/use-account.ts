"use client";

import { useSyncExternalStore } from "react";
import { getAccounts, getCurrentAccount, subscribeAccountState } from "./account-state";

const emptyAccounts: readonly ReturnType<typeof getAccounts>[number][] = [];

export function useAccount() {
  const currentAccount = useSyncExternalStore(subscribeAccountState, getCurrentAccount, () => null);
  const accounts = useSyncExternalStore(subscribeAccountState, getAccounts, () => emptyAccounts);
  return { currentAccount, accounts };
}

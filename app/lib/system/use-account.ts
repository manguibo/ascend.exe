"use client";

import { useSyncExternalStore } from "react";
import { getAccounts, getCurrentAccount, subscribeAccountState } from "./account-state";

export function useAccount() {
  const currentAccount = useSyncExternalStore(subscribeAccountState, getCurrentAccount, () => null);
  const accounts = useSyncExternalStore(subscribeAccountState, getAccounts, () => []);
  return { currentAccount, accounts };
}


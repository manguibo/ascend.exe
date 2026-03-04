"use client";

import { useSyncExternalStore } from "react";
import { getFriendIdsForAccount, subscribeFriendState } from "./friend-state";

const emptyIds: readonly [] = [];

export function useFriendIds(accountId: string | null | undefined) {
  const ids = useSyncExternalStore(
    subscribeFriendState,
    () => (accountId ? getFriendIdsForAccount(accountId) : emptyIds),
    () => emptyIds,
  );
  return { ids };
}


"use client";

import { useSyncExternalStore } from "react";
import { getGroupLeaderboards, subscribeGroupLeaderboards } from "./group-leaderboard";

const emptyGroups: readonly [] = [];

export function useGroupLeaderboards() {
  const groups = useSyncExternalStore(subscribeGroupLeaderboards, getGroupLeaderboards, () => emptyGroups);
  return { groups };
}


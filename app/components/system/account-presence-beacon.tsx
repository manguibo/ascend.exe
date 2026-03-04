"use client";

import { useEffect } from "react";
import { markAccountOffline, touchCurrentAccountPresence } from "@/lib/system/account-state";
import { useAccount } from "@/lib/system/use-account";

const HEARTBEAT_MS = 20_000;

export function AccountPresenceBeacon() {
  const { currentAccount } = useAccount();

  useEffect(() => {
    if (!currentAccount) {
      return;
    }

    touchCurrentAccountPresence();
    const interval = window.setInterval(() => {
      touchCurrentAccountPresence();
    }, HEARTBEAT_MS);

    const handleBeforeUnload = () => {
      markAccountOffline(currentAccount.id);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      markAccountOffline(currentAccount.id);
    };
  }, [currentAccount]);

  return null;
}


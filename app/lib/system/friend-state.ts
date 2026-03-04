import type { UserAccount } from "./account-state";

type FriendRecord = {
  byAccountId: Record<string, string[]>;
};

export type AddFriendError = "ACCOUNT_REQUIRED" | "USERNAME_REQUIRED" | "ACCOUNT_NOT_FOUND" | "CANNOT_ADD_SELF" | "ALREADY_FRIEND";

export type AddFriendResult = {
  ok: boolean;
  error?: AddFriendError;
  friendAccountId?: string;
};

export const FRIEND_STORAGE_KEY = "ascend.friend.state.v1";
export const FRIEND_UPDATED_EVENT = "ascend:friend-updated";

let cachedSerialized: string | null | undefined;
let cachedRecord: FriendRecord = { byAccountId: {} };

function parseRecord(value: unknown): FriendRecord {
  if (typeof value !== "object" || value === null) return { byAccountId: {} };
  const raw = value as { byAccountId?: unknown };
  if (typeof raw.byAccountId !== "object" || raw.byAccountId === null) return { byAccountId: {} };
  const byAccountId = Object.fromEntries(
    Object.entries(raw.byAccountId as Record<string, unknown>).map(([accountId, ids]) => {
      const friendIds = Array.isArray(ids)
        ? ids.filter((id) => typeof id === "string").map((id) => id.trim()).filter((id) => id.length > 0)
        : [];
      return [accountId, [...new Set(friendIds)].slice(0, 256)];
    }),
  );
  return { byAccountId };
}

function getRecordSnapshot(): FriendRecord {
  if (typeof window === "undefined") return cachedRecord;
  const stored = window.localStorage.getItem(FRIEND_STORAGE_KEY);
  if (stored === cachedSerialized) return cachedRecord;
  cachedSerialized = stored;
  if (!stored) {
    cachedRecord = { byAccountId: {} };
    return cachedRecord;
  }
  try {
    cachedRecord = parseRecord(JSON.parse(stored));
    return cachedRecord;
  } catch {
    cachedRecord = { byAccountId: {} };
    return cachedRecord;
  }
}

function saveRecord(record: FriendRecord): void {
  const serialized = JSON.stringify(record);
  cachedSerialized = serialized;
  cachedRecord = record;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FRIEND_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(FRIEND_UPDATED_EVENT));
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function getFriendIdsForAccount(accountId: string): readonly string[] {
  if (!accountId) return [];
  return getRecordSnapshot().byAccountId[accountId] ?? [];
}

export function getFriendsForAccount(accountId: string, accounts: readonly UserAccount[]): readonly UserAccount[] {
  const ids = new Set(getFriendIdsForAccount(accountId));
  return accounts.filter((account) => ids.has(account.id)).sort((a, b) => a.username.localeCompare(b.username));
}

export function addFriendByUsername(accountId: string, usernameRaw: string, accounts: readonly UserAccount[]): AddFriendResult {
  if (!accountId) return { ok: false, error: "ACCOUNT_REQUIRED" };
  const username = normalizeUsername(usernameRaw);
  if (!username) return { ok: false, error: "USERNAME_REQUIRED" };

  const target = accounts.find((account) => normalizeUsername(account.username) === username);
  if (!target) return { ok: false, error: "ACCOUNT_NOT_FOUND" };
  if (target.id === accountId) return { ok: false, error: "CANNOT_ADD_SELF" };

  const record = getRecordSnapshot();
  const currentIds = new Set(record.byAccountId[accountId] ?? []);
  if (currentIds.has(target.id)) {
    return { ok: false, error: "ALREADY_FRIEND" };
  }
  const targetIds = new Set(record.byAccountId[target.id] ?? []);
  currentIds.add(target.id);
  targetIds.add(accountId);

  saveRecord({
    byAccountId: {
      ...record.byAccountId,
      [accountId]: [...currentIds],
      [target.id]: [...targetIds],
    },
  });
  return { ok: true, friendAccountId: target.id };
}

export function clearFriendState(): void {
  saveRecord({ byAccountId: {} });
}

export function subscribeFriendState(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FRIEND_STORAGE_KEY) onStoreChange();
  };
  const handleUpdate = () => onStoreChange();
  window.addEventListener("storage", handleStorage);
  window.addEventListener(FRIEND_UPDATED_EVENT, handleUpdate);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FRIEND_UPDATED_EVENT, handleUpdate);
  };
}


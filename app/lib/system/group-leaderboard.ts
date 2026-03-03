export type GroupLeaderboardMember = {
  id: string;
  accountId: string | null;
  username: string;
  xp: number;
  source: "SELF" | "MANUAL";
  updatedAtIso: string;
};

export type GroupLeaderboard = {
  id: string;
  name: string;
  inviteCode: string;
  ownerAccountId: string;
  createdAtIso: string;
  members: GroupLeaderboardMember[];
};

type GroupRecord = {
  groups: GroupLeaderboard[];
};

export const GROUP_STORAGE_KEY = "ascend.group.leaderboard.v1";
export const GROUP_UPDATED_EVENT = "ascend:group-leaderboard-updated";

let cachedSerialized: string | null | undefined;
let cachedRecord: GroupRecord = { groups: [] };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function parseText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : fallback;
}

function parseRecord(value: unknown): GroupRecord {
  if (typeof value !== "object" || value === null) {
    return { groups: [] };
  }
  const raw = value as { groups?: unknown };
  if (!Array.isArray(raw.groups)) return { groups: [] };

  const groups = raw.groups
    .map((group) => {
      const item = typeof group === "object" && group !== null ? (group as Record<string, unknown>) : null;
      if (!item) return null;
      const membersRaw = Array.isArray(item.members) ? item.members : [];
      const members = membersRaw
        .map((member) => {
          const memberRaw = typeof member === "object" && member !== null ? (member as Record<string, unknown>) : null;
          if (!memberRaw) return null;
          return {
            id: parseText(memberRaw.id, "", 64),
            accountId: typeof memberRaw.accountId === "string" ? memberRaw.accountId : null,
            username: parseText(memberRaw.username, "UNKNOWN", 32),
            xp: parseNumber(memberRaw.xp, 0, 0, 1_000_000_000),
            source: memberRaw.source === "SELF" ? "SELF" : "MANUAL",
            updatedAtIso: parseText(memberRaw.updatedAtIso, new Date().toISOString(), 64),
          } satisfies GroupLeaderboardMember;
        })
        .filter((entry): entry is GroupLeaderboardMember => entry !== null && entry.id.length > 0);
      return {
        id: parseText(item.id, "", 64),
        name: parseText(item.name, "GROUP", 40),
        inviteCode: parseText(item.inviteCode, "INVITE", 16),
        ownerAccountId: parseText(item.ownerAccountId, "", 64),
        createdAtIso: parseText(item.createdAtIso, new Date().toISOString(), 64),
        members,
      } satisfies GroupLeaderboard;
    })
    .filter((entry): entry is GroupLeaderboard => entry !== null && entry.id.length > 0 && entry.ownerAccountId.length > 0);

  return { groups };
}

function getRecordSnapshot(): GroupRecord {
  if (typeof window === "undefined") {
    return cachedRecord;
  }

  const stored = window.localStorage.getItem(GROUP_STORAGE_KEY);
  if (stored === cachedSerialized) {
    return cachedRecord;
  }

  cachedSerialized = stored;
  if (!stored) {
    cachedRecord = { groups: [] };
    return cachedRecord;
  }

  try {
    cachedRecord = parseRecord(JSON.parse(stored));
    return cachedRecord;
  } catch {
    cachedRecord = { groups: [] };
    return cachedRecord;
  }
}

function saveRecord(record: GroupRecord): void {
  const serialized = JSON.stringify(record);
  cachedSerialized = serialized;
  cachedRecord = record;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GROUP_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(GROUP_UPDATED_EVENT));
}

function buildId(prefix: string): string {
  const now = Date.now().toString(36);
  const salt = Math.floor(Math.random() * 1_000_000)
    .toString(36)
    .padStart(4, "0");
  return `${prefix}_${now}_${salt}`;
}

function buildInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getGroupLeaderboards(): readonly GroupLeaderboard[] {
  return getRecordSnapshot().groups;
}

export function getLeaderboardsForAccount(accountId: string): readonly GroupLeaderboard[] {
  if (!accountId) return [];
  return getRecordSnapshot().groups.filter((group) => group.ownerAccountId === accountId);
}

export function createLeaderboardGroup(accountId: string, ownerUsername: string, groupNameRaw: string, ownerXp: number): GroupLeaderboard | null {
  const groupName = parseText(groupNameRaw, "", 40);
  if (!accountId || !groupName) return null;
  const record = getRecordSnapshot();
  const nowIso = new Date().toISOString();
  const group: GroupLeaderboard = {
    id: buildId("grp"),
    name: groupName,
    inviteCode: buildInviteCode(),
    ownerAccountId: accountId,
    createdAtIso: nowIso,
    members: [
      {
        id: buildId("mbr"),
        accountId,
        username: parseText(ownerUsername, "OPERATOR", 32),
        xp: parseNumber(ownerXp, 0, 0, 1_000_000_000),
        source: "SELF",
        updatedAtIso: nowIso,
      },
    ],
  };
  saveRecord({ groups: [...record.groups, group] });
  return group;
}

export function addManualLeaderboardMember(groupId: string, usernameRaw: string, xpRaw: number): GroupLeaderboard | null {
  const username = parseText(usernameRaw, "", 32);
  if (!groupId || !username) return null;

  const record = getRecordSnapshot();
  const target = record.groups.find((group) => group.id === groupId);
  if (!target) return null;
  const nowIso = new Date().toISOString();
  const xp = parseNumber(xpRaw, 0, 0, 1_000_000_000);
  const nextGroup: GroupLeaderboard = {
    ...target,
    members: [
      ...target.members,
      {
        id: buildId("mbr"),
        accountId: null,
        username,
        xp,
        source: "MANUAL",
        updatedAtIso: nowIso,
      },
    ],
  };
  saveRecord({
    groups: record.groups.map((group) => (group.id === groupId ? nextGroup : group)),
  });
  return nextGroup;
}

export function syncSelfMemberXp(groupId: string, accountId: string, username: string, xpRaw: number): GroupLeaderboard | null {
  if (!groupId || !accountId) return null;
  const record = getRecordSnapshot();
  const group = record.groups.find((item) => item.id === groupId);
  if (!group) return null;
  const nowIso = new Date().toISOString();
  const xp = parseNumber(xpRaw, 0, 0, 1_000_000_000);
  const existingSelf = group.members.find((member) => member.accountId === accountId);
  const members = existingSelf
    ? group.members.map((member) =>
        member.accountId === accountId ? { ...member, username: parseText(username, member.username, 32), xp, updatedAtIso: nowIso } : member,
      )
    : [
        ...group.members,
        {
          id: buildId("mbr"),
          accountId,
          username: parseText(username, "OPERATOR", 32),
          xp,
          source: "SELF" as const,
          updatedAtIso: nowIso,
        },
      ];
  const next: GroupLeaderboard = { ...group, members };
  saveRecord({
    groups: record.groups.map((item) => (item.id === groupId ? next : item)),
  });
  return next;
}

export function subscribeGroupLeaderboards(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === GROUP_STORAGE_KEY) {
      onStoreChange();
    }
  };
  const handleUpdate = () => onStoreChange();
  window.addEventListener("storage", handleStorage);
  window.addEventListener(GROUP_UPDATED_EVENT, handleUpdate);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(GROUP_UPDATED_EVENT, handleUpdate);
  };
}

export function clearGroupLeaderboards(): void {
  saveRecord({ groups: [] });
}

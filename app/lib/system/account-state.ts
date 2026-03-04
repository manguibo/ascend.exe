export type UserAccount = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAtIso: string;
};

export type AccountPresence = {
  online: boolean;
  lastSeenIso: string;
};

type AccountRecord = {
  accounts: UserAccount[];
  currentAccountId: string | null;
  presenceByAccountId: Record<string, AccountPresence>;
};

export type AccountValidationError =
  | "EMAIL_REQUIRED"
  | "EMAIL_INVALID"
  | "EMAIL_EXISTS"
  | "USERNAME_REQUIRED"
  | "USERNAME_EXISTS"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_TOO_SHORT"
  | "ACCOUNT_NOT_FOUND"
  | "PASSWORD_INVALID";

export type AccountMutationResult = {
  ok: boolean;
  error?: AccountValidationError;
  account?: UserAccount;
};

export const ACCOUNT_STORAGE_KEY = "ascend.account.state.v1";
export const ACCOUNT_UPDATED_EVENT = "ascend:account-updated";

let cachedSerialized: string | null | undefined;
let cachedRecord: AccountRecord = { accounts: [], currentAccountId: null, presenceByAccountId: {} };

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 120);
}

function normalizeUsername(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 32);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function simplePasswordHash(password: string): string {
  let hash = 5381;
  for (let index = 0; index < password.length; index += 1) {
    hash = (hash * 33) ^ password.charCodeAt(index);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function parseRecord(value: unknown): AccountRecord {
  if (typeof value !== "object" || value === null) {
    return { accounts: [], currentAccountId: null, presenceByAccountId: {} };
  }
  const raw = value as { accounts?: unknown; currentAccountId?: unknown; presenceByAccountId?: unknown };
  const accounts = Array.isArray(raw.accounts)
    ? raw.accounts
        .map((entry) => {
          const item = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : null;
          if (!item) return null;
          const id = typeof item.id === "string" ? item.id : "";
          const email = normalizeEmail(item.email);
          const username = normalizeUsername(item.username);
          const passwordHash = typeof item.passwordHash === "string" ? item.passwordHash : "";
          const createdAtIso = typeof item.createdAtIso === "string" ? item.createdAtIso : new Date().toISOString();
          if (!id || !email || !username || !passwordHash) return null;
          return { id, email, username, passwordHash, createdAtIso } satisfies UserAccount;
        })
        .filter((entry): entry is UserAccount => entry !== null)
    : [];
  const currentAccountId = typeof raw.currentAccountId === "string" ? raw.currentAccountId : null;
  const presenceByAccountId =
    typeof raw.presenceByAccountId === "object" && raw.presenceByAccountId !== null
      ? Object.fromEntries(
          Object.entries(raw.presenceByAccountId as Record<string, unknown>).map(([accountId, presenceRaw]) => {
            const entry = typeof presenceRaw === "object" && presenceRaw !== null ? (presenceRaw as Record<string, unknown>) : {};
            const online = entry.online === true;
            const lastSeenIso = typeof entry.lastSeenIso === "string" ? entry.lastSeenIso : new Date().toISOString();
            return [accountId, { online, lastSeenIso } satisfies AccountPresence];
          }),
        )
      : {};
  return { accounts, currentAccountId, presenceByAccountId };
}

function getRecordSnapshot(): AccountRecord {
  if (typeof window === "undefined") {
    return cachedRecord;
  }

  const stored = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (stored === cachedSerialized) {
    return cachedRecord;
  }

  cachedSerialized = stored;
  if (!stored) {
    cachedRecord = { accounts: [], currentAccountId: null, presenceByAccountId: {} };
    return cachedRecord;
  }

  try {
    cachedRecord = parseRecord(JSON.parse(stored));
    return cachedRecord;
  } catch {
    cachedRecord = { accounts: [], currentAccountId: null, presenceByAccountId: {} };
    return cachedRecord;
  }
}

function saveRecord(record: AccountRecord): void {
  const serialized = JSON.stringify(record);
  cachedSerialized = serialized;
  cachedRecord = record;

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(ACCOUNT_UPDATED_EVENT));
}

function buildAccountId(email: string): string {
  const now = Date.now().toString(36);
  const seed = simplePasswordHash(email + now).slice(1, 9);
  return `acct_${seed}_${now}`;
}

function withPresence(record: AccountRecord, accountId: string, online: boolean): AccountRecord {
  return {
    ...record,
    presenceByAccountId: {
      ...record.presenceByAccountId,
      [accountId]: { online, lastSeenIso: new Date().toISOString() },
    },
  };
}

export function getAccounts(): readonly UserAccount[] {
  return getRecordSnapshot().accounts;
}

export function getCurrentAccount(): UserAccount | null {
  const record = getRecordSnapshot();
  if (!record.currentAccountId) return null;
  return record.accounts.find((account) => account.id === record.currentAccountId) ?? null;
}

export function createAccount(emailRaw: string, usernameRaw: string, passwordRaw: string): AccountMutationResult {
  const email = normalizeEmail(emailRaw);
  const username = normalizeUsername(usernameRaw);
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  const record = getRecordSnapshot();

  if (!email) return { ok: false, error: "EMAIL_REQUIRED" };
  if (!isValidEmail(email)) return { ok: false, error: "EMAIL_INVALID" };
  if (record.accounts.some((account) => account.email === email)) return { ok: false, error: "EMAIL_EXISTS" };
  if (!username) return { ok: false, error: "USERNAME_REQUIRED" };
  if (record.accounts.some((account) => account.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: "USERNAME_EXISTS" };
  }
  if (!password) return { ok: false, error: "PASSWORD_REQUIRED" };
  if (password.length < 8) return { ok: false, error: "PASSWORD_TOO_SHORT" };

  const account: UserAccount = {
    id: buildAccountId(email),
    email,
    username,
    passwordHash: simplePasswordHash(password),
    createdAtIso: new Date().toISOString(),
  };

  const nextRecord = withPresence(
    {
      accounts: [...record.accounts, account],
      currentAccountId: account.id,
      presenceByAccountId: record.presenceByAccountId,
    },
    account.id,
    true,
  );
  const previousId = record.currentAccountId;
  const finalRecord =
    previousId && previousId !== account.id
      ? withPresence(nextRecord, previousId, false)
      : nextRecord;

  saveRecord(finalRecord);
  return { ok: true, account };
}

export function signIn(emailRaw: string, passwordRaw: string): AccountMutationResult {
  const email = normalizeEmail(emailRaw);
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  const record = getRecordSnapshot();
  const account = record.accounts.find((item) => item.email === email);
  if (!account) return { ok: false, error: "ACCOUNT_NOT_FOUND" };
  if (account.passwordHash !== simplePasswordHash(password)) {
    return { ok: false, error: "PASSWORD_INVALID" };
  }
  const withActive = withPresence(
    {
      ...record,
      currentAccountId: account.id,
    },
    account.id,
    true,
  );
  const finalRecord =
    record.currentAccountId && record.currentAccountId !== account.id
      ? withPresence(withActive, record.currentAccountId, false)
      : withActive;
  saveRecord(finalRecord);
  return { ok: true, account };
}

export function signOut(): void {
  const record = getRecordSnapshot();
  if (!record.currentAccountId) return;
  const next = withPresence(
    {
      ...record,
      currentAccountId: null,
    },
    record.currentAccountId,
    false,
  );
  saveRecord(next);
}

export function touchCurrentAccountPresence(): void {
  const record = getRecordSnapshot();
  const accountId = record.currentAccountId;
  if (!accountId) return;
  saveRecord(withPresence(record, accountId, true));
}

export function markAccountOffline(accountId: string): void {
  if (!accountId) return;
  const record = getRecordSnapshot();
  if (!record.accounts.some((account) => account.id === accountId)) return;
  saveRecord(withPresence(record, accountId, false));
}

export function getAccountPresence(accountId: string): AccountPresence {
  const record = getRecordSnapshot();
  return record.presenceByAccountId[accountId] ?? { online: false, lastSeenIso: "" };
}

export function isAccountOnline(accountId: string, staleWindowMs = 75_000): boolean {
  const presence = getAccountPresence(accountId);
  if (!presence.online) return false;
  const lastSeenMs = Date.parse(presence.lastSeenIso);
  if (!Number.isFinite(lastSeenMs)) return false;
  return Date.now() - lastSeenMs <= staleWindowMs;
}

export function clearAccountState(): void {
  saveRecord({ accounts: [], currentAccountId: null, presenceByAccountId: {} });
}

export function subscribeAccountState(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACCOUNT_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleUpdate = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACCOUNT_UPDATED_EVENT, handleUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACCOUNT_UPDATED_EVENT, handleUpdate);
  };
}

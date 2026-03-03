export type UserAccount = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAtIso: string;
};

type AccountRecord = {
  accounts: UserAccount[];
  currentAccountId: string | null;
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
let cachedRecord: AccountRecord = { accounts: [], currentAccountId: null };

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
    return { accounts: [], currentAccountId: null };
  }
  const raw = value as { accounts?: unknown; currentAccountId?: unknown };
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
  return { accounts, currentAccountId };
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
    cachedRecord = { accounts: [], currentAccountId: null };
    return cachedRecord;
  }

  try {
    cachedRecord = parseRecord(JSON.parse(stored));
    return cachedRecord;
  } catch {
    cachedRecord = { accounts: [], currentAccountId: null };
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

  const nextRecord: AccountRecord = {
    accounts: [...record.accounts, account],
    currentAccountId: account.id,
  };
  saveRecord(nextRecord);
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
  saveRecord({ ...record, currentAccountId: account.id });
  return { ok: true, account };
}

export function signOut(): void {
  const record = getRecordSnapshot();
  if (!record.currentAccountId) return;
  saveRecord({ ...record, currentAccountId: null });
}

export function clearAccountState(): void {
  saveRecord({ accounts: [], currentAccountId: null });
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

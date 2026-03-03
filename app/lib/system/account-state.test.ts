import { beforeEach, describe, expect, it } from "vitest";
import { clearAccountState, createAccount, getCurrentAccount, signIn, signOut } from "./account-state";

describe("account-state", () => {
  beforeEach(() => {
    clearAccountState();
  });

  it("creates account and opens session", () => {
    const result = createAccount("operator@ascend.local", "operator", "passcode01");
    expect(result.ok).toBe(true);
    expect(getCurrentAccount()?.email).toBe("operator@ascend.local");
  });

  it("rejects duplicate email", () => {
    createAccount("operator@ascend.local", "operator", "passcode01");
    const result = createAccount("operator@ascend.local", "operator2", "passcode02");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("EMAIL_EXISTS");
  });

  it("supports sign-in and sign-out", () => {
    createAccount("operator@ascend.local", "operator", "passcode01");
    signOut();
    expect(getCurrentAccount()).toBeNull();
    const login = signIn("operator@ascend.local", "passcode01");
    expect(login.ok).toBe(true);
    expect(getCurrentAccount()?.username).toBe("operator");
  });
});


import { beforeEach, describe, expect, it } from "vitest";
import { clearAccountState, createAccount, getAccounts } from "./account-state";
import { addFriendByUsername, clearFriendState, getFriendIdsForAccount } from "./friend-state";

describe("friend-state", () => {
  beforeEach(() => {
    clearAccountState();
    clearFriendState();
  });

  it("adds friend by username with mutual links", () => {
    const alpha = createAccount("alpha@ascend.local", "alpha", "passcode01").account;
    const bravo = createAccount("bravo@ascend.local", "bravo", "passcode01").account;
    expect(alpha).toBeTruthy();
    expect(bravo).toBeTruthy();

    const accounts = getAccounts();
    const result = addFriendByUsername(alpha?.id ?? "", "bravo", accounts);
    expect(result.ok).toBe(true);

    const alphaFriends = getFriendIdsForAccount(alpha?.id ?? "");
    const bravoFriends = getFriendIdsForAccount(bravo?.id ?? "");
    expect(alphaFriends.includes(bravo?.id ?? "")).toBe(true);
    expect(bravoFriends.includes(alpha?.id ?? "")).toBe(true);
  });

  it("rejects duplicate friend adds", () => {
    const alpha = createAccount("alpha@ascend.local", "alpha", "passcode01").account;
    createAccount("bravo@ascend.local", "bravo", "passcode01");
    const accounts = getAccounts();
    addFriendByUsername(alpha?.id ?? "", "bravo", accounts);
    const second = addFriendByUsername(alpha?.id ?? "", "bravo", accounts);
    expect(second.ok).toBe(false);
    expect(second.error).toBe("ALREADY_FRIEND");
  });
});


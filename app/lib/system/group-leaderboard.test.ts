import { beforeEach, describe, expect, it } from "vitest";
import {
  addManualLeaderboardMember,
  clearGroupLeaderboards,
  createLeaderboardGroup,
  getLeaderboardsForAccount,
  joinLeaderboardGroupByCode,
  syncSelfMemberXp,
} from "./group-leaderboard";

describe("group-leaderboard", () => {
  beforeEach(() => {
    clearGroupLeaderboards();
  });

  it("creates a squad with a unique six-digit join code", () => {
    const group = createLeaderboardGroup("acct_1", "operator", "Unit Alpha", 12000);
    expect(group).not.toBeNull();
    expect(group?.members).toHaveLength(1);
    expect(group?.members[0]?.username).toBe("operator");
    expect(group?.joinCode).toMatch(/^\d{6}$/);
  });

  it("adds manual members", () => {
    const group = createLeaderboardGroup("acct_1", "operator", "Unit Alpha", 12000);
    const next = addManualLeaderboardMember(group?.id ?? "", "teammate", 14300);
    expect(next).not.toBeNull();
    expect(next?.members).toHaveLength(2);
  });

  it("synchronizes self xp", () => {
    const group = createLeaderboardGroup("acct_1", "operator", "Unit Alpha", 12000);
    syncSelfMemberXp(group?.id ?? "", "acct_1", "operator", 13111);
    const groups = getLeaderboardsForAccount("acct_1");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.members[0]?.xp).toBe(13111);
  });

  it("allows joining by six-digit join code", () => {
    const group = createLeaderboardGroup("acct_1", "owner", "Unit Alpha", 12000);
    const joined = joinLeaderboardGroupByCode("acct_2", "friend", group?.joinCode ?? "", 10100);
    expect(joined).not.toBeNull();
    expect(joined?.members.some((member) => member.accountId === "acct_2")).toBe(true);

    const joinedAccountGroups = getLeaderboardsForAccount("acct_2");
    expect(joinedAccountGroups).toHaveLength(1);
    expect(joinedAccountGroups[0]?.id).toBe(group?.id);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { addManualLeaderboardMember, clearGroupLeaderboards, createLeaderboardGroup, getLeaderboardsForAccount, syncSelfMemberXp } from "./group-leaderboard";

describe("group-leaderboard", () => {
  beforeEach(() => {
    clearGroupLeaderboards();
  });

  it("creates a leaderboard group with owner member", () => {
    const group = createLeaderboardGroup("acct_1", "operator", "Unit Alpha", 12000);
    expect(group).not.toBeNull();
    expect(group?.members).toHaveLength(1);
    expect(group?.members[0]?.username).toBe("operator");
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
});


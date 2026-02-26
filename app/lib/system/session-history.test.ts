import { beforeEach, describe, expect, it } from "vitest";
import { appendSessionHistoryEntry, clearSessionHistory, loadSessionHistoryEntries } from "./session-history";
import { defaultSessionLogInput } from "./session-state";

describe("session-history", () => {
  beforeEach(() => {
    clearSessionHistory();
  });

  it("appends a session entry with computed fields", () => {
    const entry = appendSessionHistoryEntry(defaultSessionLogInput);

    expect(entry).not.toBeNull();
    const entries = loadSessionHistoryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.regionReadiness.CHEST).toBeTypeOf("number");
  });

  it("clears history entries", () => {
    appendSessionHistoryEntry(defaultSessionLogInput);
    clearSessionHistory();

    expect(loadSessionHistoryEntries()).toHaveLength(0);
  });
});

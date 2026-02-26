import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendSessionHistoryEntry, clearSessionHistory, loadSessionHistoryEntries } from "./session-history";
import { defaultSessionLogInput } from "./session-state";

describe("session-history", () => {
  beforeEach(() => {
    clearSessionHistory();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("generates deterministic sequential ids for same timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));

    const first = appendSessionHistoryEntry(defaultSessionLogInput);
    const second = appendSessionHistoryEntry(defaultSessionLogInput);

    expect(first?.id).toBe("2026-01-01T10:00:00.000Z-01");
    expect(second?.id).toBe("2026-01-01T10:00:00.000Z-02");
  });

  it("keeps only the latest 60 entries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));

    for (let index = 0; index < 65; index += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, index));
      appendSessionHistoryEntry(defaultSessionLogInput);
    }

    const entries = loadSessionHistoryEntries();
    expect(entries).toHaveLength(60);
    expect(entries[0]?.id.endsWith("-01")).toBe(true);
  });
});

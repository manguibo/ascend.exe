import { describe, expect, it } from "vitest";
import { buildSystemSnapshotFromLogInput } from "./mock-data";
import { defaultSessionLogInput } from "./session-state";
import { calculateDecayFloorXp } from "../xp/calculations";

describe("buildSystemSnapshotFromLogInput", () => {
  it("exposes pre-decay total and decay delta transparently", () => {
    const snapshot = buildSystemSnapshotFromLogInput(defaultSessionLogInput);

    expect(snapshot.xp.totalXpBeforeDecay).toBe(defaultSessionLogInput.totalXpBeforeSession + snapshot.xp.sessionXp);
    expect(snapshot.xp.decayDeltaXp).toBe(snapshot.xp.totalXpBeforeDecay - snapshot.xp.totalXp);
    expect(snapshot.xp.decayDeltaXp).toBeGreaterThanOrEqual(0);
  });

  it("derives current discipline from the latest mission day", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      recentDisciplineStates: ["OPTIMAL", "STABLE", "STABLE", "DECLINING", "DECLINING", "COMPROMISED", "COMPROMISED"],
    });

    expect(snapshot.discipline).toBe("COMPROMISED");
  });

  it("injects primary activity codename into directives", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      primaryActivityCodename: "RUN BLOCK B",
    });

    expect(snapshot.activity.codename).toBe("RUN BLOCK B");
    expect(snapshot.directives[0]).toContain("RUN BLOCK B");
  });

  it("derives grace days from expected cadence", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      expectedCadence: "WEEKLY",
    });

    expect(snapshot.xp.expectedCadence).toBe("WEEKLY");
    expect(snapshot.xp.graceDays).toBe(4);
  });

  it("exposes decay floor xp from level start input", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      levelStartXp: 15000,
    });

    expect(snapshot.xp.decayFloorXp).toBe(calculateDecayFloorXp(15000));
  });
});

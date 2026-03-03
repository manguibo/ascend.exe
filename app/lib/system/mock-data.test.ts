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

  it("uses hybrid composition when enabled", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      hybridMode: true,
      hybridSegments: [
        {
          activityId: "WEIGHTLIFTING",
          sharePct: 55,
          intensityMultiplier: 1.45,
          durationMultiplier: 1.15,
          outcomeMultiplier: 0.92,
          category: "STRENGTH",
        },
        {
          activityId: "RUNNING",
          sharePct: 45,
          intensityMultiplier: 1.2,
          durationMultiplier: 1.28,
          outcomeMultiplier: 0.9,
          category: "CONDITIONING",
        },
      ],
    });

    expect(snapshot.activity.protocol).toBe("HYBRID COMPOSITION");
    expect(snapshot.activity.codename).toContain("WEIGHTLIFTING");
    expect(snapshot.activity.codename).toContain("RUNNING");
  });
});

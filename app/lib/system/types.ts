export type DisciplineState = "OPTIMAL" | "STABLE" | "DECLINING" | "COMPROMISED";

export type XpFactor = {
  label: string;
  value: number;
};

export type ActivitySnapshot = {
  codename: string;
  protocol: string;
  nextDirective: string;
  complianceWindow: string;
};

export type XpSnapshot = {
  sessionXp: number;
  totalXpBeforeDecay: number;
  totalXp: number;
  decayDeltaXp: number;
  levelFloorXp: number;
  decayFloorXp: number;
  decayRatePct: number;
  inactiveDays: number;
  graceDays: number;
  expectedCadence: "DAILY" | "THREE_PER_WEEK" | "WEEKLY";
  factors: readonly XpFactor[];
};

export type SystemSnapshot = {
  mode: "SINGLE ACTIVITY";
  activity: ActivitySnapshot;
  discipline: DisciplineState;
  recentDisciplineStates: readonly DisciplineState[];
  directives: readonly string[];
  xp: XpSnapshot;
  statusLine: string;
};

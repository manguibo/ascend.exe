export type OnboardingGoalId =
  | "GENERAL_FITNESS"
  | "FAT_LOSS"
  | "MUSCLE_GAIN"
  | "ENDURANCE"
  | "STRENGTH"
  | "CONSISTENCY";

export type OnboardingProfile = {
  version: 1;
  createdAtIso: string;
  goal: OnboardingGoalId;
  unitSystem: "METRIC" | "IMPERIAL";
  knownActivityIds: string[];
  primaryActivityId: string;
};

export const ONBOARDING_PROFILE_STORAGE_KEY = "ascend.onboarding.profile.v1";
export const ONBOARDING_COMPLETE_STORAGE_KEY = "ascend.onboarding.complete.v1";

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 24);
}

function normalizeGoal(value: unknown): OnboardingGoalId {
  if (typeof value !== "string") return "GENERAL_FITNESS";
  const allowed: readonly OnboardingGoalId[] = ["GENERAL_FITNESS", "FAT_LOSS", "MUSCLE_GAIN", "ENDURANCE", "STRENGTH", "CONSISTENCY"];
  return allowed.includes(value as OnboardingGoalId) ? (value as OnboardingGoalId) : "GENERAL_FITNESS";
}

function normalizeUnitSystem(value: unknown): "METRIC" | "IMPERIAL" {
  return value === "IMPERIAL" ? "IMPERIAL" : "METRIC";
}

export function loadOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ONBOARDING_PROFILE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProfile>;
    return {
      version: 1,
      createdAtIso: typeof parsed.createdAtIso === "string" ? parsed.createdAtIso : new Date().toISOString(),
      goal: normalizeGoal(parsed.goal),
      unitSystem: normalizeUnitSystem(parsed.unitSystem),
      knownActivityIds: normalizeStringArray(parsed.knownActivityIds),
      primaryActivityId: typeof parsed.primaryActivityId === "string" ? parsed.primaryActivityId : "",
    };
  } catch {
    return null;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDING_COMPLETE_STORAGE_KEY) === "1";
}

export function markOnboardingComplete(value = true): void {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "1");
  } else {
    window.localStorage.removeItem(ONBOARDING_COMPLETE_STORAGE_KEY);
  }
}

export function clearOnboardingProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ONBOARDING_PROFILE_STORAGE_KEY);
}

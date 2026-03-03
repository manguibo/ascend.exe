export type AudioPreferences = {
  enabled: boolean;
  masterVolume: number;
  effectsVolume: number;
};

export const AUDIO_PREFERENCES_STORAGE_KEY = "ascend.audio.preferences.v1";
export const AUDIO_PREFERENCES_UPDATED_EVENT = "ascend:audio-preferences-updated";

export const defaultAudioPreferences: AudioPreferences = {
  enabled: true,
  masterVolume: 0.72,
  effectsVolume: 0.84,
};

let cachedSerialized: string | null | undefined;
let cachedPreferences: AudioPreferences = defaultAudioPreferences;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseAudioPreferences(value: unknown): AudioPreferences {
  if (typeof value !== "object" || value === null) {
    return defaultAudioPreferences;
  }

  const raw = value as Record<string, unknown>;
  return {
    enabled: raw.enabled !== false,
    masterVolume: clamp(parseNumber(raw.masterVolume, defaultAudioPreferences.masterVolume), 0, 1),
    effectsVolume: clamp(parseNumber(raw.effectsVolume, defaultAudioPreferences.effectsVolume), 0, 1),
  };
}

export function getAudioPreferencesSnapshot(): AudioPreferences {
  if (typeof window === "undefined") {
    return defaultAudioPreferences;
  }

  const stored = window.localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY);
  if (stored === cachedSerialized) {
    return cachedPreferences;
  }

  cachedSerialized = stored;
  if (!stored) {
    cachedPreferences = defaultAudioPreferences;
    return cachedPreferences;
  }

  try {
    cachedPreferences = parseAudioPreferences(JSON.parse(stored));
    return cachedPreferences;
  } catch {
    cachedPreferences = defaultAudioPreferences;
    return cachedPreferences;
  }
}

export function saveAudioPreferences(preferences: AudioPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = parseAudioPreferences(preferences);
  const serialized = JSON.stringify(normalized);
  cachedSerialized = serialized;
  cachedPreferences = normalized;
  window.localStorage.setItem(AUDIO_PREFERENCES_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(AUDIO_PREFERENCES_UPDATED_EVENT));
}

export function subscribeAudioPreferences(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUDIO_PREFERENCES_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUDIO_PREFERENCES_UPDATED_EVENT, handleUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUDIO_PREFERENCES_UPDATED_EVENT, handleUpdate);
  };
}

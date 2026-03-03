"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  defaultAudioPreferences,
  getAudioPreferencesSnapshot,
  saveAudioPreferences,
  subscribeAudioPreferences,
  type AudioPreferences,
} from "./audio-preferences";

export function useAudioPreferences() {
  const preferences = useSyncExternalStore(
    subscribeAudioPreferences,
    getAudioPreferencesSnapshot,
    () => defaultAudioPreferences,
  );

  const setPreferences = useCallback((nextPreferences: AudioPreferences) => {
    saveAudioPreferences(nextPreferences);
  }, []);

  const patchPreferences = useCallback(
    (patch: Partial<AudioPreferences>) => {
      saveAudioPreferences({ ...preferences, ...patch });
    },
    [preferences],
  );

  return { preferences, setPreferences, patchPreferences };
}

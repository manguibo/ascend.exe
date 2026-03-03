"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { systemAudioEngine, type SoundId } from "@/lib/system/audio-engine";
import { useAudioPreferences } from "@/lib/system/use-audio-preferences";

function shouldIgnoreTarget(target: HTMLElement): boolean {
  const input = target.closest("input");
  if (!input) {
    return false;
  }
  return input.type === "range" || input.type === "number";
}

function getSoundForTarget(target: HTMLElement): SoundId | null {
  const soundNode = target.closest<HTMLElement>("[data-sound]");
  if (soundNode) {
    const sound = soundNode.dataset.sound;
    if (sound === "tap" || sound === "toggle" || sound === "confirm" || sound === "navigate" || sound === "alert") {
      return sound;
    }
    return null;
  }

  if (target.closest("button,[role='button'],a[href]")) {
    return "tap";
  }
  return null;
}

export function SystemAudio() {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const { preferences } = useAudioPreferences();

  useEffect(() => {
    systemAudioEngine.setPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      void systemAudioEngine.play("navigate");
      previousPathnameRef.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (shouldIgnoreTarget(target)) {
        return;
      }
      const soundId = getSoundForTarget(target);
      if (soundId) {
        void systemAudioEngine.play(soundId);
      }
    };

    const handleChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest("select,input[type='checkbox'],input[type='radio']")) {
        void systemAudioEngine.play("toggle");
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("change", handleChange, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("change", handleChange, { capture: true });
    };
  }, []);

  return null;
}

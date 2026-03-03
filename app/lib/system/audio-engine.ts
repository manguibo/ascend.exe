import { defaultAudioPreferences, type AudioPreferences } from "./audio-preferences";

export type SoundId = "tap" | "toggle" | "confirm" | "navigate" | "alert";

class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private preferences: AudioPreferences = defaultAudioPreferences;

  setPreferences(preferences: AudioPreferences): void {
    this.preferences = preferences;
    if (!this.masterGain || !this.effectsGain) {
      return;
    }
    this.masterGain.gain.value = preferences.enabled ? preferences.masterVolume : 0;
    this.effectsGain.gain.value = preferences.effectsVolume;
  }

  async play(soundId: SoundId): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }
    if (!this.preferences.enabled) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.effectsGain) {
      return;
    }

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return;
      }
    }

    const now = context.currentTime;
    if (soundId === "tap") {
      this.playTone(980, 0.028, 0.12, now, "triangle");
      this.playTone(720, 0.038, 0.07, now + 0.01, "sine");
      return;
    }

    if (soundId === "toggle") {
      this.playTone(460, 0.032, 0.09, now, "triangle");
      this.playTone(660, 0.055, 0.09, now + 0.03, "triangle");
      return;
    }

    if (soundId === "confirm") {
      this.playTone(620, 0.045, 0.12, now, "triangle");
      this.playTone(820, 0.055, 0.1, now + 0.04, "sine");
      this.playTone(1020, 0.07, 0.08, now + 0.07, "sine");
      return;
    }

    if (soundId === "navigate") {
      this.playTone(420, 0.03, 0.05, now, "sawtooth");
      this.playTone(540, 0.035, 0.045, now + 0.02, "triangle");
      return;
    }

    this.playTone(220, 0.06, 0.11, now, "square");
    this.playTone(180, 0.08, 0.08, now + 0.045, "square");
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.masterGain && this.effectsGain) {
      return this.context;
    }
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
      return null;
    }

    this.context = new window.AudioContext();
    this.masterGain = this.context.createGain();
    this.effectsGain = this.context.createGain();

    this.masterGain.gain.value = this.preferences.enabled ? this.preferences.masterVolume : 0;
    this.effectsGain.gain.value = this.preferences.effectsVolume;

    this.effectsGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    return this.context;
  }

  private playTone(
    frequency: number,
    durationSec: number,
    volume: number,
    startTime: number,
    type: OscillatorType,
  ): void {
    if (!this.context || !this.effectsGain) {
      return;
    }
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    oscillator.connect(envelope);
    envelope.connect(this.effectsGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSec + 0.02);
  }
}

export const systemAudioEngine = new AudioEngine();

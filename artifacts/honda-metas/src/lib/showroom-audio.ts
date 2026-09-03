import { useSyncExternalStore } from 'react';

let audioContext: AudioContext | null = null;
const AUDIO_SETTINGS_STORAGE_KEY = 'honda-metas-audio-settings-v1';

export type AudioPreset = 'anthem' | 'sprint' | 'spark';
export type AudioSettings = {
  preset: AudioPreset;
  volume: number;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  preset: 'anthem',
  volume: 75,
};

export const AUDIO_PRESETS: Record<
  AudioPreset,
  { label: string; detail: string; icon: string }
> = {
  anthem: {
    label: 'Hino de vitória',
    detail: 'Ascendente e marcante',
    icon: 'A',
  },
  sprint: {
    label: 'Sprint',
    detail: 'Rápido e vibrante',
    icon: 'S',
  },
  spark: {
    label: 'Faísca',
    detail: 'Brilhante e leve',
    icon: 'F',
  },
};

let audioSettings = readAudioSettings();
const audioSettingsListeners = new Set<() => void>();

function isAudioPreset(value: unknown): value is AudioPreset {
  return value === 'anthem' || value === 'sprint' || value === 'spark';
}

function normalizeAudioSettings(value: Partial<AudioSettings>): AudioSettings {
  return {
    preset: isAudioPreset(value.preset)
      ? value.preset
      : DEFAULT_AUDIO_SETTINGS.preset,
    volume:
      typeof value.volume === 'number' && Number.isFinite(value.volume)
        ? Math.min(100, Math.max(0, Math.round(value.volume)))
        : DEFAULT_AUDIO_SETTINGS.volume,
  };
}

export function readAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_SETTINGS;
  try {
    const saved = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    return saved
      ? normalizeAudioSettings(JSON.parse(saved) as Partial<AudioSettings>)
      : DEFAULT_AUDIO_SETTINGS;
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function setAudioSettings(next: AudioSettings) {
  audioSettings = normalizeAudioSettings(next);
  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify(audioSettings),
    );
  } catch {
    // The in-memory setting still applies in restricted browser contexts.
  }
  audioSettingsListeners.forEach((listener) => listener());
}

function subscribeAudioSettings(listener: () => void) {
  audioSettingsListeners.add(listener);
  return () => audioSettingsListeners.delete(listener);
}

export function useAudioSettings() {
  return useSyncExternalStore(
    subscribeAudioSettings,
    () => audioSettings,
    () => DEFAULT_AUDIO_SETTINGS,
  );
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

export function unlockAudio() {
  const context = getAudioContext();
  if (context?.state === 'suspended') void context.resume();
}

export function playSaleChime(
  enabled: boolean,
  settings: AudioSettings = audioSettings,
) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume();
  const now = context.currentTime;
  const celebrationDuration = 10;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  const masterVolume = Math.max(0.01, settings.volume / 100) * 0.2;
  master.gain.exponentialRampToValueAtTime(masterVolume, now + 0.04);
  master.gain.setValueAtTime(masterVolume, now + celebrationDuration - 0.8);
  master.gain.exponentialRampToValueAtTime(0.0001, now + celebrationDuration);
  master.connect(context.destination);

  const melodies: Record<AudioPreset, number[]> = {
    anthem: [523.25, 659.25, 783.99, 659.25, 1046.5, 783.99, 659.25, 783.99],
    sprint: [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5, 1318.5],
    spark: [659.25, 783.99, 1046.5, 1318.5, 1046.5, 1567.98, 1318.5, 1046.5],
  };
  const melody = melodies[settings.preset];
  const noteType = settings.preset === 'sprint' ? 'square' : 'triangle';
  for (let step = 0; step < 16; step += 1) {
    const start = now + step * 0.62;
    const frequency = melody[step % melody.length];
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = step % 4 === 0 ? noteType : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.03, start + 0.36);
    noteGain.gain.setValueAtTime(0.0001, start);
    noteGain.gain.exponentialRampToValueAtTime(0.42, start + 0.035);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
    oscillator.connect(noteGain);
    noteGain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.45);
  }

  const shimmer = context.createOscillator();
  const shimmerGain = context.createGain();
  shimmer.type = 'sine';
  const shimmerStart = settings.preset === 'spark' ? 2093 : 1567.98;
  shimmer.frequency.setValueAtTime(shimmerStart, now);
  shimmer.frequency.exponentialRampToValueAtTime(
    shimmerStart * 1.33,
    now + celebrationDuration,
  );
  shimmerGain.gain.setValueAtTime(0.0001, now);
  shimmerGain.gain.exponentialRampToValueAtTime(0.045, now + 0.1);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + celebrationDuration);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(master);
  shimmer.start(now);
  shimmer.stop(now + celebrationDuration);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUDIO_SETTINGS_STORAGE_KEY) return;
    audioSettings = readAudioSettings();
    audioSettingsListeners.forEach((listener) => listener());
  });
}
// Player audio preferences: volumes, footsteps and vibration. Pure, so it can be tested without audio.

export interface SoundSettings {
  /** Music volume, 0 to 1. */
  music: number;
  /** Sound effects volume, 0 to 1. */
  sfx: number;
  footsteps: boolean;
  vibration: boolean;
  /** Silences everything without losing the chosen volumes. */
  muted: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { music: 0.5, sfx: 0.8, footsteps: true, vibration: true, muted: false };

/** Volumes snap to steps of 10%. */
export const VOLUME_STEPS = 10;

const volume = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(1, Math.max(0, v)) * VOLUME_STEPS) / VOLUME_STEPS : fallback;
const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Fills in missing or broken values (e.g. from an older saved version). */
export function normalizeSoundSettings(raw: unknown): SoundSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SoundSettings, unknown>>;
  const d = DEFAULT_SOUND_SETTINGS;
  return {
    music: volume(r.music, d.music),
    sfx: volume(r.sfx, d.sfx),
    footsteps: flag(r.footsteps, d.footsteps),
    vibration: flag(r.vibration, d.vibration),
    muted: flag(r.muted, d.muted),
  };
}

/** How loud a sound heard from `distance` px away should be: full up close, silent at `range`. */
export function distanceVolume(distance: number, range: number): number {
  if (distance >= range) return 0;
  const k = 1 - Math.max(0, distance) / range;
  return k * k;
}

/** Milliseconds between heartbeats: faster the closer a zombie is. */
export function heartbeatInterval(distance: number, range: number): number {
  const k = Math.min(1, Math.max(0, distance / range));
  return Math.round(380 + k * 720);
}

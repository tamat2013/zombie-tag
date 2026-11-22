// Rules for the game-rating prompt: asked once a month until the player rates, never again after.
export const RATING_FIRST_ASK_MS = 3 * 24 * 60 * 60 * 1000;
export const RATING_REPEAT_MS = 30 * 24 * 60 * 60 * 1000;
export const REVIEW_MAX = 500;

export interface RatingState {
  /** 1-5 once the player has rated, otherwise absent. */
  stars?: number;
  /** Optional written review. */
  review?: string;
  /** When the player first opened the game with rating support. */
  firstSeen?: number;
  /** When the prompt was last shown. */
  lastAsked?: number;
}

export function clampStars(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** True when the monthly prompt should pop up now. */
export function shouldAskForRating(s: RatingState, now: number): boolean {
  if (s.stars) return false;
  if (s.lastAsked !== undefined) return now - s.lastAsked >= RATING_REPEAT_MS;
  return s.firstSeen !== undefined && now - s.firstSeen >= RATING_FIRST_ASK_MS;
}

export function averageStars(all: number[]): number {
  return all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : 0;
}

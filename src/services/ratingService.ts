// Game rating: the choice is kept on this device and, when online, published to Firestore `ratings/{uid}`
// so the guide website can show the average. A player who rated is never prompted again.
import { doc, setDoc } from 'firebase/firestore';
import { REVIEW_MAX, clampStars } from '../logic/rating';
import type { RatingState } from '../logic/rating';
import { firestore, isFirebaseConfigured } from './firebase';
import { readJson, writeJson } from './storage';

const KEY = 'zt.rating';

export const ratingService = {
  load(): Promise<RatingState> {
    return readJson<RatingState>(KEY, {});
  },

  /** Remember that the game has been opened, so the first prompt waits a few days. */
  async touch(now = Date.now()): Promise<RatingState> {
    const s = await this.load();
    if (s.firstSeen === undefined) {
      s.firstSeen = now;
      await writeJson(KEY, s);
    }
    return s;
  },

  async markAsked(now = Date.now()): Promise<void> {
    const s = await this.load();
    await writeJson(KEY, { ...s, lastAsked: now });
  },

  /** Save a new or changed rating. Local save always succeeds; the online copy is best effort. */
  async save(uid: string, name: string, stars: number, review = ''): Promise<RatingState> {
    const s = await this.load();
    const next: RatingState = { ...s, stars: clampStars(stars), review: review.trim().slice(0, REVIEW_MAX) };
    await writeJson(KEY, next);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestore(), 'ratings', uid), {
          stars: next.stars,
          review: next.review ?? '',
          name: name.slice(0, 30),
          source: 'app',
          updatedAt: Date.now(),
        });
      } catch (e) {
        console.warn('Rating sync failed', e);
      }
    }
    return next;
  },
};

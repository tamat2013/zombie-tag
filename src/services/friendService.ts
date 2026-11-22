// Find players by username so they can be added as friends. Names come from the public
// leaderboard rows (Firestore `leaderboard/{uid}`), which every signed-in player can read.
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import type { Friend } from '../types';
import type { PlayerBoardEntry } from '../logic/leaderboard';
import { firestore, isFirebaseConfigured } from './firebase';

/** The same text in the spellings a player is likely to have typed their name with. */
export function nameVariants(name: string): string[] {
  const n = name.trim();
  const capital = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  return [...new Set([n, n.toLowerCase(), n.toUpperCase(), capital])];
}

export interface FriendMatch extends Friend {
  xp: number;
}

export const friendService = {
  /** Players whose username is `name` (ignoring capitals), not counting `selfUid`. */
  async find(name: string, selfUid: string): Promise<FriendMatch[]> {
    const n = name.trim();
    if (!n || !isFirebaseConfigured) return [];
    const snap = await getDocs(query(collection(firestore(), 'leaderboard'), where('name', 'in', nameVariants(n)), limit(10)));
    return snap.docs
      .map((d) => d.data() as PlayerBoardEntry)
      .filter((e) => e.uid !== selfUid && e.name.trim().toLowerCase() === n.toLowerCase())
      .sort((a, b) => b.xp - a.xp)
      .map((e) => ({ uid: e.uid, name: e.name, xp: e.xp }));
  },
};

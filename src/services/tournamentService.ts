// Tournament leaderboards: Firestore `tournaments/{id}/entries/{uid}` online,
// simulated rivals offline.
import { collection, doc, getDocs, increment, limit, orderBy, query, setDoc } from 'firebase/firestore';
import type { Profile } from '../types';
import { simulatedRivals } from '../logic/tournaments';
import type { LeaderboardEntry, Tournament } from '../logic/tournaments';
import { firestore, isFirebaseConfigured } from './firebase';

export const tournamentService = {
  async register(t: Tournament, p: Profile): Promise<void> {
    if (!isFirebaseConfigured) return;
    await setDoc(doc(firestore(), 'tournaments', t.id, 'entries', p.uid), { uid: p.uid, name: p.displayName, points: increment(0) }, { merge: true }); // never resets existing points
  },

  async addPoints(tournamentId: string, p: Profile, points: number): Promise<void> {
    if (!isFirebaseConfigured || points <= 0) return;
    try {
      await setDoc(
        doc(firestore(), 'tournaments', tournamentId, 'entries', p.uid),
        { uid: p.uid, name: p.displayName, points: increment(points) },
        { merge: true },
      );
    } catch (e) {
      console.warn('Tournament score sync failed', e);
    }
  },

  async leaderboard(t: Tournament, p: Profile, now: number): Promise<LeaderboardEntry[]> {
    const mine: LeaderboardEntry = { uid: p.uid, name: p.displayName, points: p.tournaments[t.id]?.points ?? 0 };
    if (!isFirebaseConfigured) {
      const list = simulatedRivals(t, now);
      if (p.tournaments[t.id]) list.push(mine);
      return list.sort((a, b) => b.points - a.points);
    }
    try {
      const snap = await getDocs(query(collection(firestore(), 'tournaments', t.id, 'entries'), orderBy('points', 'desc'), limit(50)));
      const list = snap.docs.map((d) => d.data() as LeaderboardEntry);
      if (p.tournaments[t.id] && !list.some((e) => e.uid === p.uid)) list.push(mine);
      return list.sort((a, b) => b.points - a.points);
    } catch (e) {
      console.warn('Leaderboard load failed', e);
      return p.tournaments[t.id] ? [mine] : [];
    }
  },
};

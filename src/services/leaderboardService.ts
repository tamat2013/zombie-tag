// Global leaderboard: Firestore `leaderboard/{uid}` online, simulated players offline.
// Each player writes only their own public row; everybody signed in can read the rows.
import { collection, doc, getCountFromServer, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import type { Profile } from '../types';
import { BOARD_SIZE, boardEntryOf, buildBoardView, rankIn, simulatedPlayers } from '../logic/leaderboard';
import type { BoardMetric, BoardView, PlayerBoardEntry } from '../logic/leaderboard';
import { firestore, isFirebaseConfigured } from './firebase';

// The last row sent for each player, so a profile save that changed nothing public sends nothing.
const lastSent = new Map<string, string>();

export const leaderboardService = {
  /** Publish the player's public stats. Never throws: a failed sync is retried on the next profile save. */
  async sync(p: Profile): Promise<void> {
    if (!isFirebaseConfigured) return;
    const entry = boardEntryOf(p);
    const signature = JSON.stringify(entry);
    if (lastSent.get(p.uid) === signature) return;
    try {
      await setDoc(doc(firestore(), 'leaderboard', p.uid), entry);
      lastSent.set(p.uid, signature);
    } catch (e) {
      console.warn('Leaderboard sync failed', e);
    }
  },

  async load(metric: BoardMetric, p: Profile): Promise<BoardView> {
    const own = boardEntryOf(p);
    if (!isFirebaseConfigured) {
      const all = [...simulatedPlayers(), own];
      return buildBoardView(all, metric, own, rankIn(all, metric, own.uid));
    }
    try {
      const rows = collection(firestore(), 'leaderboard');
      const snap = await getDocs(query(rows, orderBy(metric, 'desc'), limit(BOARD_SIZE)));
      // The local numbers are always at least as new as the stored row, so they replace it.
      const top = snap.docs.map((d) => d.data() as PlayerBoardEntry).filter((e) => e.uid !== own.uid);
      const all = [...top, own];
      let ownRank = rankIn(all, metric, own.uid);
      if (ownRank > BOARD_SIZE && own[metric] > 0) {
        // Below the cut: ask the server how many players are ahead.
        try {
          const ahead = await getCountFromServer(query(rows, where(metric, '>', own[metric])));
          ownRank = ahead.data().count + 1;
        } catch (e) {
          console.warn('Leaderboard rank lookup failed', e);
        }
      }
      return buildBoardView(all, metric, own, ownRank);
    } catch (e) {
      console.warn('Leaderboard load failed', e);
      return buildBoardView([own], metric, own, 1);
    }
  },
};

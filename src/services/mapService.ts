// Custom maps: saved to Firestore `maps/{id}` (shareable via a short code) or locally offline.
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import type { GameMap } from '../types';
import { firestore, isFirebaseConfigured } from './firebase';
import { readJson, writeJson } from './storage';

const LOCAL_KEY = 'maps:mine';

function makeShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const mapService = {
  async listMine(uid: string): Promise<GameMap[]> {
    const local = await readJson<GameMap[]>(LOCAL_KEY, []);
    const mine = local.filter((m) => m.authorId === uid);
    if (!isFirebaseConfigured) return mine;
    try {
      const snap = await getDocs(query(collection(firestore(), 'maps'), where('authorId', '==', uid), limit(50)));
      const remote = snap.docs.map((d) => d.data() as GameMap);
      const ids = new Set(remote.map((m) => m.id));
      return [...remote, ...mine.filter((m) => !ids.has(m.id))];
    } catch (e) {
      console.warn('listMine failed', e);
      return mine;
    }
  },

  async listCommunity(): Promise<GameMap[]> {
    if (!isFirebaseConfigured) return [];
    try {
      const snap = await getDocs(
        query(collection(firestore(), 'maps'), where('isPublic', '==', true), orderBy('createdAt', 'desc'), limit(40)),
      );
      return snap.docs.map((d) => d.data() as GameMap);
    } catch (e) {
      console.warn('listCommunity failed', e);
      return [];
    }
  },

  async findByCode(code: string): Promise<GameMap | null> {
    code = code.trim().toUpperCase();
    const local = await readJson<GameMap[]>(LOCAL_KEY, []);
    const hit = local.find((m) => m.shareCode === code);
    if (hit) return hit;
    if (!isFirebaseConfigured) return null;
    const snap = await getDocs(query(collection(firestore(), 'maps'), where('shareCode', '==', code), limit(1)));
    return snap.empty ? null : (snap.docs[0].data() as GameMap);
  },

  async save(map: GameMap): Promise<GameMap> {
    const saved: GameMap = { ...map, builtIn: false, shareCode: map.shareCode ?? makeShareCode(), createdAt: map.createdAt ?? Date.now() };
    const local = await readJson<GameMap[]>(LOCAL_KEY, []);
    await writeJson(LOCAL_KEY, [saved, ...local.filter((m) => m.id !== saved.id)]);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestore(), 'maps', saved.id), JSON.parse(JSON.stringify(saved)));
      } catch (e) {
        console.warn('Map upload failed (kept locally)', e);
      }
    }
    return saved;
  },

  async remove(map: GameMap): Promise<void> {
    const local = await readJson<GameMap[]>(LOCAL_KEY, []);
    await writeJson(LOCAL_KEY, local.filter((m) => m.id !== map.id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestore(), 'maps', map.id));
      } catch (e) {
        console.warn('Map delete failed', e);
      }
    }
  },
};

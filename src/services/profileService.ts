// Player profile persistence: Firestore `users/{uid}` online, AsyncStorage offline.
// A local copy is always kept so the app opens instantly and survives flaky connections.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Profile } from '../types';
import { createDefaultProfile, normalizeProfile } from '../logic/progression';
import { firestore, isFirebaseConfigured } from './firebase';
import { readJson, writeJson } from './storage';
import type { AppUser } from './authService';

const localKey = (uid: string) => `profile:${uid}`;

export const profileService = {
  async load(user: AppUser): Promise<Profile> {
    const now = Date.now();
    const cached = await readJson<Profile | null>(localKey(user.uid), null);
    if (isFirebaseConfigured) {
      try {
        const snap = await getDoc(doc(firestore(), 'users', user.uid));
        if (snap.exists()) {
          const remote = normalizeProfile({ ...(snap.data() as Profile), uid: user.uid }, now);
          await writeJson(localKey(user.uid), remote);
          return remote;
        }
      } catch (e) {
        console.warn('Profile load failed, using local copy', e);
        if (cached) return normalizeProfile(cached, now);
      }
    }
    if (cached) return normalizeProfile(cached, now);
    const fresh = createDefaultProfile(user.uid, user.displayName, user.email, now);
    await this.save(fresh);
    return fresh;
  },

  async save(p: Profile): Promise<void> {
    await writeJson(localKey(p.uid), p);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestore(), 'users', p.uid), JSON.parse(JSON.stringify(p)));
      } catch (e) {
        console.warn('Profile sync failed (kept locally)', e);
      }
    }
  },
};

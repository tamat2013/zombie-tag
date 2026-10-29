// Email + password authentication. Uses Firebase Auth when configured, otherwise local
// device accounts (handy for development and for playing against bots offline).
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from './firebase';
import { readJson, removeKey, writeJson } from './storage';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
}

type Listener = (u: AppUser | null) => void;

const LOCAL_ACCOUNTS = 'auth:accounts';
const LOCAL_SESSION = 'auth:session';
// One fixed guest per device, so the guest's progress survives restarts.
const LOCAL_GUEST_UID = 'local-guest';

interface LocalAccount extends AppUser {
  passwordHash: string;
}

// Local-only accounts never leave the device; this hash just avoids storing plain text.
function hash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).padStart(16, '0');
}

// Firebase reports the new user before updateProfile() stores the name, so remember it here.
let pendingName: string | null = null;

const localListeners = new Set<Listener>();
let localUser: AppUser | null = null;

function emitLocal(u: AppUser | null) {
  localUser = u;
  localListeners.forEach((l) => l(u));
}

const ERRORS: Record<string, string> = {
  'auth/invalid-email': 'Invalid email address',
  'auth/email-already-in-use': 'That email is already registered – try logging in',
  'auth/weak-password': 'Password is too weak (at least 6 characters)',
  'auth/invalid-credential': 'Wrong email or password',
  'auth/wrong-password': 'Wrong email or password',
  'auth/user-not-found': 'Wrong email or password',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes',
  'auth/network-request-failed': 'No network connection',
  'auth/operation-not-allowed': 'Guest login is not enabled in Firebase (Authentication > Sign-in method > Anonymous)',
};

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return ERRORS[code] ?? (e instanceof Error ? e.message : 'Unexpected error');
}

function validate(email: string, password: string) {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw Object.assign(new Error(), { code: 'auth/invalid-email' });
  if (password.length < 6) throw Object.assign(new Error(), { code: 'auth/weak-password' });
}

export const authService = {
  isOnline: isFirebaseConfigured,

  onChange(listener: Listener): () => void {
    if (isFirebaseConfigured) {
      // A Firebase user wins; otherwise a local guest (used when Firebase rejects guest sign-in).
      let fbUser: AppUser | null | undefined;
      let guest: AppUser | null = null;
      const emit = () => {
        if (fbUser !== undefined) listener(fbUser ?? guest);
      };
      const unsubscribe = onAuthStateChanged(firebaseAuth(), (u) => {
        fbUser = u ? { uid: u.uid, email: u.email ?? '', displayName: u.displayName ?? pendingName ?? (u.email ?? 'Player').split('@')[0] } : null;
        emit();
      });
      const onGuest: Listener = (g) => {
        guest = g;
        emit();
      };
      localListeners.add(onGuest);
      readJson<AppUser | null>(LOCAL_SESSION, null).then((u) => {
        if (u?.uid === LOCAL_GUEST_UID) onGuest(u);
      });
      return () => {
        unsubscribe();
        localListeners.delete(onGuest);
      };
    }
    localListeners.add(listener);
    readJson<AppUser | null>(LOCAL_SESSION, null).then((u) => emitLocal(u));
    return () => localListeners.delete(listener);
  },

  async signUp(email: string, password: string, displayName: string): Promise<AppUser> {
    email = email.trim().toLowerCase();
    validate(email, password);
    const name = displayName.trim() || email.split('@')[0];
    if (isFirebaseConfigured) {
      pendingName = name;
      const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
      await updateProfile(cred.user, { displayName: name });
      return { uid: cred.user.uid, email, displayName: name };
    }
    const accounts = await readJson<LocalAccount[]>(LOCAL_ACCOUNTS, []);
    if (accounts.some((a) => a.email === email)) throw Object.assign(new Error(), { code: 'auth/email-already-in-use' });
    const user: LocalAccount = { uid: `local-${Date.now().toString(36)}`, email, displayName: name, passwordHash: hash(password) };
    await writeJson(LOCAL_ACCOUNTS, [...accounts, user]);
    const session = { uid: user.uid, email, displayName: name };
    await writeJson(LOCAL_SESSION, session);
    emitLocal(session);
    return session;
  },

  async signIn(email: string, password: string): Promise<AppUser> {
    email = email.trim().toLowerCase();
    validate(email, password);
    if (isFirebaseConfigured) {
      const cred = await signInWithEmailAndPassword(firebaseAuth(), email, password);
      return { uid: cred.user.uid, email, displayName: cred.user.displayName ?? email.split('@')[0] };
    }
    const accounts = await readJson<LocalAccount[]>(LOCAL_ACCOUNTS, []);
    const acc = accounts.find((a) => a.email === email && a.passwordHash === hash(password));
    if (!acc) throw Object.assign(new Error(), { code: 'auth/invalid-credential' });
    const session = { uid: acc.uid, email: acc.email, displayName: acc.displayName };
    await writeJson(LOCAL_SESSION, session);
    emitLocal(session);
    return session;
  },

  /** Enter without an email or password: an anonymous Firebase user, or a local guest account offline. */
  async signInGuest(): Promise<AppUser> {
    const name = 'Guest';
    if (isFirebaseConfigured) {
      pendingName = name;
      try {
        const cred = await signInAnonymously(firebaseAuth());
        return { uid: cred.user.uid, email: '', displayName: name };
      } catch (e) {
        // Anonymous sign-in is off in the Firebase project or the network is down: fall back to a
        // device-only guest. Profile and bot matches work; online rooms need a real sign-in.
        console.warn('Anonymous sign-in failed, using a local guest', e);
      }
    }
    const accounts = await readJson<LocalAccount[]>(LOCAL_ACCOUNTS, []);
    const guest = accounts.find((a) => a.uid === LOCAL_GUEST_UID);
    const session = { uid: LOCAL_GUEST_UID, email: '', displayName: guest?.displayName ?? name };
    await writeJson(LOCAL_SESSION, session);
    emitLocal(session);
    return session;
  },

  async signOut(): Promise<void> {
    if (isFirebaseConfigured) await fbSignOut(firebaseAuth());
    await removeKey(LOCAL_SESSION);
    emitLocal(null);
  },

  current(): AppUser | null {
    if (isFirebaseConfigured) {
      const u = firebaseAuth().currentUser;
      return u ? { uid: u.uid, email: u.email ?? '', displayName: u.displayName ?? '' } : localUser;
    }
    return localUser;
  },
};

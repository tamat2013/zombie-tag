// App-wide state: the signed-in user, their profile (auto-saved), and toasts.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Profile } from '../types';
import { authService } from '../services/authService';
import type { AppUser } from '../services/authService';
import { profileService } from '../services/profileService';
import { ensureMissions } from '../logic/missions';

export interface ToastMessage {
  id: number;
  text: string;
  icon?: string;
  tone?: 'info' | 'good' | 'bad';
}

interface GameContextValue {
  /** undefined while the auth state is still loading. */
  user: AppUser | null | undefined;
  profile: Profile | null;
  updateProfile: (next: Profile | ((p: Profile) => Profile)) => void;
  signOut: () => Promise<void>;
  toasts: ToastMessage[];
  toast: (text: string, opts?: { icon?: string; tone?: ToastMessage['tone'] }) => void;
}

const Ctx = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Profile | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    return authService.onChange(async (u) => {
      if (!u) {
        setProfile(null);
        latest.current = null;
        setUser(null);
        return;
      }
      try {
        const p = ensureMissions(await profileService.load(u), Date.now());
        latest.current = p;
        setProfile(p);
      } catch (e) {
        console.warn('Profile load failed', e);
      }
      setUser(u);
    });
  }, []);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (latest.current) profileService.save(latest.current).catch((e) => console.warn('save failed', e));
  }, []);

  // Save right away when the app goes to the background or the page closes, so the last
  // change (a purchase, a reward, a new skin) is not lost inside the save delay.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flush();
    });
    const onHide = () => flush();
    const w = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : null;
    w?.addEventListener('pagehide', onHide);
    w?.addEventListener('beforeunload', onHide);
    return () => {
      sub.remove();
      w?.removeEventListener('pagehide', onHide);
      w?.removeEventListener('beforeunload', onHide);
    };
  }, [flush]);

  const updateProfile = useCallback(
    (next: Profile | ((p: Profile) => Profile)) => {
      setProfile((cur) => {
        if (!cur) return cur;
        const value = ensureMissions(typeof next === 'function' ? next(cur) : next, Date.now());
        latest.current = value;
        return value;
      });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 700);
    },
    [flush],
  );

  const signOut = useCallback(async () => {
    flush();
    await authService.signOut();
  }, [flush]);

  const toast = useCallback((text: string, opts?: { icon?: string; tone?: ToastMessage['tone'] }) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const value = useMemo(
    () => ({ user, profile, updateProfile, signOut, toasts, toast }),
    [user, profile, updateProfile, signOut, toasts, toast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used inside GameProvider');
  return v;
}

/** For screens that are only reachable while signed in. */
export function useProfile(): Profile {
  const { profile } = useGame();
  if (!profile) throw new Error('No profile loaded');
  return profile;
}

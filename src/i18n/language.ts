// The language the player picked: module-level state, saved on the device, with a hook for screens.
import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../services/storage';
import { DEFAULT_LANG, isLangCode } from './languages';
import type { LangCode } from './languages';
import { translate } from './translate';

const KEY = 'zt.language';

let current: LangCode = DEFAULT_LANG;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getLanguage(): LangCode {
  return current;
}

export function setLanguage(code: LangCode) {
  if (code === current) return;
  current = code;
  emit();
  writeJson(KEY, code).catch(() => {});
}

export async function initLanguage() {
  const saved = await readJson<string | null>(KEY, null);
  if (isLangCode(saved) && saved !== current) {
    current = saved;
    emit();
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useLanguage(): LangCode {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

// For strings that are not rendered through <Text> (placeholders, accessibility labels, share messages).
export function tr(text: string): string {
  return translate(text, current);
}

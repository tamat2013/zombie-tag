// Looks an English UI string up in the translation table. Anything not in the table stays English.
import { DEFAULT_LANG, LANGUAGES } from './languages.ts';
import type { LangCode } from './languages.ts';
import { ROWS } from './strings.ts';

const EXACT = new Map<string, readonly string[]>();
const PATTERNS: { re: RegExp; row: readonly string[] }[] = [];

for (const row of ROWS) {
  const key = row[0];
  if (/\{\d\}/.test(key)) {
    const source = key
      .split(/\{\d\}/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('(.+?)');
    PATTERNS.push({ re: new RegExp(`^${source}$`, 's'), row });
  } else {
    EXACT.set(key, row);
  }
}

// Emoji, symbols and spaces around a string are kept as they are.
const DECOR = /^([\s…←-⯿\u{1F000}-\u{1FFFF}️‍]*)(.*?)([\s…←-⯿\u{1F000}-\u{1FFFF}️‍]*)$/su;

export function langIndex(lang: LangCode): number {
  return LANGUAGES.findIndex((l) => l.code === lang);
}

export function translate(text: string, lang: LangCode): string {
  if (lang === DEFAULT_LANG || !text) return text;
  const i = langIndex(lang);
  if (i < 0) return text;
  const exact = EXACT.get(text);
  if (exact) return exact[i] || text;

  const m = DECOR.exec(text);
  const core = m ? m[2] : text;
  if (m && core && core !== text) {
    const row = EXACT.get(core);
    if (row) return m[1] + (row[i] || core) + m[3];
  }
  for (const p of PATTERNS) {
    const mm = p.re.exec(core);
    if (!mm) continue;
    const template = p.row[i];
    if (!template) return text;
    const out = template.replace(/\{(\d)\}/g, (_, n) => translate(mm[Number(n)] ?? '', lang));
    return m ? m[1] + out + m[3] : out;
  }
  return text;
}

// JSX children: a lone string, or an array that mixes strings and numbers (e.g. `Level {n}`).
export function translateChildren(children: unknown, lang: LangCode): unknown {
  if (lang === DEFAULT_LANG) return children;
  if (typeof children === 'string') return translate(children, lang);
  if (Array.isArray(children)) {
    if (children.every((c) => typeof c === 'string' || typeof c === 'number')) {
      const joined = children.join('');
      const whole = translate(joined, lang);
      if (whole !== joined) return whole;
    }
    return children.map((c) => (typeof c === 'string' ? translate(c, lang) : c));
  }
  return children;
}

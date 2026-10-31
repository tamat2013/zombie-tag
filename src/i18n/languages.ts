// Languages the game can be played in. The order here is also the column order of the table in strings.ts.
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'he', name: 'עברית' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'it', name: 'Italiano' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'pl', name: 'Polski' },
  { code: 'nl', name: 'Nederlands' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANG: LangCode = 'en';

export function isLangCode(x: unknown): x is LangCode {
  return LANGUAGES.some((l) => l.code === x);
}

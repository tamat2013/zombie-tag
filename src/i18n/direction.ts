// Right-to-left support: Hebrew and Arabic mirror the layout (rows, alignment, left/right spacing).
import type { LangCode } from './languages.ts';

export function isRtl(lang: LangCode): boolean {
  return lang === 'he' || lang === 'ar';
}

const SWAP: Record<string, string> = {
  marginLeft: 'marginRight', marginRight: 'marginLeft',
  paddingLeft: 'paddingRight', paddingRight: 'paddingLeft',
  left: 'right', right: 'left',
  borderLeftWidth: 'borderRightWidth', borderRightWidth: 'borderLeftWidth',
  borderLeftColor: 'borderRightColor', borderRightColor: 'borderLeftColor',
  borderTopLeftRadius: 'borderTopRightRadius', borderTopRightRadius: 'borderTopLeftRadius',
  borderBottomLeftRadius: 'borderBottomRightRadius', borderBottomRightRadius: 'borderBottomLeftRadius',
};

// `flat` is an already-flattened style object. `text` also right-aligns text that has no explicit alignment.
export function mirrorStyle(flat: Record<string, unknown> | undefined, text = false): Record<string, unknown> | undefined {
  if (!flat) return text ? { textAlign: 'right' } : flat;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) out[SWAP[k] ?? k] = v;
  if (out.flexDirection === 'row') out.flexDirection = 'row-reverse';
  else if (flat.flexDirection === 'row-reverse') out.flexDirection = 'row';
  if (out.textAlign === 'left') out.textAlign = 'right';
  else if (flat.textAlign === 'right') out.textAlign = 'left';
  else if (text && out.textAlign === undefined) out.textAlign = 'right';
  return out;
}

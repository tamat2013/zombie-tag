// Shared colors and spacing for the UI ("Arcade Pop" look: night-purple ground, neon lime and pink, chunky rounded buttons).
export const colors = {
  bg: '#1a0f3d',
  bgAlt: '#120a2b',
  panel: '#2a1a5e',
  panelLight: '#3a2480',
  border: '#4b3399',
  ink: '#0d0a1f',
  text: '#ffffff',
  textDim: '#cbb8ff',
  textMuted: '#9d8bd6',
  toxic: '#c6ff3d',
  toxicDark: '#7bd11a',
  blood: '#ff4fa3',
  bloodDark: '#b02a73',
  gold: '#ffd23f',
  silver: '#cfc9bb',
  bronze: '#d08c60',
  blue: '#3fa9ff',
  purple: '#b07cff',
  survivor: '#3fa9ff',
  zombie: '#7bd11a',
  coin: '#ffd23f',
  medal: '#ff8a2b',
  overlay: 'rgba(13,10,31,0.8)',
};

export const tileColors: Record<number, string> = {
  0: '#24261d', // floor
  1: '#4a4536', // wall
  2: '#85602f', // crate
  3: '#2a6f97', // task
  4: '#1f4e79', // survivor spawn
  5: '#5a2420', // zombie spawn
  6: '#c0392b', // hazard
  7: '#ffc629', // finish
  8: '#4f3d22', // mud
  9: '#2f6b45', // checkpoint
  10: '#24261d', // saw rail (floor underneath)
};

export const radius = { sm: 14, md: 20, lg: 26 };

// Hard offset "sticker" shadow. Works on iOS and web; Android uses elevation.
export const shadow = {
  shadowColor: colors.ink,
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

// Ink outline used by cards, buttons and chips.
export const outline = { borderWidth: 2, borderColor: colors.ink };

export const fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  bold: 'Rubik_700Bold',
  extraBold: 'Rubik_800ExtraBold',
  black: 'Rubik_900Black',
  logo: 'RubikWetPaint_400Regular',
};

/** Picks the Rubik file that matches a fontWeight. */
export function fontForWeight(weight: string | number | undefined): string {
  const w = typeof weight === 'number' ? weight : weight === 'bold' ? 700 : Number(weight) || 400;
  if (w >= 900) return fonts.black;
  if (w >= 800) return fonts.extraBold;
  if (w >= 600) return fonts.bold;
  if (w >= 500) return fonts.medium;
  return fonts.regular;
}

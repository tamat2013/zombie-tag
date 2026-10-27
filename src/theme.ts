// Shared colors and spacing for the UI.
export const colors = {
  bg: '#0b0f0a',
  bgAlt: '#121a10',
  panel: '#18221a',
  panelLight: '#223024',
  border: '#2e4031',
  text: '#eef5e9',
  textDim: '#9fb39a',
  textMuted: '#6b7f67',
  toxic: '#7cff4f',
  toxicDark: '#3f9b1f',
  blood: '#e5383b',
  bloodDark: '#8b1e20',
  gold: '#ffd166',
  silver: '#cbd5e1',
  bronze: '#d08c60',
  blue: '#4f8ef7',
  purple: '#a855f7',
  survivor: '#4fc3f7',
  zombie: '#7cff4f',
  coin: '#ffcf3f',
  medal: '#ff9f1c',
  overlay: 'rgba(0,0,0,0.72)',
};

export const tileColors: Record<number, string> = {
  0: '#1d261c', // floor
  1: '#3b4a3a', // wall
  2: '#7a5a32', // crate
  3: '#2a6f97', // task
  4: '#1f4e79', // survivor spawn
  5: '#4d1f1f', // zombie spawn
  6: '#b3261e', // hazard
  7: '#e9c46a', // finish
  8: '#4a3b22', // mud
  9: '#2d6a4f', // checkpoint
  10: '#1d261c', // saw rail (floor underneath)
};

export const radius = { sm: 8, md: 14, lg: 22 };

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};

// Generates the app icon (icon.svg and icon.png): half zombie (left), half survivor (right), in the game's character style.
// Run with `node design/icon/build.js`. PNG rendering needs Chrome or Edge.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const out = __dirname;

// Game palette (src/theme.ts) and the zombie look from src/components/Character.tsx.
const C = {
  zLight: '#b4dd62',
  z: '#6b8f3a',
  zDark: '#3d5a1c',
  outline: '#16240c',
  eye: '#d4ff3a',
};

const defs = `
  <defs>
    <radialGradient id="zskin" cx="62%" cy="30%" r="80%">
      <stop offset="0" stop-color="${C.zLight}"/><stop offset="0.55" stop-color="${C.z}"/><stop offset="1" stop-color="${C.zDark}"/>
    </radialGradient>
    <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${C.eye}" stop-opacity="0.9"/><stop offset="1" stop-color="${C.eye}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="face"><circle r="300"/></clipPath>
  </defs>`;

// Zigzag tear down the middle of the face.
const tear = 'M8 -320 L-22 -230 L24 -150 L-18 -70 L22 10 L-20 90 L20 170 L-16 250 L10 320';

// The icon, drawn around (0,0) with a body radius of 300.
const S = { body: '#4f8ef7', light: '#8fb8ff', dark: '#2f62c4', accent: '#1f3f7a' };
const gameEye = (cx, zombie) => `
  ${zombie ? `<circle cx="${cx}" cy="-60" r="105" fill="url(#eyeGlow)"/>` : ''}
  <circle cx="${cx}" cy="-60" r="62" fill="${zombie ? C.eye : '#fff'}" stroke="${zombie ? C.outline : S.accent}" stroke-width="10"/>
  <circle cx="${cx + (zombie ? 6 : -6)}" cy="-56" r="28" fill="${zombie ? '#ff2a2a' : '#111'}"/>
  <circle cx="${cx + (zombie ? -4 : -16)}" cy="-68" r="9" fill="#fff" opacity="0.9"/>`;
// Mouth curve: the survivor's smile runs from the middle (0,110) up to (140,80).
const MOUTH = 'M-140 80 Q0 140 140 80';
const icon = `
  <defs>
    <radialGradient id="sskin" cx="70%" cy="28%" r="80%">
      <stop offset="0" stop-color="${S.light}"/><stop offset="0.55" stop-color="${S.body}"/><stop offset="1" stop-color="${S.dark}"/>
    </radialGradient>
    <clipPath id="leftHalf"><path d="${tear} L-330 320 L-330 -320 Z"/></clipPath>
    <clipPath id="rightHalf"><path d="${tear} L330 320 L330 -320 Z"/></clipPath>
    <radialGradient id="auraBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0.45" stop-color="#4fa8ff" stop-opacity="0.42"/><stop offset="1" stop-color="#4fa8ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle r="470" fill="url(#auraBlue)"/>
  <g clip-path="url(#face)">
    <rect x="-320" y="-320" width="640" height="640" fill="url(#zskin)"/>
    <path d="${tear} L330 320 L330 -320 Z" fill="url(#sskin)"/>
    <ellipse cx="-190" cy="-170" rx="70" ry="45" fill="${C.zDark}" opacity="0.45" transform="rotate(30 -190 -170)"/>
    <ellipse cx="-180" cy="200" rx="50" ry="32" fill="${C.zDark}" opacity="0.4"/>
    <!-- mouth: straight and stitched on the zombie half, a smile on the survivor half -->
    <g clip-path="url(#leftHalf)" stroke="#3a1010" stroke-linecap="round">
      <path d="M-140 110 L40 110" stroke-width="32"/>
      <g stroke-width="17"><path d="M-110 72 L-110 148"/><path d="M-70 72 L-70 148"/><path d="M-30 72 L-30 148"/></g>
    </g>
    <path d="${MOUTH}" stroke="${S.accent}" stroke-width="20" fill="none" stroke-linecap="round" clip-path="url(#rightHalf)"/>
  </g>
  <!-- outline: dark green on the zombie side, dark blue on the survivor side -->
  <circle r="300" fill="none" stroke="${C.outline}" stroke-width="26" clip-path="url(#leftHalf)"/>
  <circle r="300" fill="none" stroke="${S.accent}" stroke-width="26" clip-path="url(#rightHalf)"/>
  <!-- tear with stitches -->
  <path d="${tear}" stroke="${C.outline}" stroke-width="12" fill="none" stroke-linejoin="round"/>
  <g stroke="${C.outline}" stroke-width="9" stroke-linecap="round">
    <path d="M-30 -195 L30 -185"/><path d="M-26 -110 L28 -100"/><path d="M-26 -30 L28 -20"/><path d="M-26 50 L28 60"/><path d="M-24 130 L26 140"/><path d="M-22 210 L22 220"/>
  </g>
  ${gameEye(-130, true)}
  ${gameEye(130, false)}`;

const svgFile = path.join(out, 'icon.svg');
fs.writeFileSync(
  svgFile,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}<g transform="translate(512 512) scale(0.95)">${icon}</g></svg>\n`,
);

const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((b) => fs.existsSync(b));
if (!browser) {
  console.log('icon.svg נוצר. לא נמצא Chrome/Edge לרינדור PNG.');
  process.exit(0);
}

const assets = path.join(out, '..', '..', 'assets');
fs.mkdirSync(assets, { recursive: true });

// Renders an SVG file to a PNG of the given size (an HTML wrapper scales the 1024 drawing).
function render(svgPath, target, size, transparent) {
  const html = `${target}.html`;
  fs.writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="file:///${svgPath.replace(/\\/g, '/')}">`,
  );
  spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      `--window-size=${size},${size}`,
      `--screenshot=${target}`,
      ...(transparent ? ['--default-background-color=00000000'] : []),
      `file:///${html.replace(/\\/g, '/')}`,
    ],
    { stdio: 'ignore' },
  );
  fs.rmSync(html, { force: true });
  if (!fs.existsSync(target)) console.error(`רינדור נכשל: ${target}`);
}

// Opaque version for iOS, the Play Store and the favicon (they do not allow transparency).
const bgFile = path.join(out, '_icon-opaque.svg');
fs.writeFileSync(
  bgFile,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}
  <defs><radialGradient id="bg" cx="50%" cy="52%" r="72%">
    <stop offset="0" stop-color="#27452a"/><stop offset="0.55" stop-color="#112012"/><stop offset="1" stop-color="#0a0e09"/>
  </radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(512 512) scale(1.05)">${icon}</g></svg>\n`,
);

render(svgFile, path.join(out, 'icon.png'), 1024, true); // source, transparent
render(bgFile, path.join(assets, 'icon.png'), 1024, false); // app icon
render(svgFile, path.join(assets, 'adaptive-icon.png'), 1024, true); // Android foreground layer
render(svgFile, path.join(assets, 'splash-icon.png'), 1024, true);
render(bgFile, path.join(assets, 'favicon.png'), 48, false);
fs.rmSync(bgFile, { force: true });
console.log('נוצר: design/icon/icon.svg, design/icon/icon.png ו-assets/*.png');

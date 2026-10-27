// Generates the app icon (icon.svg and icon.png): the zombie from the game on a transparent background.
// Run with `node design/icon/build.js`. PNG rendering needs Chrome or Edge.
// Nothing here is referenced by app.json until the icon is applied.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const out = __dirname;

// Game palette (src/theme.ts) and the zombie look from src/components/Character.tsx.
const C = {
  toxic: '#7cff4f',
  skinLight: '#b4dd62',
  skin: '#6b8f3a',
  skinDark: '#3d5a1c',
  outline: '#16240c',
  eye: '#d4ff3a',
  pupil: '#e5383b',
  mouth: '#2a0c0c',
  teeth: '#ecf3c4',
};

const defs = `
  <defs>
    <radialGradient id="skin" cx="38%" cy="30%" r="80%">
      <stop offset="0" stop-color="${C.skinLight}"/>
      <stop offset="0.55" stop-color="${C.skin}"/>
      <stop offset="1" stop-color="${C.skinDark}"/>
    </radialGradient>
    <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${C.eye}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${C.eye}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aura" cx="50%" cy="50%" r="50%">
      <stop offset="0.45" stop-color="${C.toxic}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${C.toxic}" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

// The zombie, drawn around (0,0) with a body radius of 300.
const zombie = `
  <circle r="470" fill="url(#aura)"/>
  <circle r="300" fill="url(#skin)" stroke="${C.outline}" stroke-width="24"/>
  <!-- decay blotches -->
  <ellipse cx="170" cy="-175" rx="85" ry="55" fill="${C.skinDark}" opacity="0.45" transform="rotate(-30 170 -175)"/>
  <ellipse cx="-185" cy="150" rx="60" ry="40" fill="${C.skinDark}" opacity="0.4" transform="rotate(25 -185 150)"/>
  <!-- stitched scar across the forehead -->
  <path d="M-205 -165 L-70 -250" stroke="${C.outline}" stroke-width="13" stroke-linecap="round"/>
  <g stroke="${C.outline}" stroke-width="11" stroke-linecap="round">
    <path d="M-190 -205 L-165 -158"/><path d="M-150 -228 L-125 -181"/><path d="M-110 -250 L-85 -203"/>
  </g>
  <!-- eyes: glowing, mismatched -->
  <circle cx="-105" cy="-40" r="130" fill="url(#eyeGlow)"/>
  <circle cx="112" cy="-55" r="105" fill="url(#eyeGlow)"/>
  <circle cx="-105" cy="-40" r="84" fill="${C.eye}" stroke="${C.outline}" stroke-width="14"/>
  <circle cx="112" cy="-55" r="62" fill="${C.eye}" stroke="${C.outline}" stroke-width="14"/>
  <circle cx="-92" cy="-34" r="37" fill="${C.pupil}"/>
  <circle cx="105" cy="-48" r="27" fill="${C.pupil}"/>
  <circle cx="-92" cy="-34" r="16" fill="#3a0a0a"/>
  <circle cx="105" cy="-48" r="12" fill="#3a0a0a"/>
  <circle cx="-103" cy="-47" r="9" fill="#fff" opacity="0.9"/>
  <circle cx="98" cy="-58" r="7" fill="#fff" opacity="0.9"/>
  <!-- angry brows -->
  <path d="M-195 -118 L-30 -78" stroke="${C.outline}" stroke-width="26" stroke-linecap="round"/>
  <path d="M60 -92 L185 -140" stroke="${C.outline}" stroke-width="24" stroke-linecap="round"/>
  <!-- mouth with teeth -->
  <path d="M-150 88 Q0 108 150 88 Q146 196 0 204 Q-146 196 -150 88 Z" fill="${C.mouth}" stroke="${C.outline}" stroke-width="14" stroke-linejoin="round"/>
  <g fill="${C.teeth}">
    <path d="M-128 96 L-92 96 L-110 144 Z"/>
    <path d="M-62 101 L-22 101 L-42 156 Z"/>
    <path d="M22 101 L62 101 L42 156 Z"/>
    <path d="M92 96 L128 96 L110 144 Z"/>
    <path d="M-40 200 L-4 200 L-22 164 Z"/>
    <path d="M10 200 L46 200 L28 164 Z"/>
  </g>`;

const svgFile = path.join(out, 'icon.svg');
fs.writeFileSync(
  svgFile,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}<g transform="translate(512 512) scale(0.95)">${zombie}</g></svg>\n`,
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
  <g transform="translate(512 512) scale(1.05)">${zombie}</g></svg>\n`,
);

render(svgFile, path.join(out, 'icon.png'), 1024, true); // source, transparent
render(bgFile, path.join(assets, 'icon.png'), 1024, false); // app icon
render(svgFile, path.join(assets, 'adaptive-icon.png'), 1024, true); // Android foreground layer
render(svgFile, path.join(assets, 'splash-icon.png'), 1024, true);
render(bgFile, path.join(assets, 'favicon.png'), 48, false);
fs.rmSync(bgFile, { force: true });
console.log('נוצר: design/icon/icon.svg, design/icon/icon.png ו-assets/*.png');

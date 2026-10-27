// One-time setup: installs dependencies when they are missing or out of date.
// Run with `node scripts/setup.js` (or `npm run setup`). F5 in VS Code runs it automatically.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const modules = path.join(root, 'node_modules');
const lock = path.join(root, 'package-lock.json');
const marker = path.join(modules, '.package-lock.json');

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error(`נדרש Node.js 20 ומעלה (מותקן ${process.versions.node}). הורד מ-https://nodejs.org`);
  process.exit(1);
}

const upToDate =
  fs.existsSync(marker) && fs.statSync(marker).mtimeMs >= fs.statSync(lock).mtimeMs;

if (upToDate) {
  console.log('התלויות כבר מותקנות.');
  process.exit(0);
}

console.log('מתקין תלויות (npm install)...');
const result = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);

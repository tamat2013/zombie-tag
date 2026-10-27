// One-time setup (Windows): installs dependencies, a JDK, the Android SDK command-line tools,
// the SDK components and the "ZombieTag" emulator. Safe to re-run: finished steps are skipped.
// Run with `node scripts/setup.js` (or `npm run setup`). F5 in VS Code runs it automatically.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { AVD_NAME, API, IMAGE, androidEnv, defaultSdk } = require('./android');

const root = path.join(__dirname, '..');
const modules = path.join(root, 'node_modules');
const lock = path.join(root, 'package-lock.json');
const marker = path.join(modules, '.package-lock.json');
const CMDLINE_TOOLS_URL = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip';

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error(`נדרש Node.js 20 ומעלה (מותקן ${process.versions.node}). הורד מ-https://nodejs.org`);
  process.exit(1);
}

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: root, env: androidEnv().env, shell: true, encoding: 'utf8', ...opts });

function fail(message) {
  console.error(message);
  process.exit(1);
}

function installDependencies() {
  const upToDate =
    fs.existsSync(marker) && fs.statSync(marker).mtimeMs >= fs.statSync(lock).mtimeMs;
  if (upToDate) return console.log('התלויות כבר מותקנות.');
  console.log('מתקין תלויות (npm install)...');
  const result = run('npm', ['install', '--no-audit', '--no-fund'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function installJava() {
  if (run('java', ['-version'], { stdio: 'ignore' }).status === 0) return console.log('Java כבר מותקן.');
  console.log('מתקין JDK 17 עם winget...');
  const result = run(
    'winget',
    ['install', '-e', '--id', 'Microsoft.OpenJDK.17', '--accept-source-agreements', '--accept-package-agreements'],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) fail('התקנת JDK נכשלה. התקן ידנית מ-https://learn.microsoft.com/java/openjdk/download ואז הרץ שוב.');
}

async function installCmdlineTools() {
  const sdk = androidEnv().sdk ?? defaultSdk();
  const manager = path.join(sdk, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat');
  if (fs.existsSync(manager)) return console.log('Android SDK Command-line Tools כבר מותקנים.');

  console.log('מוריד Android SDK Command-line Tools...');
  fs.mkdirSync(sdk, { recursive: true });
  const zip = path.join(sdk, 'cmdline-tools.zip');
  const res = await fetch(CMDLINE_TOOLS_URL);
  if (!res.ok) fail(`ההורדה נכשלה (${res.status}).`);
  fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));

  const tmp = path.join(sdk, 'cmdline-tools-tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  // Full path: PATH may not contain PowerShell. No shell, so the paths need no quoting.
  const powershell = path.join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  );
  const unzip = spawnSync(
    powershell,
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tmp}' -Force`],
    { stdio: 'inherit' },
  );
  if (unzip.status !== 0) fail('פריסת הארכיב נכשלה.');
  const target = path.join(sdk, 'cmdline-tools', 'latest');
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(path.join(tmp, 'cmdline-tools'), target);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(zip, { force: true });
}

function installEmulator() {
  const emulatorBin = run('emulator', ['-list-avds']);
  if (emulatorBin.status === 0 && emulatorBin.stdout.split(/\r?\n/).includes(AVD_NAME)) {
    return console.log(`האמולטור ${AVD_NAME} כבר קיים.`);
  }
  console.log('מקבל רישיונות ומתקין רכיבי Android (פעם אחת, כמה GB)...');
  run('sdkmanager', ['--licenses'], { input: 'y\n'.repeat(30), stdio: ['pipe', 'ignore', 'inherit'] });
  const install = run(
    'sdkmanager',
    ['platform-tools', 'emulator', `platforms;android-${API}`, 'platforms;android-36', 'build-tools;36.0.0', `"${IMAGE}"`],
    { stdio: 'inherit' },
  );
  if (install.status !== 0) fail('התקנת רכיבי ה-SDK נכשלה.');
  console.log(`יוצר אמולטור ${AVD_NAME}...`);
  const create = run(
    'avdmanager',
    ['create', 'avd', '-n', AVD_NAME, '-k', `"${IMAGE}"`, '-d', 'pixel_6', '--force'],
    { input: 'no\n', stdio: ['pipe', 'inherit', 'inherit'] },
  );
  if (create.status !== 0) fail('יצירת האמולטור נכשלה.');
}

(async () => {
  installDependencies();
  installJava();
  await installCmdlineTools();
  installEmulator();
  console.log('הכל מותקן.');
})();

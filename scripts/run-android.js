// Starts the Android emulator (if none is running), builds the game as a native app and runs it.
// Run with `node scripts/run-android.js` (add `--offline` for no Firebase, bots only,
// and `--release` for a standalone build that does not need the dev server).
const { spawn, spawnSync } = require('node:child_process');
const { AVD_NAME, androidEnv } = require('./android');

const { env, sdk } = androidEnv();
if (process.argv.includes('--offline')) env.EXPO_PUBLIC_OFFLINE = '1';
// Expo asks "Continue with uncommitted changes?" before prebuild; never block on that prompt.
env.EXPO_NO_GIT_STATUS = '1';

if (!sdk) {
  console.error('Android SDK לא נמצא. הרץ setup.cmd (או node scripts/setup.js) ופתח את Android Studio פעם אחת.');
  process.exit(1);
}

const run = (cmd, args) => spawnSync(cmd, args, { env, encoding: 'utf8', shell: true });
const hasDevice = () => /\tdevice\b/.test(run('adb', ['devices']).stdout ?? '');

if (!hasDevice()) {
  const avds = run('emulator', ['-list-avds']).stdout ?? '';
  if (!avds.split(/\r?\n/).includes(AVD_NAME)) {
    console.error(`האמולטור ${AVD_NAME} לא קיים. הרץ node scripts/setup.js כדי ליצור אותו.`);
    process.exit(1);
  }
  console.log(`מפעיל אמולטור ${AVD_NAME}...`);
  spawn('emulator', ['-avd', AVD_NAME, '-no-snapshot-save'], {
    env,
    detached: true,
    stdio: 'ignore',
    shell: true,
  }).unref();
  run('adb', ['wait-for-device']);
  while (run('adb', ['shell', 'getprop', 'sys.boot_completed']).stdout?.trim() !== '1') {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }
}

// The android/ folder is generated from app.json, the assets and the native dependencies. It is not
// in git and Expo does not refresh it by itself, so regenerate it whenever those inputs change
// (icon, orientation, permissions, a new native package...). JavaScript changes need no rebuild.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');
const stampFile = path.join(androidDir, '.prebuild-hash');

function nativeInputsHash() {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(path.join(root, 'app.json')));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  hash.update(JSON.stringify([pkg.dependencies, pkg.devDependencies]));
  const assets = path.join(root, 'assets');
  if (fs.existsSync(assets)) {
    for (const name of fs.readdirSync(assets).sort()) hash.update(name).update(fs.readFileSync(path.join(assets, name)));
  }
  return hash.digest('hex');
}

const wanted = nativeInputsHash();
const current = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, 'utf8').trim() : null;
if (!fs.existsSync(androidDir) || current !== wanted) {
  console.log('מייצר את תיקיית android/ מההגדרות והנכסים הנוכחיים (prebuild)...');
  const prebuild = spawnSync('npx', ['expo', 'prebuild', '--clean', '--platform', 'android', '--no-install'], {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: true,
  });
  if (prebuild.status !== 0) process.exit(prebuild.status ?? 1);
  fs.writeFileSync(stampFile, wanted);
}

// Builds a real native app (package com.zombieoutbreak.game) and installs it on the emulator.
// The first build generates the android/ folder and takes several minutes.
// --release bundles the JavaScript inside the app, so it runs without the dev server.
const variant = process.argv.includes('--release') ? ['--variant', 'release'] : [];
const expo = spawn('npx', ['expo', 'run:android', ...variant], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: true,
});
expo.on('exit', (code) => process.exit(code ?? 0));

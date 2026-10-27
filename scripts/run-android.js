// Starts the Android emulator (if none is running) and launches the game in it via Expo Go.
// Run with `node scripts/run-android.js` (add `--offline` for no Firebase, bots only).
const { spawn, spawnSync } = require('node:child_process');
const { AVD_NAME, androidEnv } = require('./android');

const { env, sdk } = androidEnv();
if (process.argv.includes('--offline')) env.EXPO_PUBLIC_OFFLINE = '1';

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

const expo = spawn('npx', ['expo', 'start', '--android', '--clear'], {
  env,
  stdio: 'inherit',
  shell: true,
});
expo.on('exit', (code) => process.exit(code ?? 0));

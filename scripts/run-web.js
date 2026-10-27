// Runs the same game in the browser (react-native-web). The code is shared with the Android app.
// Run with `node scripts/run-web.js` (add `--offline` for no Firebase, bots only).
const { spawn } = require('node:child_process');

const env = { ...process.env };
if (process.argv.includes('--offline')) env.EXPO_PUBLIC_OFFLINE = '1';

const expo = spawn('npx', ['expo', 'start', '--web', '--clear'], { env, stdio: 'inherit', shell: true });
expo.on('exit', (code) => process.exit(code ?? 0));

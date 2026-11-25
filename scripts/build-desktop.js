const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const stagingRoot = path.join(root, '.desktop-build');
const stagingApp = path.join(stagingRoot, 'app');

function runNode(script, args, env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(script)} failed with exit code ${result.status}`);
}

try {
  runNode(require.resolve('expo/bin/cli'), ['export', '--platform', 'web'], {
    ...process.env,
    ZOMBIE_TAG_DESKTOP: '1',
  });

  fs.rmSync(stagingRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(stagingApp, 'electron'), { recursive: true });
  fs.copyFileSync(path.join(root, 'electron', 'main.cjs'), path.join(stagingApp, 'electron', 'main.cjs'));
  fs.cpSync(path.join(root, 'dist'), path.join(stagingApp, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(stagingApp, 'package.json'), JSON.stringify({
    name: 'zombie-tag-desktop',
    version: require(path.join(root, 'package.json')).version,
    private: true,
    main: 'electron/main.cjs',
  }, null, 2) + '\n');

  runNode(require.resolve('electron-builder/cli.js'), ['--win', 'nsis'], process.env);
} finally {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
}

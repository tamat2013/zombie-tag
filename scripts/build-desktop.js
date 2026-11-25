const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const pngToIco = require('png-to-ico').default;

const root = path.resolve(__dirname, '..');
const stagingRoot = path.join(root, '.desktop-build');
const stagingApp = path.join(stagingRoot, 'app');
const projectPackage = require(path.join(root, 'package.json'));

function runNode(script, args, env, cwd = root) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(script)} failed with exit code ${result.status}`);
}

async function build() {
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
      version: projectPackage.version,
      private: true,
      main: 'electron/main.cjs',
      dependencies: {
        'electron-updater': projectPackage.devDependencies['electron-updater'],
      },
    }, null, 2) + '\n');
    fs.writeFileSync(
      path.join(stagingRoot, 'icon.ico'),
      await pngToIco(path.join(root, 'assets', 'icon.png')),
    );

    if (!process.env.npm_execpath) throw new Error('Run the desktop build with npm run desktop:build');
    runNode(process.env.npm_execpath, [
      'install',
      '--omit=dev',
      '--no-audit',
      '--no-fund',
      '--no-save',
    ], process.env, stagingApp);

    runNode(require.resolve('electron-builder/cli.js'), ['--win', 'nsis'], process.env);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

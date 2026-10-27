// Locates the Android SDK / JDK and exposes helpers shared by setup.js and run-android.js.
const fs = require('node:fs');
const path = require('node:path');

const AVD_NAME = 'ZombieTag';
const API = '35';
const IMAGE = `system-images;android-${API};google_apis;x86_64`;

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.HOME && path.join(process.env.HOME, 'Android', 'Sdk'),
    process.env.HOME && path.join(process.env.HOME, 'Library', 'Android', 'sdk'),
  ];
  return candidates.find((p) => p && fs.existsSync(p)) ?? null;
}

function findJava() {
  const programFiles = process.env.ProgramFiles || 'C:/Program Files';
  // Microsoft OpenJDK (installed by setup.js via winget) lives in a versioned folder.
  const msDir = path.join(programFiles, 'Microsoft');
  const msJdk = fs.existsSync(msDir)
    ? fs.readdirSync(msDir).filter((d) => d.startsWith('jdk-')).sort().reverse()[0]
    : null;
  const candidates = [
    process.env.JAVA_HOME,
    msJdk && path.join(msDir, msJdk),
    path.join(programFiles, 'Android', 'Android Studio', 'jbr'),
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  ];
  return candidates.find((p) => p && fs.existsSync(path.join(p, 'bin'))) ?? null;
}

/** process.env extended with ANDROID_HOME, JAVA_HOME and the SDK tool folders on PATH. */
function androidEnv() {
  const sdk = findSdk();
  const java = findJava();
  const env = { ...process.env };
  const extra = [path.dirname(process.execPath)];
  if (sdk) {
    env.ANDROID_HOME = sdk;
    env.ANDROID_SDK_ROOT = sdk;
    extra.push(
      path.join(sdk, 'platform-tools'),
      path.join(sdk, 'emulator'),
      path.join(sdk, 'cmdline-tools', 'latest', 'bin'),
    );
  }
  if (java) {
    env.JAVA_HOME = java;
    extra.push(path.join(java, 'bin'));
  }
  env.PATH = `${extra.join(path.delimiter)}${path.delimiter}${env.PATH}`;
  return { env, sdk };
}

const defaultSdk = () => path.join(process.env.LOCALAPPDATA || path.join(process.env.HOME || '.', '.android-sdk'), 'Android', 'Sdk');

module.exports = { AVD_NAME, API, IMAGE, androidEnv, defaultSdk };

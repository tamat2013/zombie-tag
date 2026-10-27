# Zombie Game

A zombie game built with [Expo](https://expo.dev) and React Native.

## Getting started

The game targets Android phones and runs in the Android emulator (no browser build).

### Automatic install (Windows)

Run `setup.cmd` (double-click), or press F5 in VS Code (it runs `scripts/setup.js` first). Everything runs unattended, using `winget` for Node.js and the JDK:

1. Node.js LTS, if missing (`setup.cmd` only).
2. Project dependencies (`npm install`).
3. Microsoft OpenJDK 17, if `java` is missing.
4. Android SDK command-line tools, downloaded from Google into `%LOCALAPPDATA%\Android\Sdk`.
5. `platform-tools`, `emulator`, Android 35 and its Google APIs x86_64 system image (a few GB).
6. An emulator named `ZombieTag` (Pixel 6).

Each step is skipped if it is already done, so it is safe to re-run. If Node.js or Java was just installed, restart VS Code before pressing F5. `python scripts/setup.py` does the same thing from Python (it runs the JS script). `python scripts/run.py [--offline]` runs setup and then starts the game. `run.cmd [--offline]` does the same from cmd (`setup.cmd` and `run.cmd` both just run the JS scripts).

The emulator needs hardware virtualization: enable it in BIOS, and on Windows turn on "Windows Hypervisor Platform" (Windows Features).

### Manual install (without the setup files)

1. Install [Node.js 20+](https://nodejs.org) and a JDK 17+ (for example [Microsoft OpenJDK](https://learn.microsoft.com/java/openjdk/download)).
2. Install [Android Studio](https://developer.android.com/studio), open it once and finish the first-run wizard. In More Actions > SDK Manager > SDK Tools, make sure "Android SDK Command-line Tools" is installed.
3. In Device Manager, create a virtual device (for example Pixel 6, any Google APIs system image) and start it.
4. Set `ANDROID_HOME` to the SDK folder (default `%LOCALAPPDATA%\Android\Sdk`) and add `platform-tools` and `emulator` from it to `PATH`.
5. In the project folder run `npm install`.
6. With the emulator running, run `npx expo start --android`. Expo installs Expo Go on the emulator and opens the game. For offline mode, set `EXPO_PUBLIC_OFFLINE=1` first.

Using your own emulator, the `ZombieTag` one from step 6 of the automatic install is not needed. `npm run android` also starts any AVD only if it is named `ZombieTag`; otherwise start your emulator yourself first and it will be detected.

### Run

Press F5 in VS Code, or:

```sh
npm run android          # full game (Firebase)
npm run android:offline  # offline, bots only
```

This starts the emulator if needed and opens the game in Expo Go.

## License

Copyright (c) 2026 tamat2013. All rights reserved. No one may use, copy, modify, or distribute this software without the copyright holder's prior written permission. See [LICENSE](LICENSE) for details.

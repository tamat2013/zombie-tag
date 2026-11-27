# Zombie Tag

This repository has **two versions of the same game**:

- **Regular** (phone, web, Windows): Expo / React Native, code in `src/`. See `README.md`.
- **VR** (Meta Quest, PC VR): Unity + Blender, everything in `Zombietag-VR/`. See `Zombietag-VR/CLAUDE.md` and `Zombietag-VR/PROMPT.md`.

## The parity rule: every change goes into both versions

This rule has no exceptions.

- Every feature, fix, balance change, new content (skin, outfit, ability, upgrade, filter, map, mission, achievement, tournament, string, sound event, setting, screen) and every removal is made in **both** the regular version and the VR version in the same task. A task is not done while only one version has the change.
- If the request names only one version ("fix this on the phone", "add this in VR"), still make it in both, and say so in the reply. The one exception is code that only makes sense on one platform (touch joystick, keyboard keys, Android update APK, Electron, VR comfort settings, XR input, headset performance). Say in the reply which part was platform-only and why.
- Game rules and numbers must stay identical. Data comes from one place: the regular game's TypeScript (`src/engine/constants.ts`, `src/data/`, `src/engine/abilities.ts`, `src/logic/`, `src/i18n/`). After changing any of it, run `npm run export:vr` (writes JSON into `Zombietag-VR/Assets/Shared/`) and, when engine behavior changed, regenerate the golden tests (`scripts/export-vr-golden.ts`) and update the C# port in `Zombietag-VR/Assets/Scripts/Core` or `Logic` until the Unity tests pass.
- The menus of both versions look the same (same layout, colors, fonts, icons, texts, all 16 languages). A screen change in `src/screens/` or `src/components/` needs the same change in `Zombietag-VR/Assets/Scripts/UI/` and a new reference screenshot.
- Gameplay presentation is different by design: the regular game is 2D top-down, the VR game is first-person 3D horror. A new gameplay element needs its 2D look in the regular game and its full 3D look (Blender model, animation, effects, spatial sound, haptics) in VR.
- Before finishing, run the checks of both versions: `npm test` and `npm run typecheck` for the regular game, and the Unity EditMode tests for VR. Update `Zombietag-VR/PARITY.md` when a feature is added or changed.

## Accounts and multiplayer

- Both versions use the same Firebase project and the same accounts and profiles (`users/{uid}`). Never drop or overwrite profile fields the other version uses.
- Phone / PC players and VR players never play in the same match. Regular rooms live at `rooms/{code}`, VR rooms at `vrRooms/{code}` in Realtime Database. Keep it that way in every change to rooms, quick join, friends, tournaments and knockout.
- Changes to `database.rules.json` or `firestore.rules` must work for both versions. Ask before deploying them.

## Releases

Both versions share one version number (`app.json`) and are released together; the release must keep every existing file (APK, IPA, Windows installer, web zip, checksums) and add the VR builds.

# Zombie Tag VR

First-person 3D horror VR version of Zombie Tag. Unity 6 LTS (URP, OpenXR, XR Interaction Toolkit) for Meta Quest and PC VR; all models and animations made in Blender. The full brief is `PROMPT.md`; progress against it is tracked in `PARITY.md`.

## The parity rule: every change goes into both versions

This rule has no exceptions.

- This is the same game as the regular Zombie Tag in `../src/` (Expo / React Native) with 100% of its features. Every change made here is also made in the regular version in the same task, and every change to the regular version is also made here. A task is not done while only one version has it. Say in the reply what was changed in each version.
- The only exception is code that only makes sense on one platform (XR input, comfort settings, headset performance, touch joystick, keyboard keys, Electron, Android APK update). Say in the reply what was platform-only and why.
- Never type game numbers or texts into C# by hand. They come from the regular game through `npm run export:vr` (run in the repository root) into `Assets/Shared/`, which is generated: never edit it by hand. A new number or text goes into the regular game's TypeScript first, then gets exported.
- `Assets/Scripts/Core` (engine) and `Assets/Scripts/Logic` are a line-by-line port of `../src/engine/` and `../src/logic/`, in plain C# without Unity types. When the TypeScript changes, change the port and regenerate the golden tests (`../scripts/export-vr-golden.ts`) until the EditMode tests pass.
- Menus (everything outside a match) must look exactly like the regular game: same layout, colors (`../src/theme.ts`), fonts, icons, texts, 16 languages, RTL. Check with the reference screenshots in `Tests/Reference/`.
- Inside a match everything is first-person 3D horror: real models, animations, lighting, fog, spatial audio and haptics. Game rules and balance never change for VR. If VR seems to need a rule change, ask the user, and make it in both versions.
- Before finishing: Unity EditMode tests here, plus `npm test` and `npm run typecheck` in the repository root. Update `PARITY.md`.

## Accounts and multiplayer

- Same Firebase project and same accounts as the regular game, through the C# REST + streaming layer in `Assets/Scripts/Services`. Profile writes merge: never drop fields this version does not use.
- VR rooms live at `vrRooms/{code}`, regular rooms at `rooms/{code}`. VR players and phone / PC players must never end up in the same match through any path (code, public rooms, quick join, friends, tournaments, knockout).
- Firebase keys go in `Assets/StreamingAssets/firebase.json`, which is not committed.

## Art (Blender)

- Every model and animation is made in Blender, with the source `.blend` kept in `Art/Blender/`. Exported files in `Assets/Art/` are produced only by `Tools/blender_export.py` (`blender --background --python Tools/blender_export.py`); never edit an exported file by hand.
- Quality bar is high: hand-built detailed models, clean rigs, hand-keyed animations, LODs, lightmap UVs. No placeholder art in a finished feature.
- Quest budgets: characters ≤ 15k triangles at LOD0, ≤ 150 draw calls and ≤ 400k triangles per frame, ASTC textures, baked lighting with at most 1–2 real-time shadowed lights. 72 fps on Quest 2, 90 fps on Quest 3.
- Scale: 1 engine tile = 1.5 m (`VR_METERS_PER_TILE`), Y up, map x → world X, map y → world Z. Collision is always the tile grid, never the decoration.

## Project hygiene

- Unity generated folders (`Library/`, `Temp/`, `Obj/`, `Build/`, `Builds/`, `Logs/`, `UserSettings/`) are never committed. Large binary art goes through Git LFS.
- The VR version number always equals `version` in `../app.json`.

# Build prompt: Zombie Tag VR

> Paste everything below the line into Claude Code, opened in `C:\Users\eitan_yxpa4wb\code\zombie-game` (the repository root, so both `CLAUDE.md` files load).
> The work is big: let it run in stages and keep the parity checklist (section 12) as the definition of done.

---

## 0. The mission

Build **Zombie Tag VR**: a first-person, 3D, horror version of Zombie Tag for VR headsets, made in **Unity**, with every model and animation made in **Blender**.

It is the **same game** as the regular Zombie Tag (the Expo / React Native app in this repository: `src/`), with **100% of its features**. It uses the **same Firebase project and the same accounts**. Up to the moment a match ("the run") starts, a player cannot tell it apart from the regular game. Once the run starts, it looks and feels completely different: you are inside a dark, fully 3D horror world, in first person.

Everything for the VR version lives in `C:\Users\eitan_yxpa4wb\code\zombie-game\Zombietag-VR`. The only changes allowed outside that folder are the small, listed changes to the regular game that keep the two versions in sync (section 4.4 and section 10).

Read `CLAUDE.md` (root) and `Zombietag-VR/CLAUDE.md` first. The rule in both is absolute: **every change goes into both the VR version and the regular version.**

## 1. Hard requirements (do not trade these away)

1. **Same accounts.** Same Firebase Auth (email + password, password reset, guest / anonymous sign-in, local guest fallback offline). Signing in on VR with an existing account shows the same coins, XP, level, medals, skins, custom skins, outfits, abilities, loadouts, upgrades, filters, stats, missions, achievements, obstacle times and medals, tournament entries and friends. Anything earned in VR shows up in the regular game and the other way round.
2. **VR players and phone / PC players never meet in a match.** Separate lobbies, separate public rooms, separate quick join, separate tournament groups, separate knockout runs. Shared: the account, the profile, the global leaderboard, tournament leaderboards, ratings, friends list, community maps.
3. **100% feature parity.** Every screen, mode, rule, ability, upgrade, skin, outfit, filter, map, task, mission, achievement, reward, sound event, language and setting of the regular game exists in VR and behaves the same. Section 3 is the inventory; section 12 is the checklist. If something is not in the list but is in `src/`, it still counts.
4. **Identical until the run.** Intro, sign-in, home, skin select, skin designer, map select, map creator, lobby, shop, missions, tournaments, leaderboard, profile, settings and results look like the regular game: same layout, colors (`src/theme.ts`), fonts (Lilita One, Rubik, Rubik Wet Paint), icons, texts, translations and RTL. In the headset they are shown as one large flat screen floating in front of the player on a plain dark background, used with a controller laser pointer, exactly as if you were looking at the regular game.
5. **Completely different inside the run.** From the role reveal on, the flat screen dissolves and the player is standing inside the map, in first person, in a detailed 3D horror world (section 6).
6. **Same balance.** Game logic is a faithful port of `src/engine/` and gives the same results for the same inputs and seed. Only the presentation changes. All numbers (speeds, vision, reach, cooldowns, durations, radii, freeze time, task time bonus, stone range, noise, saw timing, tournament multipliers, rewards) come from the regular game's code, never retyped by hand (section 4.2).
7. **Really good.** Hand-built, detailed models and animations in Blender, real lighting and sound design, smooth frame rate on Meta Quest. Not placeholder cubes. A player should feel scared.

## 2. Platforms and tech stack

- **Unity 6 LTS** (newest 6000.x LTS installed; check with `unity --help` / the Unity MCP tools, install it if missing), **URP**.
- **OpenXR** + **XR Interaction Toolkit 3.x** (+ XR Hands for optional hand tracking). Meta Quest support through the OpenXR Meta feature group. No vendor lock-in beyond that.
- Targets:
  - **Meta Quest 2 / 3 / 3S / Pro** (standalone, Android, IL2CPP, ARM64, Vulkan). Must hold 72 fps on Quest 2 and 90 fps on Quest 3.
  - **PC VR** (Windows, OpenXR runtime: SteamVR, Meta Link, WMR). Higher quality tier.
- **Blender** (latest) for all models, rigs and animations. The Blender MCP is available: use it to build and inspect, and keep every source `.blend` in the repository.
- Unity project root: `Zombietag-VR/` (it contains `Assets/`, `Packages/`, `ProjectSettings/`). Blender sources: `Zombietag-VR/Art/Blender/`. Exported files: `Zombietag-VR/Assets/Art/`.
- Add `Zombietag-VR/.gitignore` (Unity: `Library/`, `Temp/`, `Obj/`, `Build/`, `Builds/`, `Logs/`, `UserSettings/`, `*.csproj`, `*.sln`, Blender `*.blend1`) and `Zombietag-VR/.gitattributes` with Git LFS for `*.blend *.fbx *.glb *.png *.jpg *.tga *.psd *.exr *.wav *.ogg *.mp3`. Ask the user before turning on Git LFS for the repository.
- Do not use a WebView to show the regular game inside VR; build the menus natively in Unity (crisp text in the headset, no paid plugin, full control).

## 3. What the regular game has (the inventory to match)

Read the code, do not trust this list alone. Paths are in the regular game.

**Flow and screens** (`src/navigation/types.ts`, `src/screens/`): Intro → Auth → Home → SkinSelect → MapSelect → Lobby → Game → Results; also SkinDesigner, MapCreator, Shop (tabs: skins, outfits, abilities, upgrades, filters, coins), Missions, Tournaments, Leaderboard, Profile, Settings. App shell, toasts, rating prompt (`RatingPrompt`, `RatingBox`, `src/logic/rating.ts`), app update check (`src/services/appUpdate.ts`), language picker.

**Modes** (`GameMode`): `classic`, `tournament` (scheduled tournaments, 100 groups, 60 s join window, knockout 8 → 4 → 2, champion points, prizes, shorter 180 s rounds, survivor ×1.1 / zombie ×0.9 speed), `obstacle` (race the clock, checkpoints, finish, gold / silver / bronze medal times, personal best), `training` (bots, 300 s, 50% XP / 30% coins). Bot difficulties: dummy, easy, normal, hard.

**Lobby** (`LobbyScreen.tsx`, `roomService.ts`): online tabs rooms / create / join / friends; 5-letter room codes; public open rooms that start by themselves when full; quick join; bots fill empty seats; host house rules (`MatchRules`: starting zombies or auto, release delay, zombie speed, fast abilities, number of doctors); match length; ready state; back to lobby after a match; leave handling; knockout state in the room.

**Match rules** (`src/engine/`): survivors vs zombies; infection by touch; a freshly infected player is frozen 10 s and only a doctor can heal them in that time (2 doctors by default, cures give coins and XP); zombies held at spawn for the release delay; tasks at stations (wires, machine, download, trash, temperature) and every finished task takes 15 s off the clock (capped at half the match); each survivor has one throwable stone that makes a noise zombies hear for 5 s; zombies see blue sound waves from nearby survivors; heartbeat when a zombie is near; vision radius and line of sight (fog of war); mud slows; hazards; moving saws; crates; checkpoints and finish (obstacle); win by time-out (survivors) or everyone infected (zombies); origin story before the match (`OriginStory.tsx`), role reveal (`RoleReveal.tsx`), countdown (`src/utils/matchSetup.ts`).

**Abilities** (`src/engine/abilities.ts`, 19): survivor: sprint, scan, medic, invisibility (Vanish), smoke, teleport, bubble, adrenaline, flashbang, cloak. Zombie: dash, zombieVision, roar, frenzy, leap, howl, lunge, rage, sniff. Free set, default loadout, max 3 per role, cooldowns and perks.

**Upgrades** (11): speed, cooldown, vision, taskSpeed, reach, stealth, rotLegs, deadEyes, keenEars, firstAid, bloodPump.

**Skins** (`src/data/skins.ts`): 48 built-in skins, including the tournament champion skin and the medal-only skins (body color, accent color, eyes: round / angry / sleepy / cyclops, pattern: none / stripes / spots / split / ring, accessory, rarity, coin or medal price) and 10 skin powers (swift, healer, tank, ghost, alpha, hunter, scout, engineer, master, brute). Custom skins from the Skin Designer.

**Outfits** (`src/data/catalog.ts`): about 55 head / face items (cap, top hat, crown, flame, axe, UFO, T-Rex …), some bought with medals.

**Zombie filters** (16, with perks): classic, nightvision, bloodmoon, thermal, toxic, frost, xray, predator, swamp, oldfilm, neon, ash, abyss, radiation, eclipse, hivemind.

**Maps** (`src/data/maps.ts`, `mapGen.ts`): 23 arenas (Abandoned Hospital, Dead Mall, Army Camp, Secret Lab, Max Security Prison, Ghost Town, Giant Bunker, Neon Arcade, Lake Cabins, Haunted School, Creepy Mansion, Grand Hotel, Infected Farm, Old Coal Mine, Swamp Village, Office Tower, Subway Tunnels, Cruise Ship, Empty Stadium, Toxic Factory, The Sewers, Abandoned Airport, University Campus) and 5 obstacle courses (Rookie Course, Saw Valley, The Snake, Mud Marsh, Saw Gauntlet). Tile codes: floor, wall, crate, task, survivor spawn, zombie spawn, hazard, finish, mud, checkpoint, saw. Community maps with share codes (`mapService.ts`).

**Progression** (`src/logic/`): XP and levels (max 50), coins, medals and medal conversion, rewards per match, daily and weekly missions, achievements, stats, global leaderboard (xp, wins, infections, tasks), tournaments and their leaderboards, shop rules.

**Social**: friends by username, join a friend's room with one tap.

**Sound** (`src/services/sound.ts`, `src/logic/soundSettings.ts`): effects (click, steps, zombie steps, heartbeat, groan, bite, infected, heal, shield, task, checkpoint, hurt, throw, stone hit, released, ability, tick, beacon, win, lose), menu and game music, settings (mute, music volume, effects volume, footsteps, vibration).

**Languages** (`src/i18n/`): 16 languages including Hebrew and Arabic (RTL).

**Offline mode**: no Firebase keys → local accounts and bot-only matches.

## 4. Architecture

### 4.1 Layers in Unity

```
Zombietag-VR/Assets/
  Scripts/
    Core/        engine port: GameEngine, Abilities, Bots, Entities, Map, Pathfinding, Constants (pure C#, no UnityEngine)
    Logic/       progression, missions, shop, tournaments, leaderboard, rating, soundSettings (pure C#)
    Services/    Firebase auth, profile, rooms, match transport, maps, friends, leaderboard, tournaments, ratings, updates
    UI/          the flat menu screens (identical to the regular game)
    Run/         the 3D match: world builder, player rig, avatars, tasks, abilities VFX, HUD on the wrist, audio
    XR/          rig, input, comfort, haptics
  Shared/        JSON generated from the regular game (section 4.2), never edited by hand
  Art/           exported models, textures, animations, materials
  Audio/
  Tests/EditMode, Tests/PlayMode, Tests/Golden
```

`Core` and `Logic` are plain C# assemblies with no Unity types, so they run fast in EditMode tests and stay a line-by-line port of the TypeScript.

### 4.2 One source of truth for data

Add a script to the regular game, `scripts/export-vr-data.ts` (run with `node --experimental-strip-types`), that writes JSON into `Zombietag-VR/Assets/Shared/`:

- `constants.json` (everything in `src/engine/constants.ts`)
- `abilities.json`, `upgrades.json`, `skins.json`, `outfits.json`, `filters.json`, `maps.json` (built-in maps with tiles and medal times), `missions.json`, `achievements.json`, `tournaments.json` (the schedule rules), `rewards.json`
- `strings/<lang>.json` for all 16 languages (every string the regular game shows)
- `stories.json` (origin stories)

Unity loads only these files for data. Add `npm run export:vr` to `package.json`. A test in the regular game (`tests/vrExport.test.ts`) fails if the committed JSON is out of date, so a change to the regular game cannot be forgotten in VR.

### 4.3 Engine parity: golden tests

Add `scripts/export-vr-golden.ts` to the regular game: it runs the TypeScript engine on a set of scripted scenarios (fixed seed, map, roster, rules, input sequence per frame) and writes snapshots (positions, roles, frozen timers, cooldowns, effects, task progress, events, result) every N frames to `Zombietag-VR/Assets/Tests/Golden/*.json`. Cover: classic with bots per difficulty, infection and freeze, doctor cure, every ability, stone and noise, tasks and time bonus, mud, saws, hazards, checkpoints and finish, tournament speed multipliers, release delay, every house rule, knockout next round, match end both ways. Unity EditMode tests replay the same inputs in the C# engine and must match within a tiny float tolerance. Do the same for `Logic` (rewards, level math, missions, shop, tournament points and knockout outcome, leaderboard, rating).

The engine keeps the regular game's 2D world units (pixels, `TILE = 48`). The 3D view scales them: **1 tile = 1.5 m** by default (one constant, `VR_METERS_PER_TILE`). Speeds, ranges and radii stay identical in tiles, so balance is identical. Up is Y; the map's x → world X, y → world Z.

### 4.4 Backend: same Firebase, separate VR rooms

- Use the same Firebase project (the `EXPO_PUBLIC_FIREBASE_*` values from `.env`, copied into an untracked `Zombietag-VR/Assets/StreamingAssets/firebase.json`; commit only an example file).
- The Firebase Unity SDK is not supported for Windows production builds, so write one C# backend layer on the **Firebase REST APIs** for every platform: Identity Toolkit (sign up, sign in, anonymous, password reset, token refresh), Firestore REST (profiles, maps, leaderboard, tournaments, ratings) and Realtime Database REST with streaming (Server-Sent Events) for rooms and live match state. Same JSON shapes as the TypeScript services, field for field.
- **Never lose profile data.** Write the profile with field masks / merges, keep unknown fields, and normalize like `normalizeProfile`. Test that a profile written by VR loads unchanged in the regular game and the other way round.
- **Separation:** VR rooms live at `vrRooms/{code}` in Realtime Database (same structure as `rooms/{code}`, including `live/`). The regular game reads only `rooms/`, so even old phone versions can never see or join a VR room. Room code creation in both versions checks both paths, so a code is never used twice. When a phone / PC player types a code that exists in `vrRooms/` (and the other way round), show a clear message: "This room is for VR players" / "This room is for phone and PC players" (add the string to all 16 languages in both versions).
- Tournament groups and knockout runs use `vrRooms/` too; points go to the same tournament leaderboard.
- Friends: the friends list is shared. Show when a friend is waiting in a VR room (VR) or a regular room (phone / PC); "join with one tap" only works for a room on your own platform; otherwise show the message above.
- Ratings get `source: 'vr'`.
- Changes to the regular repository for this (do them, keep them small): `database.rules.json` (add `vrRooms` with the same rules as `rooms`), `firestore.rules` (allow `'vr'` in ratings `source`), the regular `roomService.ts` / friends UI (check `vrRooms/` for the "VR room" message and when creating a code), strings, tests. Ask the user before deploying rules (`firebase deploy --only database,firestore:rules`).
- Live match state: same `NetPlayerState` at 10 Hz (`NETWORK_SEND_HZ`), plus VR-only fields for the 3D avatar (head position and rotation, both hand poses, current animation state). Interpolate remote players smoothly. Host runs the bots exactly like the regular game.
- Offline mode works as in the regular game.

## 5. The menus: identical to the regular game

- Rebuild every screen in Unity UI Toolkit (or uGUI) to match the regular game: layout, spacing, colors from `theme.ts`, the same fonts (import the Google font files), the same icons (export the `@expo/vector-icons` glyphs used by `src/components/Icon.tsx` / `glyphMap.ts` as a font or SVGs), the same 2D character drawing (`Character.tsx`) for skin previews, the same map previews, the same animations and toasts.
- Take screenshots of the regular game (web build, `npm run web`) for every screen and state at the same resolution, and compare them with the Unity screen rendered to a texture. Keep the reference images in `Zombietag-VR/Tests/Reference/` and make a PlayMode test that flags large differences.
- Presentation in the headset: one large, slightly curved screen about 2.5 m away at eye height, on a plain near-black background with no other scenery, so it feels like the regular game on a big display. Point with either controller (laser), trigger to tap, thumbstick to scroll, system keyboard for text. Grab the screen edge to move it. Recenter with the menu button.
- Settings screen stays identical to the regular game. VR-only comfort options live in the in-run pause menu (section 6.9), so the menus show no difference.

## 6. The run: first-person 3D horror

The run starts when the regular game would show the origin story / role reveal. The flat screen breaks apart into ash and the lights go out. Then you are standing in the map.

### 6.1 World

- Build every map from its tiles: walls at full height with thickness, floors, ceilings (most maps are indoor; outdoor maps like Ghost Town, Infected Farm, Swamp Village, Empty Stadium get a dark sky with fog and moonlight), crates as real crates / barricades, task stations as real machines, spawns, mud pools, hazards (fire, acid, broken electrics — match what the tile means), saws as spinning blades on rails moving across their 3-tile span on the exact engine period, checkpoints and finish gates (obstacle).
- Every one of the 28 built-in maps gets its own hand-made theme kit and set dressing in Blender: a hospital with gurneys and flickering surgery lamps, a dead mall with broken escalators and mannequins, a cruise ship with tilted corridors, and so on. Collision is always the tile grid, never the decoration.
- Custom and community maps (from the Map Creator) use a generic horror kit and are built procedurally at load time.
- Horror lighting: mostly dark, baked lighting with light probes, flickering practical lights, volumetric fog, dust, dripping water, distant sounds. URP quality tiers: Quest 2, Quest 3, PC.

### 6.2 Vision and fog of war

- The engine's vision radius and line-of-sight rules decide what you can see. Do not render remote players the engine says you cannot see (no wallhacks).
- Survivors carry a flashlight (hand or chest mounted; the vision upgrade makes it reach farther). Darkness and fog fall off at the vision radius.
- Zombies see in their equipped **filter**: each of the 16 filters becomes a full-screen color grade (LUT), vignette and effect (night vision grain, thermal heat colors, x-ray edges, old film scratches, …), with its perk applied by the engine as before.
- Scan, Zombie Vision, Sniff, x-ray / eclipse wall sight: show targets through walls with an outline glow for the exact duration.
- Zombies see survivors' **blue sound waves** as rings spreading on floors and walls, and stone noises as a pulse they can follow.

### 6.3 Player body and movement

- Full-body avatar of your skin with IK: head follows the headset, hands follow the controllers, legs walk procedurally from movement. Looking down you see your body and hands; others see your whole body.
- Left thumbstick moves (relative to head or controller, setting), right thumbstick turns (snap or smooth). Real walking in the play area also moves you, but the engine stays in charge: the position sent to the engine is clamped to collision, and if you walk into a wall the view fades.
- Seated and standing modes, height calibration, dominant hand option.
- Facing for the engine is the head direction (or controller, setting).

### 6.4 Roles and the zombie transformation

- Role reveal in 3D: you look at your hands; survivors see their own hands holding a flashlight, zombies watch their hands rot and twitch, the screen pulses red. Doctors see a medical armband and a glowing hand.
- Origin story as a short 3D scene inside the map (the same story chosen by the seed).
- Zombies wait in a cage / locked room at their spawn during the release delay; the gate breaks open on release.
- Getting infected: bite animation from the zombie, screen shake, blood vignette, your hands turn, you are frozen for 10 s (shown as a creeping frost / paralysis effect and a countdown on your wrist). A doctor heals by touching you with their hand.

### 6.5 Interactions

- **Tag / infect:** the engine's body-distance rule decides it; zombies also get a claw swipe animation and controller haptics when they hit.
- **Stone:** a stone on your belt; grab it, throw it with a real throwing motion. The throw direction gives the engine's angle; the distance is capped by `STONE_RANGE`. It flies, bounces, clacks loudly.
- **Abilities:** your 3 loadout abilities sit on your off-hand wrist as glowing buttons; press with the other hand's finger, or use face buttons (A / B / X+Y) as shortcuts. Each one has a full 3D effect and sound: smoke cloud, flashbang white-out for blinded zombies, medic healing dome, bubble shield sphere, teleport warp, invisibility (you look see-through to yourself, shimmer to others up close), zombie roar / howl shockwave, leap and lunge as a real jump arc, dash / rage / frenzy speed lines and heavy breathing. Cooldowns glow on the wrist and buzz when ready.
- **Tasks** become physical, with the same timing and speed upgrade effects as the regular minigames (`src/tasks/TaskGames.tsx`):
  - Wires: grab four colored cables and plug each into its socket.
  - Machine: pull and hold a lever in the green zone, or crank a handle (same timing window as the regular game).
  - Download: plug a USB drive into a terminal and keep it in while the file list fills.
  - Trash: pull the chute lever and shove the bags in.
  - Temperature: turn a dial until the gauge hits the target.
  While doing a task you are still in the world: a zombie can walk up behind you. Make that scary.

### 6.6 Wrist HUD (instead of the flat HUD)

Left wrist watch: time left, survivors / zombies count, your role, doctor badge, task count, obstacle timer and medal pace. Turn your wrist up to see the **minimap** device (same information as the regular minimap). Ability cooldowns on the same wrist. Nothing stuck to your face except damage / effect vignettes.

### 6.7 Audio

- Spatial audio (Unity audio spatializer / Meta XR Audio) for every regular sound event: footsteps by surface (mud, metal, tile), zombie footsteps and groans by distance, heartbeat faster as a zombie gets closer (same ranges as `GameScreen.tsx`), bites, heals, shields, ability sounds, stone hits, task sounds, release alarm, countdown ticks, the beacon.
- New, high-quality horror ambience and music per map; respect the Settings volumes, mute, footsteps switch.
- Haptics on the controllers wherever the regular game vibrates, plus heartbeat pulses.

### 6.8 Obstacle mode

First-person parkour race through the course: saws, mud, hazards, checkpoints (respawn there), finish gate, live timer and medal times on the wrist, ghost of your best run optional.

### 6.9 Pause menu (in the run)

Menu button opens a small floating panel: resume, leave match (same confirm as the regular game), and VR comfort settings: snap / smooth turn, turn angle, comfort vignette while moving, seated / standing, height, dominant hand, movement direction (head / controller), subtitles for sound cues. These are stored locally on the device.

### 6.10 Results

After the run, a short 3D ending (survivors escape / the horde takes over), then the flat screen returns with the regular Results screen, identical to the regular game, with the same rewards.

## 7. Art in Blender (the bar is high)

- **Characters:** one base body, rigged (Rigify or a clean custom rig), with blend shapes for the 4 eye types, a material system driven by the skin data (body color, accent color, pattern mask for none / stripes / spots / split / ring), so every built-in and custom skin renders correctly in 3D. Each skin with an accessory and each of the ~55 outfits gets its own 3D prop, attached to a head / face socket. Each skin also has a zombie version: same colors, rotted, torn, glowing eyes.
- **Skin powers** get a subtle visual (ghost: translucent edges, tank: heavier build, …).
- **Animations** (keyframed by hand, clean loops, 30+ fps, root motion off): idle, walk, run, sprint, frozen / paralyzed, getting bitten, turning into a zombie, cured, throw, each task interaction, each ability, win, lose; zombies: shamble, run, lunge, leap, roar, howl, sniff, claw swipe, caged during release. First-person hand poses for grab, point, fist, holding flashlight, holding stone.
- **Environments:** modular kits per map theme plus props, with LODs, lightmap UVs and trim sheets.
- **Pipeline:** `Zombietag-VR/Tools/blender_export.py` exports every `.blend` to FBX (or glTF) with the right scale (meters), axes and naming, run by `blender --background --python`. Never edit an exported file by hand; fix the `.blend` and re-export.
- **Budgets for Quest:** characters ≤ 15k triangles at LOD0 with 3 LODs, ≤ 150 draw calls and ≤ 400k triangles per frame, texture atlases, ASTC compression, baked lighting, at most 1–2 real-time shadowed lights (the flashlights). PC tier may raise all of these.
- Check models with the Blender MCP `look` tool and in Unity in the headset view before calling them done.

## 8. Releases and versions

- VR version number = regular version number (`app.json`). They are released together.
- Add VR builds to `.github/workflows/release.yml` as extra release files, keeping all existing ones: `ZombieTag-VR-Quest.apk` (Quest, sideload / Meta store later) and `ZombieTag-VR-PC.zip` (PC VR), included in `SHA256SUMS.txt`. Unity builds in CI need a Unity license (GameCI, secrets `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD`): ask the user to add them; until then, build locally.
- The VR app checks GitHub releases for a newer VR build, like `src/services/appUpdate.ts`.
- Update `README.md` and the player guide (`site/guide/`) with the VR version and its downloads.

## 9. Testing

- EditMode: engine golden tests, logic tests, data export check, profile round-trip tests, room separation tests (a VR client never lists or joins `rooms/`, a regular client never lists or joins `vrRooms/`).
- PlayMode with the **XR Device Simulator** (no headset needed): sign in, buy something, start a training match, finish a task, throw a stone, use each ability, get infected and cured, end the match, see rewards.
- Menu screenshot comparison against the regular game (section 5).
- Two-client test against the Firebase emulator: two VR clients play a classic match together; a regular web client in the same lobby code is refused.
- Performance: Quest frame timing in the heaviest map with 15 players and bots.
- The regular game's own tests (`npm test`, `npm run typecheck`) must still pass after every change.

## 10. Order of work

1. Unity project, packages, XR rig, `.gitignore`, folder layout, empty scenes (Menu, Run).
2. Data export and golden export scripts in the regular game; load the JSON in Unity.
3. Port `Core` (engine) and `Logic`; make all golden and logic tests pass.
4. Backend layer (REST + streaming), accounts and profiles, with round-trip tests; `vrRooms` separation and the small regular-game changes; rules.
5. All menu screens, identical to the regular game, with screenshot comparisons.
6. Run: world builder from tiles, player rig, movement, vision, networking, bots, tasks, stone, abilities, wrist HUD, audio, haptics, obstacle mode.
7. Blender art: characters and skins, outfits, zombies, animations, then each map theme. Replace every placeholder.
8. Horror polish: lighting, fog, sound design, transitions, role reveal, origin story, endings.
9. Performance on Quest, PC tier, builds, release workflow, README and guide.
10. Walk the parity checklist line by line and fix every gap.

Commit after each working step with clear messages. Do not push or release without the user's go-ahead.

## 11. Things not to do

- Do not change game balance or rules for VR. If VR comfort seems to need a gameplay change, ask the user, and if approved, make it in both versions.
- Do not let VR and phone / PC players into the same match through any path (code, quick join, friends, tournaments, knockout).
- Do not copy numbers or texts by hand from TypeScript into C#; use the generated JSON.
- Do not ship placeholder art.
- Do not overwrite or drop profile fields the VR version does not use.

## 12. Parity checklist (definition of done)

Each line must be checked off in `Zombietag-VR/PARITY.md` (create it, keep it up to date) with how it was verified.

- [ ] Sign up, sign in, password reset, guest, sign out, offline local accounts
- [ ] Same profile on both versions: coins, XP, level, medals, every owned item, loadouts, upgrades, filter, stats, missions, achievements, obstacle bests and medals, tournaments, friends
- [ ] Intro, Auth, Home, SkinSelect, SkinDesigner, MapSelect, MapCreator, Lobby, Game, Results, Shop (all 6 tabs), Missions, Tournaments, Leaderboard, Profile, Settings
- [ ] Menus match the regular game's screenshots in all 16 languages, RTL included
- [ ] Classic, tournament (groups, join window, knockout 8 → 4 → 2, prizes, points), obstacle (medals, best times), training
- [ ] Bot difficulties dummy / easy / normal / hard
- [ ] Rooms: create, join by code, public rooms, quick join, auto-start when full, bots fill seats, house rules, match length, ready, back to lobby, leave
- [ ] VR and regular players cannot meet: rooms, codes, public list, quick join, friends join, tournaments, knockout
- [ ] Infection, 10 s freeze, doctors and cures, release delay, win conditions, task time bonus
- [ ] All 5 tasks, physical, same timing and upgrade effects
- [ ] Stone, noise, sound waves, heartbeat
- [ ] All 19 abilities with 3D effects, cooldowns, loadouts, perks
- [ ] All 11 upgrades, all 10 skin powers, all 16 filters with perks
- [ ] All 48 skins and custom skins in 3D, survivor and zombie versions; all 55 outfits as 3D props
- [ ] All 28 built-in maps with their own theme; custom and community maps; share codes
- [ ] Mud, hazards, saws, crates, checkpoints, finish
- [ ] Rewards, levels, missions (daily and weekly), achievements, leaderboard, tournament leaderboard
- [ ] Friends: add, remove, see where they are, join
- [ ] Sound settings, vibration → haptics, all sound events, music
- [ ] Rating prompt (source 'vr'), app update check
- [ ] Golden engine tests and logic tests pass; regular game tests pass
- [ ] Quest 2 at 72 fps, Quest 3 at 90 fps in the heaviest map
- [ ] Release files built and attached; README and guide updated

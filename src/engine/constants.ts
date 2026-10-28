export const TILE = 48;
export const PLAYER_RADIUS = 16;
export const SURVIVOR_SPEED = 170; // px / s
export const ZOMBIE_SPEED = 132;
export const SURVIVOR_VISION = 230;
export const ZOMBIE_VISION = 200;
export const INFECT_REACH = 4;
export const TASK_USE_RANGE = TILE * 1.1;
export const CLASSIC_DURATION_SEC = 600; // 10 minutes
export const TRAINING_DURATION_SEC = 300;
export const MUD_SLOW = 0.55;
export const SAW_RADIUS = 18;
export const SAW_SPAN_TILES = 3;
export const SAW_PERIOD_SEC = 2.6;
export const NETWORK_SEND_HZ = 10;
/** A freshly infected player is frozen this long; only a doctor can heal them meanwhile. */
export const INFECT_FREEZE_MS = 10_000;
export const DOCTOR_COUNT = 2;
/** Extra distance (beyond touching) at which a doctor heals a frozen zombie. */
export const HEAL_REACH = 10;
/** How far a survivor can throw their one stone. */
export const STONE_RANGE = TILE * 6;
/** How long a stone's noise lasts. */
export const NOISE_MS = 5000;
/** Zombies within this distance of a stone hear it. */
export const NOISE_HEAR_RADIUS = 560;
/** Zombies see blue sound waves from survivors closer than this. */
export const SOUND_WAVE_RADIUS = 300;
/** Knockout tournament: survivors run faster and zombies slower than in a normal match. */
export const TOURNAMENT_SURVIVOR_SPEED_MUL = 1.1;
export const TOURNAMENT_ZOMBIE_SPEED_MUL = 0.9;
/** Each knockout round is shorter than a classic match. */
export const TOURNAMENT_ROUND_SEC = 180;
/** Players at the start of a knockout run (8 → 4 → 2). */
export const KNOCKOUT_SIZE = 8;

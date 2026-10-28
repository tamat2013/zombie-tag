import type { AbilityId, BotDifficulty, GameMap, GameMode, MatchResult, Role, TaskType } from '../types.ts';
import { T } from '../types.ts';
import { ABILITIES, AbilityManager, DEFAULT_LOADOUT, buildModifiers } from './abilities.ts';
import type { AbilityWorld } from './abilities.ts';
import { updateBot } from './bots.ts';
import type { BotWorld } from './bots.ts';
import {
  CLASSIC_DURATION_SEC,
  DOCTOR_COUNT,
  HEAL_REACH,
  INFECT_FREEZE_MS,
  INFECT_REACH,
  MUD_SLOW,
  NOISE_MS,
  SOUND_WAVE_RADIUS,
  STONE_RANGE,
  PLAYER_RADIUS,
  SAW_PERIOD_SEC,
  SAW_RADIUS,
  SURVIVOR_SPEED,
  SURVIVOR_VISION,
  TASK_USE_RANGE,
  TRAINING_DURATION_SEC,
  ZOMBIE_SPEED,
  ZOMBIE_VISION,
} from './constants.ts';
import { EFFECT_KEYS, emptyEffects, isActive } from './entities.ts';
import type { EffectKey, EnginePlayer, Noise, RosterEntry } from './entities.ts';
import {
  getSaws,
  getSpawns,
  getTaskStations,
  hasLineOfSight,
  isSolid,
  moveWithCollision,
  sawPosition,
  tileAt,
  tileCenter,
  toTile,
} from './map.ts';
import type { Saw, TaskStation, Vec } from './map.ts';

export type EngineEvent =
  | { type: 'infected'; victimId: string; byId: string | null }
  | { type: 'cured'; playerId: string; byId: string }
  | { type: 'blocked'; playerId: string }
  | { type: 'task'; playerId: string; taskType: TaskType }
  | { type: 'ability'; playerId: string; ability: AbilityId }
  | { type: 'checkpoint'; playerId: string }
  | { type: 'hazard'; playerId: string }
  | { type: 'finish'; playerId: string; timeMs: number }
  | { type: 'stone'; playerId: string; x: number; y: number }
  | { type: 'released' }
  | { type: 'end'; winner: Role | 'finish' };

export interface OutgoingBuff {
  targetId: string;
  kind: 'shield' | 'cure' | 'slow';
  durationMs: number;
  fromId: string;
}

/** Compact per-player network packet. Effects are sent as remaining milliseconds. */
export interface NetPlayerState {
  x: number;
  y: number;
  f: number;
  r: 's' | 'z';
  e?: Partial<Record<EffectKey, number>>;
  t: number;
  i: number;
  ib?: string | null;
  ia?: number | null;
  it?: boolean;
  /** 1 while the player is a doctor who can still heal. */
  d?: 0 | 1;
  /** Stone used, and the active noise as [x, y, ms left]. */
  su?: 0 | 1;
  n?: [number, number, number] | null;
}

export interface EngineConfig {
  map: GameMap;
  mode: GameMode;
  roster: RosterEntry[];
  localId: string;
  /** True when this client simulates bots and decides the match result. */
  isAuthority: boolean;
  startTime: number;
  durationSec?: number;
  difficulty?: BotDifficulty;
  /** Zombies are held at spawn this long so survivors can scatter. */
  releaseDelaySec?: number;
  seed?: number;
}

export interface MoveInput {
  x: number;
  y: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameEngine implements AbilityWorld, BotWorld {
  map: GameMap;
  mode: GameMode;
  players: EnginePlayer[] = [];
  stations: TaskStation[];
  saws: Saw[];
  sawPositions: Vec[] = [];
  localId: string;
  isAuthority: boolean;
  startTime: number;
  endsAt: number;
  releaseAt: number;
  now: number;
  cooldownScale: number;
  ended: { winner: Role | 'finish'; at: number } | null = null;
  events: EngineEvent[] = [];
  outbox: OutgoingBuff[] = [];
  rng: () => number;
  private released = false;
  private survivorSpawnIndex = 0;

  constructor(cfg: EngineConfig) {
    this.map = cfg.map;
    this.mode = cfg.mode;
    this.localId = cfg.localId;
    this.isAuthority = cfg.isAuthority;
    this.startTime = cfg.startTime;
    this.now = cfg.startTime;
    this.rng = mulberry32(cfg.seed ?? Math.floor(Math.random() * 1e9));
    const duration = cfg.durationSec ?? (cfg.mode === 'training' ? TRAINING_DURATION_SEC : CLASSIC_DURATION_SEC);
    this.endsAt = cfg.mode === 'obstacle' ? Infinity : cfg.startTime + duration * 1000;
    const releaseDelay = cfg.releaseDelaySec ?? (cfg.mode === 'obstacle' ? 0 : 5);
    this.releaseAt = cfg.startTime + releaseDelay * 1000;
    this.cooldownScale = cfg.mode === 'training' ? 0.5 : 1;
    this.stations = cfg.mode === 'obstacle' ? [] : getTaskStations(cfg.map);
    this.saws = getSaws(cfg.map);

    const sSpawns = getSpawns(cfg.map, T.SURVIVOR_SPAWN);
    const zSpawns = getSpawns(cfg.map, T.ZOMBIE_SPAWN);
    let zi = 0;
    for (const r of cfg.roster) {
      const spawn = r.role === 'zombie' && cfg.mode !== 'obstacle' ? zSpawns[zi++ % zSpawns.length] : sSpawns[this.survivorSpawnIndex++ % sSpawns.length];
      // Spread players sharing a spawn tile so they don't stack.
      const jitter = (n: number) => ((n % 3) - 1) * 10;
      const idx = cfg.roster.indexOf(r);
      const mods = buildModifiers(r.skin, r.upgrades);
      const control = r.id === cfg.localId ? 'local' : r.isBot && cfg.isAuthority ? 'ai' : 'remote';
      this.players.push({
        id: r.id,
        name: r.name,
        isBot: r.isBot,
        control,
        role: r.role,
        startRole: r.role,
        x: spawn.x + jitter(idx),
        y: spawn.y + jitter(Math.floor(idx / 3)),
        vx: 0,
        vy: 0,
        facing: 0,
        skin: r.skin,
        outfit: r.outfit ?? null,
        loadout: r.loadout ?? DEFAULT_LOADOUT,
        cooldowns: {},
        effects: emptyEffects(),
        mods,
        tankShieldAvailable: mods.tankShield,
        completedStations: [],
        tasksByType: {},
        infections: 0,
        infectedAt: null,
        infectedBy: null,
        doctor: false,
        stoneUsed: false,
        noise: null,
        inTask: false,
        abilitiesUsed: 0,
        lastNetUpdate: cfg.startTime,
        checkpoint: { x: spawn.x, y: spawn.y },
        finishedAt: null,
        deaths: 0,
        respawnUntil: 0,
        difficulty: cfg.difficulty ?? 'normal',
      });
    }
    if (cfg.mode !== 'obstacle') this.pickDoctors(cfg.seed);
  }

  /** Same doctors on every client: survivors sorted by id, shuffled with the shared seed. */
  private pickDoctors(seed: number | undefined) {
    const rng = mulberry32((seed ?? Math.floor(Math.random() * 1e9)) ^ 0x5eed);
    const survivors = this.players.filter((p) => p.role === 'survivor').sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (let i = survivors.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [survivors[i], survivors[j]] = [survivors[j], survivors[i]];
    }
    for (const p of survivors.slice(0, DOCTOR_COUNT)) p.doctor = true;
  }

  /** A freshly infected player stays frozen for a few seconds, waiting for a doctor. */
  isFrozen(p: EnginePlayer, now = this.now): boolean {
    return p.role === 'zombie' && p.infectedAt !== null && now - p.infectedAt < INFECT_FREEZE_MS;
  }

  /** Milliseconds left until a frozen zombie can move (0 when not frozen). */
  frozenLeftMs(p: EnginePlayer): number {
    return this.isFrozen(p) ? INFECT_FREEZE_MS - (this.now - p.infectedAt!) : 0;
  }

  get local(): EnginePlayer | undefined {
    return this.players.find((p) => p.id === this.localId);
  }

  getPlayer(id: string): EnginePlayer | undefined {
    return this.players.find((p) => p.id === id);
  }

  get timeLeftMs(): number {
    return Math.max(0, this.endsAt - this.now);
  }

  get elapsedMs(): number {
    return this.now - this.startTime;
  }

  get zombiesReleased(): boolean {
    return this.now >= this.releaseAt;
  }

  counts(): { survivors: number; zombies: number } {
    let survivors = 0;
    let zombies = 0;
    for (const p of this.players) p.role === 'survivor' ? survivors++ : zombies++;
    return { survivors, zombies };
  }

  visionRadius(p: EnginePlayer): number {
    return (p.role === 'survivor' ? SURVIVOR_VISION : ZOMBIE_VISION) * p.mods.vision;
  }

  /** Whether `viewer` can currently see `target` (used for rendering, fog and bot AI). */
  canSee(viewer: EnginePlayer, target: EnginePlayer, now: number): boolean {
    if (viewer === target) return true;
    const d = Math.hypot(viewer.x - target.x, viewer.y - target.y);
    if (viewer.role === target.role) return d <= this.visionRadius(viewer) * 1.4;
    if (viewer.role === 'survivor') {
      if (isActive(viewer, 'scan', now)) return true;
      return d <= this.visionRadius(viewer) && hasLineOfSight(this.map, viewer, target);
    }
    // Zombie looking at a survivor.
    if (isActive(target, 'invisible', now)) return d < PLAYER_RADIUS * 3;
    if (isActive(viewer, 'vision', now)) return true;
    const radius = this.visionRadius(viewer) * target.mods.detectability;
    return d <= radius && hasLineOfSight(this.map, viewer, target);
  }

  speedOf(p: EnginePlayer): number {
    let s = (p.role === 'survivor' ? SURVIVOR_SPEED : ZOMBIE_SPEED) * p.mods.speed;
    if (isActive(p, 'sprint', this.now)) s *= 1.6;
    if (isActive(p, 'dash', this.now)) s *= 2.1;
    if (isActive(p, 'slowed', this.now)) s *= 0.5;
    if (tileAt(this.map, toTile(p.x), toTile(p.y)) === T.MUD) s *= MUD_SLOW;
    return s;
  }

  canMove(p: EnginePlayer): boolean {
    if (p.inTask || this.ended) return false;
    if (p.respawnUntil > this.now) return false;
    if (this.isFrozen(p)) return false;
    if (p.role === 'zombie' && p.startRole === 'zombie' && !this.zombiesReleased) return false;
    if (this.mode === 'obstacle' && p.finishedAt !== null) return false;
    return true;
  }

  private movePlayer(p: EnginePlayer, input: MoveInput, dt: number) {
    let { x: ix, y: iy } = input;
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    if (!this.canMove(p) || mag < 0.05) {
      p.vx = 0;
      p.vy = 0;
      return;
    }
    const speed = this.speedOf(p);
    p.vx = ix * speed;
    p.vy = iy * speed;
    p.facing = Math.atan2(iy, ix);
    moveWithCollision(this.map, p, p.vx * dt, p.vy * dt);
  }

  // ---- AbilityWorld / BotWorld -------------------------------------------------------------

  /** Applies a buff to a target this client owns, or queues it for the network. */
  applyEffect(target: EnginePlayer, kind: 'shield' | 'cure' | 'slow', durationMs: number, from: EnginePlayer) {
    if (target.control === 'remote') {
      this.outbox.push({ targetId: target.id, kind, durationMs, fromId: from.id });
      return;
    }
    this.applyBuff(target.id, kind, durationMs, from.id);
  }

  /** Called for buffs that arrive from the network or from local abilities. */
  applyBuff(targetId: string, kind: 'shield' | 'cure' | 'slow', durationMs: number, fromId: string) {
    const t = this.getPlayer(targetId);
    if (!t || t.control === 'remote') return;
    if (kind === 'shield' && t.role === 'survivor') t.effects.shield = Math.max(t.effects.shield, this.now + durationMs);
    if (kind === 'slow' && t.role === 'survivor' && !isActive(t, 'shield', this.now)) t.effects.slowed = this.now + durationMs;
    if (kind === 'cure') this.cure(t, fromId);
  }

  private cure(t: EnginePlayer, byId: string) {
    if (!this.isFrozen(t) || t.startRole !== 'survivor') return;
    t.role = 'survivor';
    t.infectedAt = null;
    t.infectedBy = null;
    // A doctor healed by another doctor can no longer heal.
    t.doctor = false;
    t.effects = emptyEffects();
    t.effects.shield = this.now + 2000;
    t.brain = undefined;
    this.events.push({ type: 'cured', playerId: t.id, byId });
  }

  activateAbility(p: EnginePlayer, id: AbilityId): void {
    if (AbilityManager.activate(this, p, id, this.now)) this.events.push({ type: 'ability', playerId: p.id, ability: id });
  }

  completeTask(p: EnginePlayer, stationIndex: number): void {
    if (p.role !== 'survivor' || p.completedStations.includes(stationIndex)) return;
    const s = this.stations[stationIndex];
    if (!s) return;
    p.completedStations.push(stationIndex);
    p.tasksByType[s.type] = (p.tasksByType[s.type] ?? 0) + 1;
    p.inTask = false;
    this.events.push({ type: 'task', playerId: p.id, taskType: s.type });
  }

  // ---- Stone -------------------------------------------------------------------------------

  canThrowStone(p: EnginePlayer): boolean {
    return this.mode !== 'obstacle' && !this.ended && p.role === 'survivor' && !p.stoneUsed && !p.inTask && this.now >= this.startTime;
  }

  /** Throws the player's one stone along `angle` (default: facing); it stops before walls. */
  throwStone(p: EnginePlayer, angle = p.facing): boolean {
    if (!this.canThrowStone(p)) return false;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let x = p.x;
    let y = p.y;
    for (let d = 8; d <= STONE_RANGE; d += 8) {
      const nx = p.x + dx * d;
      const ny = p.y + dy * d;
      if (isSolid(tileAt(this.map, toTile(nx), toTile(ny)))) break;
      x = nx;
      y = ny;
    }
    p.stoneUsed = true;
    p.noise = { x, y, at: this.now, until: this.now + NOISE_MS };
    this.events.push({ type: 'stone', playerId: p.id, x, y });
    return true;
  }

  /** Stone noises that are still sounding. */
  activeNoises(): (Noise & { by: string })[] {
    const out: (Noise & { by: string })[] = [];
    for (const p of this.players) if (p.noise && p.noise.until > this.now) out.push({ ...p.noise, by: p.id });
    return out;
  }

  /** Survivors close enough to a zombie that it "hears" them (drawn as blue sound waves). */
  heardSurvivors(z: EnginePlayer): EnginePlayer[] {
    if (z.role !== 'zombie') return [];
    return this.players.filter(
      (o) =>
        o.role === 'survivor' &&
        !isActive(o, 'invisible', this.now) &&
        Math.hypot(o.x - z.x, o.y - z.y) <= SOUND_WAVE_RADIUS * o.mods.detectability,
    );
  }

  // ---- Local player API ---------------------------------------------------------------------

  useStone(): boolean {
    const p = this.local;
    return !!p && this.throwStone(p);
  }

  useAbility(id: AbilityId): boolean {
    const p = this.local;
    if (!p || this.ended) return false;
    const before = p.abilitiesUsed;
    this.activateAbility(p, id);
    return p.abilitiesUsed > before;
  }

  suggestedAbility(): AbilityId | null {
    const p = this.local;
    return p ? AbilityManager.suggest(this, p, this.now) : null;
  }

  /** Station the local player is standing next to and hasn't completed yet. */
  usableStation(): TaskStation | null {
    const p = this.local;
    if (!p || p.role !== 'survivor' || this.ended) return null;
    let best: TaskStation | null = null;
    let bestD = TASK_USE_RANGE;
    for (const s of this.stations) {
      if (p.completedStations.includes(s.index)) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d <= bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  setInTask(value: boolean) {
    const p = this.local;
    if (p) p.inTask = value && p.role === 'survivor';
  }

  // ---- Infection ----------------------------------------------------------------------------

  private infect(victim: EnginePlayer, by: EnginePlayer | null) {
    if (victim.role !== 'survivor') return;
    if (isActive(victim, 'shield', this.now)) return;
    if (victim.tankShieldAvailable) {
      victim.tankShieldAvailable = false;
      victim.effects.shield = this.now + 1500;
      this.events.push({ type: 'blocked', playerId: victim.id });
      return;
    }
    victim.role = 'zombie';
    victim.inTask = false;
    victim.infectedAt = this.now;
    victim.infectedBy = by?.id ?? null;
    victim.effects = emptyEffects();
    victim.brain = undefined;
    if (by && by.control !== 'remote') by.infections++;
    this.events.push({ type: 'infected', victimId: victim.id, byId: by?.id ?? null });
  }

  private checkInfections() {
    if (this.mode === 'obstacle') return;
    for (const victim of this.players) {
      if (victim.role !== 'survivor' || victim.control === 'remote') continue;
      for (const z of this.players) {
        if (z.role !== 'zombie') continue;
        if (z.startRole === 'zombie' && !this.zombiesReleased) continue;
        if (this.isFrozen(z)) continue;
        const reach = PLAYER_RADIUS * 2 + INFECT_REACH * z.mods.reach * 2;
        if (Math.hypot(victim.x - z.x, victim.y - z.y) <= reach) {
          this.infect(victim, z);
          break;
        }
      }
    }
  }

  /** Doctors heal frozen zombies by touching them. Checked by whoever owns the frozen player. */
  private checkCures() {
    if (this.mode === 'obstacle') return;
    for (const z of this.players) {
      if (z.control === 'remote' || !this.isFrozen(z) || z.startRole !== 'survivor') continue;
      const doc = this.players.find(
        (d) => d.doctor && d.role === 'survivor' && Math.hypot(d.x - z.x, d.y - z.y) <= PLAYER_RADIUS * 2 + HEAL_REACH,
      );
      if (doc) this.cure(z, doc.id);
    }
  }

  // ---- Obstacle course ----------------------------------------------------------------------

  private obstacleInteractions(p: EnginePlayer) {
    if (p.finishedAt !== null || p.respawnUntil > this.now) return;
    const tile = tileAt(this.map, toTile(p.x), toTile(p.y));
    if (tile === T.CHECKPOINT) {
      const cx = toTile(p.x);
      const cy = toTile(p.y);
      if (toTile(p.checkpoint.x) !== cx || toTile(p.checkpoint.y) !== cy) {
        p.checkpoint = tileCenter(cx, cy);
        this.events.push({ type: 'checkpoint', playerId: p.id });
      }
    }
    if (tile === T.FINISH) {
      p.finishedAt = this.now;
      this.events.push({ type: 'finish', playerId: p.id, timeMs: this.now - this.startTime });
      return;
    }
    const hitSaw = this.sawPositions.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < SAW_RADIUS + PLAYER_RADIUS - 4);
    if (tile === T.HAZARD || hitSaw) {
      p.deaths++;
      p.x = p.checkpoint.x;
      p.y = p.checkpoint.y;
      p.respawnUntil = this.now + 700;
      p.effects = emptyEffects();
      this.events.push({ type: 'hazard', playerId: p.id });
    }
  }

  // ---- Networking ---------------------------------------------------------------------------

  serialize(p: EnginePlayer): NetPlayerState {
    const e: Partial<Record<EffectKey, number>> = {};
    for (const k of EFFECT_KEYS) {
      const rem = p.effects[k] - this.now;
      if (rem > 0) e[k] = Math.round(rem);
    }
    return {
      x: Math.round(p.x),
      y: Math.round(p.y),
      f: Math.round(p.facing * 100) / 100,
      r: p.role === 'survivor' ? 's' : 'z',
      e,
      t: p.completedStations.length,
      i: p.infections,
      ib: p.infectedBy,
      ia: p.infectedAt === null ? null : Math.round(this.now - p.infectedAt),
      it: p.inTask,
      d: p.doctor ? 1 : 0,
      su: p.stoneUsed ? 1 : 0,
      n: p.noise && p.noise.until > this.now ? [Math.round(p.noise.x), Math.round(p.noise.y), Math.round(p.noise.until - this.now)] : null,
    };
  }

  /** Players whose state this client publishes: itself, plus bots when authoritative. */
  ownedPlayers(): EnginePlayer[] {
    return this.players.filter((p) => p.control !== 'remote');
  }

  applyRemoteState(id: string, s: NetPlayerState) {
    const p = this.getPlayer(id);
    if (!p || p.control !== 'remote') return;
    const newRole: Role = s.r === 's' ? 'survivor' : 'zombie';
    if (p.role === 'survivor' && newRole === 'zombie') {
      p.infectedAt = this.now - (s.ia ?? 0);
      p.infectedBy = s.ib ?? null;
      const by = s.ib ? this.getPlayer(s.ib) : undefined;
      if (by && by.control !== 'remote') by.infections++;
      this.events.push({ type: 'infected', victimId: p.id, byId: s.ib ?? null });
    } else if (p.role === 'zombie' && newRole === 'survivor') {
      p.infectedAt = null;
      p.infectedBy = null;
    }
    p.role = newRole;
    p.netTarget = { x: s.x, y: s.y };
    p.facing = s.f;
    p.inTask = !!s.it;
    if (s.d !== undefined) p.doctor = s.d === 1;
    if (s.su) p.stoneUsed = true;
    if (s.n && !(p.noise && p.noise.until > this.now)) {
      const left = s.n[2];
      p.noise = { x: s.n[0], y: s.n[1], at: this.now - (NOISE_MS - left), until: this.now + left };
      this.events.push({ type: 'stone', playerId: p.id, x: s.n[0], y: s.n[1] });
    }
    p.effects = emptyEffects();
    for (const k of EFFECT_KEYS) if (s.e?.[k]) p.effects[k] = this.now + s.e[k]!;
    p.infections = Math.max(p.infections, s.i);
    while (p.completedStations.length < s.t) p.completedStations.push(-1 - p.completedStations.length);
    p.lastNetUpdate = this.now;
  }

  removePlayer(id: string) {
    this.players = this.players.filter((p) => p.id !== id);
  }

  /** Forces the result, e.g. when the host announces the end of a networked match. */
  forceEnd(winner: Role | 'finish') {
    if (this.ended) return;
    this.ended = { winner, at: this.now };
    this.events.push({ type: 'end', winner });
  }

  // ---- Main loop ----------------------------------------------------------------------------

  update(now: number, input: MoveInput) {
    const dt = Math.min(0.05, Math.max(0, (now - this.now) / 1000));
    this.now = now;
    if (this.ended) return;

    if (!this.released && this.zombiesReleased) {
      this.released = true;
      if (this.mode !== 'obstacle') this.events.push({ type: 'released' });
    }

    const t = (now - this.startTime) / 1000;
    this.sawPositions = this.saws.map((s) => sawPosition(s, t, SAW_PERIOD_SEC));

    for (const p of this.players) {
      if (p.control === 'local') this.movePlayer(p, input, dt);
      else if (p.control === 'ai') this.movePlayer(p, updateBot(this, p, now), dt);
      else if (p.netTarget) {
        const dx = p.netTarget.x - p.x;
        const dy = p.netTarget.y - p.y;
        if (Math.hypot(dx, dy) > 160) {
          p.x = p.netTarget.x;
          p.y = p.netTarget.y;
        } else {
          const k = Math.min(1, dt * 12);
          p.x += dx * k;
          p.y += dy * k;
        }
      }
      if (this.mode === 'obstacle' && p.control !== 'remote') this.obstacleInteractions(p);
    }

    this.checkCures();
    this.checkInfections();
    this.checkEnd();
  }

  private checkEnd() {
    if (this.ended) return;
    if (this.mode === 'obstacle') {
      const local = this.local;
      if (local && local.finishedAt !== null) this.forceEnd('finish');
      return;
    }
    const { survivors, zombies } = this.counts();
    if (survivors === 0) this.forceEnd('zombie');
    else if (this.now >= this.endsAt) this.forceEnd('survivor');
    else if (zombies === 0 && this.zombiesReleased) this.forceEnd('survivor');
  }

  drainEvents(): EngineEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  drainOutbox(): OutgoingBuff[] {
    const o = this.outbox;
    this.outbox = [];
    return o;
  }

  /** Builds the local player's match summary. */
  result(tournamentId?: string): MatchResult {
    const p = this.local!;
    const winner = this.ended?.winner ?? 'none';
    const durationSec = Math.round(((this.ended?.at ?? this.now) - this.startTime) / 1000);
    const survivedUntil = p.infectedAt ?? this.ended?.at ?? this.now;
    const secondsSurvived = p.startRole === 'survivor' ? Math.max(0, Math.round((survivedUntil - this.startTime) / 1000)) : 0;
    let won = false;
    if (winner === 'finish') won = true;
    else if (winner === 'survivor') won = p.role === 'survivor';
    else if (winner === 'zombie') won = p.role === 'zombie';
    return {
      mode: this.mode,
      mapId: this.map.id,
      won,
      winner,
      finalRole: p.role,
      startRole: p.startRole,
      tasks: p.completedStations.filter((i) => i >= 0).length,
      tasksByType: { ...p.tasksByType },
      infections: p.infections,
      secondsSurvived,
      abilitiesUsed: p.abilitiesUsed,
      durationSec,
      obstacleTimeMs: p.finishedAt !== null ? p.finishedAt - this.startTime : undefined,
      tournamentId,
    };
  }
}

/** Picks starting zombies: roughly one per five players, at least one. */
export function assignRoles(ids: string[], rng: () => number = Math.random, forceZombie?: string): Record<string, Role> {
  const zombieCount = Math.max(1, Math.round(ids.length / 5));
  const shuffled = [...ids].sort(() => rng() - 0.5);
  const zombies = new Set(shuffled.slice(0, zombieCount));
  if (forceZombie && ids.includes(forceZombie) && !zombies.has(forceZombie)) {
    zombies.delete(shuffled[0]);
    zombies.add(forceZombie);
  }
  return Object.fromEntries(ids.map((id) => [id, zombies.has(id) ? 'zombie' : 'survivor']));
}

export { ABILITIES };

// Daily and weekly missions. Progress = current lifetime stat minus a baseline captured when
// the mission period started, so no per-event bookkeeping is needed.
import type { PlayerStats, Profile, StatKey } from '../types.ts';

export type MissionPeriod = 'daily' | 'weekly';

export interface MissionDef {
  id: string;
  title: string;
  stat: StatKey;
  target: number;
  coins: number;
  xp: number;
  icon: string;
}

export const DAILY_POOL: MissionDef[] = [
  { id: 'd_play3', title: 'שחק 3 משחקים', stat: 'matchesPlayed', target: 3, coins: 60, xp: 80, icon: '🎮' },
  { id: 'd_win1', title: 'נצח משחק אחד', stat: 'wins', target: 1, coins: 80, xp: 100, icon: '🏅' },
  { id: 'd_tasks5', title: 'השלם 5 משימות', stat: 'tasksCompleted', target: 5, coins: 60, xp: 90, icon: '🔧' },
  { id: 'd_infect3', title: 'הדבק 3 שורדים', stat: 'infections', target: 3, coins: 70, xp: 90, icon: '🧟' },
  { id: 'd_wires2', title: 'חבר חוטים פעמיים', stat: 'wiresTasks', target: 2, coins: 50, xp: 60, icon: '🔌' },
  { id: 'd_temp2', title: 'בדוק טמפרטורה פעמיים', stat: 'temperatureTasks', target: 2, coins: 50, xp: 60, icon: '🌡️' },
  { id: 'd_trash2', title: 'זרוק אשפה פעמיים', stat: 'trashTasks', target: 2, coins: 50, xp: 60, icon: '🗑️' },
  { id: 'd_survive5', title: 'שרוד 5 דקות מצטבר', stat: 'secondsSurvived', target: 300, coins: 70, xp: 90, icon: '⏱️' },
  { id: 'd_abilities5', title: 'השתמש ב-5 יכולות', stat: 'abilitiesUsed', target: 5, coins: 50, xp: 70, icon: '✨' },
  { id: 'd_obstacle1', title: 'רוץ במסלול מכשולים', stat: 'obstacleRuns', target: 1, coins: 40, xp: 60, icon: '🏃' },
];

export const WEEKLY_POOL: MissionDef[] = [
  { id: 'w_play15', title: 'שחק 15 משחקים', stat: 'matchesPlayed', target: 15, coins: 300, xp: 400, icon: '🎮' },
  { id: 'w_win5', title: 'נצח 5 משחקים', stat: 'wins', target: 5, coins: 350, xp: 450, icon: '🏆' },
  { id: 'w_tasks30', title: 'השלם 30 משימות', stat: 'tasksCompleted', target: 30, coins: 300, xp: 400, icon: '⚙️' },
  { id: 'w_infect20', title: 'הדבק 20 שורדים', stat: 'infections', target: 20, coins: 350, xp: 450, icon: '☣️' },
  { id: 'w_machine5', title: 'תקן 5 מכונות', stat: 'machineTasks', target: 5, coins: 250, xp: 300, icon: '🛠️' },
  { id: 'w_download5', title: 'הורד נתונים 5 פעמים', stat: 'downloadTasks', target: 5, coins: 250, xp: 300, icon: '💾' },
  { id: 'w_tournament3', title: 'שחק 3 משחקי טורניר', stat: 'tournamentMatches', target: 3, coins: 400, xp: 400, icon: '⚔️' },
  { id: 'w_gold1', title: 'השג זהב במסלול מכשולים', stat: 'obstacleGolds', target: 1, coins: 300, xp: 350, icon: '🥇' },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pick of `count` missions for a period key: every player sees the same set. */
export function pickMissions(pool: MissionDef[], key: string, count: number): MissionDef[] {
  const scored = pool.map((m) => ({ m, s: hashString(key + m.id) }));
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, count).map((x) => x.m);
}

export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Week key that rolls over on Sunday 00:00 local time. */
export function weekKey(now: number): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return `W${dayKey(d.getTime())}`;
}

export function nextDailyReset(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export function nextWeeklyReset(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 7);
  return d.getTime();
}

export function currentMissions(now: number): { daily: MissionDef[]; weekly: MissionDef[] } {
  return { daily: pickMissions(DAILY_POOL, dayKey(now), 3), weekly: pickMissions(WEEKLY_POOL, weekKey(now), 3) };
}

/** Starts a new mission period (fresh baseline) when the day or week has changed. */
export function ensureMissions(p: Profile, now: number): Profile {
  const dk = dayKey(now);
  const wk = weekKey(now);
  if (p.missions.dailyKey === dk && p.missions.weeklyKey === wk) return p;
  const m = { ...p.missions };
  if (m.dailyKey !== dk) {
    m.dailyKey = dk;
    m.dailyBaseline = { ...p.stats };
    m.dailyClaimed = [];
  }
  if (m.weeklyKey !== wk) {
    m.weeklyKey = wk;
    m.weeklyBaseline = { ...p.stats };
    m.weeklyClaimed = [];
  }
  return { ...p, missions: m };
}

export function missionProgress(p: Profile, m: MissionDef, period: MissionPeriod): number {
  const base: PlayerStats = period === 'daily' ? p.missions.dailyBaseline : p.missions.weeklyBaseline;
  return Math.max(0, Math.min(m.target, p.stats[m.stat] - (base[m.stat] ?? 0)));
}

export function isClaimed(p: Profile, m: MissionDef, period: MissionPeriod): boolean {
  return (period === 'daily' ? p.missions.dailyClaimed : p.missions.weeklyClaimed).includes(m.id);
}

export function claimMission(p: Profile, m: MissionDef, period: MissionPeriod): Profile | null {
  if (isClaimed(p, m, period) || missionProgress(p, m, period) < m.target) return null;
  const missions = { ...p.missions };
  if (period === 'daily') missions.dailyClaimed = [...missions.dailyClaimed, m.id];
  else missions.weeklyClaimed = [...missions.weeklyClaimed, m.id];
  return { ...p, missions, coins: p.coins + m.coins, xp: p.xp + m.xp };
}

export function claimableCount(p: Profile, now: number): number {
  const { daily, weekly } = currentMissions(now);
  const c = (list: MissionDef[], period: MissionPeriod) =>
    list.filter((m) => !isClaimed(p, m, period) && missionProgress(p, m, period) >= m.target).length;
  return c(daily, 'daily') + c(weekly, 'weekly');
}

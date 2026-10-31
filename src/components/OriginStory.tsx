// "How it started" cut-scene played before the role reveal: shows how the starting
// zombie(s) got infected. Driven by the time left, so every client sees the same frame.
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text as RNText, View, useWindowDimensions } from 'react-native';
import { Text } from '../i18n/Text';
import type { Skin } from '../types';
import { Character } from './Character';
import { Glyph } from './Icon';
import { colors, fonts } from '../theme';
import { playSfx } from '../services/sound';

export interface PatientZero {
  id: string;
  name: string;
  skin: Skin;
  outfit?: string | null;
}

interface Story {
  /** The thing that infects patient zero. */
  cause: string;
  /** How the cause travels: falls from above, flies in from the side, or creeps along the floor. */
  path: 'fall' | 'fly' | 'creep' | 'cloud';
  place: string;
  what: string;
  /** Background tint of the scene. */
  tint: string;
}

const STORIES: Story[] = [
  { cause: '🧪', path: 'fall', place: 'Lab 3 · 02:14 AM', what: 'A test tube slips and shatters...', tint: '#14210f' },
  { cause: '🐀', path: 'creep', place: 'The basement · 11:47 PM', what: 'Something crawls out of the vents...', tint: '#1d1610' },
  { cause: '☄️', path: 'fall', place: 'The parking lot · 04:03 AM', what: 'A glowing rock falls from the sky...', tint: '#1a1022' },
  { cause: '🥫', path: 'fall', place: 'The cafeteria · 12:30 PM', what: 'That can of beans expired in 1987...', tint: '#221a0e' },
  { cause: '🦇', path: 'fly', place: 'The rooftop · 03:33 AM', what: 'A bat flies in through a broken window...', tint: '#120f1c' },
  { cause: '🦟', path: 'fly', place: 'The swamp camp · 07:20 PM', what: 'One tiny bite. No big deal... right?', tint: '#10201a' },
  { cause: '🍄', path: 'cloud', place: 'The greenhouse · 09:12 AM', what: 'Strange spores drift through the air...', tint: '#18200d' },
  { cause: '💉', path: 'fall', place: 'Clinic · Trial day 1', what: 'The new vaccine has side effects...', tint: '#0f1a22' },
  { cause: '🛢️', path: 'creep', place: 'The sewers · 01:05 AM', what: 'A barrel of green goo starts to leak...', tint: '#132012' },
  { cause: '🐍', path: 'creep', place: 'The zoo · 05:50 PM', what: 'The reptile house door was left open...', tint: '#1b1d0f' },
];

export function storyFor(seed: number): Story {
  return STORIES[Math.abs(Math.floor(seed)) % STORIES.length];
}

interface Props {
  zombies: PatientZero[];
  seed: number;
  /** Milliseconds left in the story. */
  msLeft: number;
  totalMs: number;
  localIsZombie: boolean;
  localId: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** 0→1 progress of t inside [a, b]. */
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (v: number) => 1 - (1 - v) * (1 - v);

export function OriginStory({ zombies, seed, msLeft, totalMs, localIsZombie, localId }: Props) {
  const story = storyFor(seed);
  const t = clamp01(1 - msLeft / totalMs);
  const shown = zombies.slice(0, 4);
  const { height } = useWindowDimensions();
  const base = shown.length <= 1 ? 120 : shown.length === 2 ? 96 : 76;
  // Figures shrink on short screens (phone landscape) so the whole cut-scene fits without scrolling.
  const size = Math.min(base, Math.max(64, height - 270));
  const gap = size * 0.5;

  // Timeline: set the scene → the cause reaches patient zero → flash → transformation.
  const intro = easeOut(seg(t, 0, 0.14));
  const travel = seg(t, 0.16, 0.5);
  const hit = t >= 0.5;
  const flash = hit ? 1 - seg(t, 0.5, 0.62) : 0;
  const turn = seg(t, 0.52, 0.7);
  const outro = seg(t, 0.92, 1);
  const shake = hit && t < 0.68 ? Math.sin(t * 260) * 6 * (1 - turn) : 0;

  const played = useRef(false);
  useEffect(() => {
    if (hit && !played.current) {
      played.current = true;
      playSfx('infected');
      setTimeout(() => playSfx('groan', 0.8), 450);
    }
  }, [hit]);

  const many = shown.length > 1;
  const youAre = shown.some((z) => z.id === localId);

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: hit ? mixTint(story.tint, turn) : story.tint, opacity: 1 - outro * 0.6 }]}>
      <View style={[styles.stripe, { opacity: intro }]} />
      <Text style={[styles.place, { opacity: intro, transform: [{ translateY: (1 - intro) * -20 }] }]}>{story.place}</Text>
      <Text style={[styles.what, { opacity: hit ? 1 - turn : intro }]}>{story.what}</Text>

      <View style={[styles.stage, { height: size + 90, transform: [{ translateX: shake }] }]}>
        {shown.map((z, i) => {
          const bob = Math.sin(t * 40 + i) * (hit ? 2 : 3);
          // Before the hit they are scared survivors; after it they rise up as zombies.
          const scale = hit ? 1 + 0.18 * easeOut(turn) : 1;
          return (
            <View key={z.id} style={[styles.slot, { width: size + gap, opacity: intro }]}>
              <View style={{ transform: [{ translateY: bob - (hit ? 8 * turn : 0) }, { scale }] }}>
                <Character skin={z.skin} size={size} role={turn > 0.25 ? 'zombie' : 'survivor'} outfit={z.outfit} />
              </View>
              {!hit ? <Cause story={story} progress={travel} size={size} index={i} /> : null}
              {hit ? (
                <View style={[styles.splat, { opacity: flash }]}>
                  <Glyph emoji="💥" size={size * 0.5} color={colors.gold} />
                </View>
              ) : null}
              <RNText numberOfLines={1} style={[styles.name, { color: turn > 0.25 ? colors.zombie : colors.text, maxWidth: size + gap }]}>
                {z.name}
              </RNText>
            </View>
          );
        })}
      </View>

      <View style={{ minHeight: 70, alignItems: 'center', opacity: easeOut(seg(t, 0.62, 0.78)) }}>
        <Text style={styles.patient}>{many ? 'Patients zero' : 'Patient zero'}</Text>
        <Text style={styles.outbreak}>{youAre || localIsZombie ? 'It is you. Go infect them all!' : 'The outbreak has begun. Run!'}</Text>
      </View>

      {flash > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.toxic, opacity: flash * 0.55 }]} /> : null}
    </View>
  );
}

/** The thing that infects patient zero, moving toward them. */
function Cause({ story, progress, size, index }: { story: Story; progress: number; size: number; index: number }) {
  const p = easeOut(progress);
  const emoji = size * 0.42;
  let x = 0;
  let y = 0;
  let rot = 0;
  let opacity = progress > 0 ? 1 : 0;
  if (story.path === 'fall') {
    x = (1 - p) * (index % 2 ? 40 : -40);
    y = -220 * (1 - p) + size * 0.15;
    rot = p * 540;
  } else if (story.path === 'fly') {
    x = -260 * (1 - p);
    y = Math.sin(p * 18) * 26 * (1 - p) - size * 0.1;
  } else if (story.path === 'creep') {
    x = -220 * (1 - p);
    y = size * 0.45;
    rot = Math.sin(p * 30) * 8;
  } else {
    // Spores: a cloud that gathers around the character.
    opacity = p;
    x = Math.sin(p * 10 + index) * 10;
    y = -size * 0.2;
    rot = p * 90;
  }
  return (
    <View style={[styles.cause, { opacity, transform: [{ translateX: x }, { translateY: y }, { rotate: `${rot}deg` }] }]}>
      <Glyph emoji={story.cause} size={story.path === 'cloud' ? emoji * (1 + p) : emoji} color={colors.text} />
    </View>
  );
}

/** Blends the scene tint toward toxic green as the infection takes hold. */
function mixTint(hex: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = 0x1f3a10;
  const ch = (v: number, s: number) => (v >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * amount);
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', zIndex: 51, paddingHorizontal: 16 },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 10, backgroundColor: colors.gold, borderBottomWidth: 2, borderBottomColor: colors.ink },
  place: { color: colors.gold, fontFamily: fonts.black, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' },
  what: { color: colors.text, fontFamily: fonts.bold, fontSize: 20, marginTop: 8, textAlign: 'center' },
  stage: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 18, marginBottom: 10 },
  slot: { alignItems: 'center', justifyContent: 'flex-end' },
  cause: { position: 'absolute', top: 0 },
  splat: { position: 'absolute', top: '20%' },
  name: { marginTop: 6, fontFamily: fonts.extraBold, fontSize: 13, textAlign: 'center' },
  patient: { color: colors.zombie, fontFamily: fonts.logo, fontSize: 40, textAlign: 'center' },
  outbreak: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: 2, textAlign: 'center' },
});

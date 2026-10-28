// Generates every sound effect and music loop in the game from code (no recorded or licensed audio).
// Run with `node design/sound/build.js`. Output: assets/sounds/*.wav (22 kHz, mono, 16-bit).
const fs = require('node:fs');
const path = require('node:path');

const SR = 22050;
const out = path.join(__dirname, '..', '..', 'assets', 'sounds');
fs.mkdirSync(out, { recursive: true });

// ---- Building blocks -------------------------------------------------------------------------

let seed = 1;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const buffer = (sec) => new Float32Array(Math.round(sec * SR));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

const WAVES = {
  sine: (ph) => Math.sin(2 * Math.PI * ph),
  tri: (ph) => 1 - 4 * Math.abs((ph % 1) - 0.5),
  saw: (ph) => 2 * (ph % 1) - 1,
  square: (ph) => ((ph % 1) < 0.5 ? 1 : -1),
};

/**
 * Adds one note to `buf`. `freq` is a number or a function of time (seconds into the note).
 * The envelope rises over `attack`, then decays exponentially with time constant `decay`,
 * and fades to zero over `release` at the end. With `wrap`, notes past the end continue at the
 * start, which keeps music loops seamless.
 */
function tone(buf, start, dur, freq, { wave = 'sine', vol = 1, attack = 0.004, decay = Infinity, release = 0.02, vibrato = 0, wrap = false } = {}) {
  const f = typeof freq === 'function' ? freq : () => freq;
  const n = Math.round(dur * SR);
  const s0 = Math.round(start * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (f(t) * (1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t))) / SR;
    let env = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
    if (t > dur - release) env *= Math.max(0, (dur - t) / release);
    let j = s0 + i;
    if (wrap) j %= buf.length;
    else if (j >= buf.length) break;
    buf[j] += WAVES[wave](ph) * env * vol;
  }
}

/** Adds filtered noise with the same envelope options as `tone`. `cutoff` may vary over time. */
function hiss(buf, start, dur, { cutoff = 3000, high = 0, vol = 1, attack = 0.002, decay = Infinity, release = 0.02, wrap = false } = {}) {
  const c = typeof cutoff === 'function' ? cutoff : () => cutoff;
  const n = Math.round(dur * SR);
  const s0 = Math.round(start * SR);
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp += (1 - Math.exp((-2 * Math.PI * c(t)) / SR)) * (noise() - lp);
    lp2 += (1 - Math.exp((-2 * Math.PI * Math.max(high, 1)) / SR)) * (lp - lp2);
    const sample = high ? lp - lp2 : lp;
    let env = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
    if (t > dur - release) env *= Math.max(0, (dur - t) / release);
    let j = s0 + i;
    if (wrap) j %= buf.length;
    else if (j >= buf.length) break;
    buf[j] += sample * env * vol;
  }
}

/** One-pole low-pass over the whole buffer (run twice for a gentler 12 dB slope). */
function lowpass(buf, cutoff, passes = 2) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  for (let p = 0; p < passes; p++) {
    let y = buf[buf.length - 1];
    for (let i = 0; i < buf.length; i++) buf[i] = y += a * (buf[i] - y);
  }
  return buf;
}

function write(name, buf, peak = 0.9) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const gain = max ? peak / max : 1;
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * gain)) * 32767), i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(out, `${name}.wav`), Buffer.concat([head, data]));
}

// ---- Sound effects ---------------------------------------------------------------------------

const sfx = {
  // UI tap.
  click() {
    const b = buffer(0.06);
    tone(b, 0, 0.05, (t) => 1700 - t * 9000, { vol: 0.6, decay: 0.012 });
    return b;
  },
  // Survivor footsteps: two slightly different scuffs so walking does not sound mechanical.
  step1() {
    const b = buffer(0.09);
    hiss(b, 0, 0.08, { cutoff: 900, vol: 1, decay: 0.018 });
    tone(b, 0, 0.06, (t) => 140 - t * 600, { vol: 0.5, decay: 0.02 });
    return b;
  },
  step2() {
    const b = buffer(0.09);
    hiss(b, 0, 0.08, { cutoff: 1200, vol: 0.9, decay: 0.015 });
    tone(b, 0, 0.06, (t) => 120 - t * 500, { vol: 0.5, decay: 0.022 });
    return b;
  },
  // Zombie footstep: a heavy thud followed by a dragged foot.
  zstep() {
    const b = buffer(0.32);
    tone(b, 0, 0.12, (t) => 95 - t * 300, { vol: 0.9, decay: 0.04 });
    hiss(b, 0, 0.06, { cutoff: 500, vol: 0.8, decay: 0.02 });
    hiss(b, 0.08, 0.22, { cutoff: (t) => 700 + t * 1500, high: 250, vol: 0.35, attack: 0.05, decay: 0.08 });
    return b;
  },
  // Heartbeat when a zombie is close (lub-dub).
  heartbeat() {
    const b = buffer(0.5);
    tone(b, 0, 0.18, (t) => 75 - t * 120, { vol: 1, decay: 0.05 });
    tone(b, 0.17, 0.18, (t) => 65 - t * 110, { vol: 0.75, decay: 0.05 });
    return lowpass(b, 400, 1);
  },
  // Zombie moan.
  groan() {
    const b = buffer(1.3);
    const f = (t) => 92 + 10 * Math.sin(2 * Math.PI * 0.8 * t) - t * 14;
    tone(b, 0, 1.25, f, { wave: 'saw', vol: 0.7, attack: 0.25, release: 0.45, vibrato: 0.04 });
    tone(b, 0, 1.25, (t) => f(t) * 2.02, { wave: 'saw', vol: 0.3, attack: 0.3, release: 0.45 });
    hiss(b, 0, 1.25, { cutoff: 700, vol: 0.25, attack: 0.2, release: 0.5 });
    return lowpass(b, 650);
  },
  // A zombie catches someone: crunch and growl.
  bite() {
    const b = buffer(0.7);
    for (let k = 0; k < 5; k++) hiss(b, k * 0.022, 0.03, { cutoff: 3500, vol: 0.9 - k * 0.12, decay: 0.008 });
    tone(b, 0.04, 0.6, (t) => 150 - t * 120, { wave: 'saw', vol: 0.7, attack: 0.04, release: 0.25, vibrato: 0.08 });
    return lowpass(b, 1600, 1);
  },
  // You were infected: a falling, out-of-tune sting.
  infected() {
    const b = buffer(1.3);
    tone(b, 0, 1.2, (t) => 330 * 2 ** (-t * 1.2), { wave: 'saw', vol: 0.5, release: 0.5 });
    tone(b, 0, 1.2, (t) => 349 * 2 ** (-t * 1.25), { wave: 'saw', vol: 0.5, release: 0.5 });
    tone(b, 0, 0.6, (t) => 70 - t * 50, { vol: 1, decay: 0.2 });
    return lowpass(b, 1400);
  },
  // A doctor heals someone: rising bells.
  heal() {
    const b = buffer(0.9);
    [72, 76, 79, 84].forEach((n, i) => {
      tone(b, i * 0.08, 0.6, midi(n), { vol: 0.5, decay: 0.18 });
      tone(b, i * 0.08, 0.4, midi(n) * 3, { vol: 0.12, decay: 0.08 });
    });
    return b;
  },
  // A shield blocked an infection: metallic clang.
  shield() {
    const b = buffer(0.7);
    [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(b, 0, 0.65, 620 * m, { vol: 0.5 / (i + 1), decay: 0.25 / (i + 1) }));
    hiss(b, 0, 0.03, { cutoff: 6000, vol: 0.4, decay: 0.006 });
    return b;
  },
  // Task done.
  task() {
    const b = buffer(0.45);
    tone(b, 0, 0.18, midi(76), { wave: 'tri', vol: 0.6, decay: 0.08 });
    tone(b, 0.1, 0.33, midi(83), { wave: 'tri', vol: 0.6, decay: 0.12 });
    return b;
  },
  checkpoint() {
    const b = buffer(0.7);
    [72, 76, 79].forEach((n) => tone(b, 0, 0.3, midi(n), { wave: 'tri', vol: 0.35, decay: 0.12 }));
    tone(b, 0.15, 0.5, midi(84), { wave: 'tri', vol: 0.5, decay: 0.18 });
    return b;
  },
  // Hit a hazard.
  hurt() {
    const b = buffer(0.35);
    tone(b, 0, 0.3, (t) => 260 - t * 500, { wave: 'square', vol: 0.5, decay: 0.12 });
    hiss(b, 0, 0.1, { cutoff: 2500, vol: 0.5, decay: 0.03 });
    return lowpass(b, 2400, 1);
  },
  // Stone leaves your hand.
  throw() {
    const b = buffer(0.4);
    hiss(b, 0, 0.38, { cutoff: (t) => 500 + 2600 * Math.sin((Math.PI * t) / 0.38), high: 300, vol: 1, attack: 0.12, release: 0.2 });
    return b;
  },
  // Stone lands and bounces twice.
  stoneHit() {
    const b = buffer(0.45);
    [0, 0.13, 0.22].forEach((s, i) => {
      const v = [1, 0.5, 0.25][i];
      tone(b, s, 0.08, (t) => 220 - t * 1200, { vol: v, decay: 0.02 });
      hiss(b, s, 0.03, { cutoff: 4000, vol: v * 0.7, decay: 0.006 });
    });
    return b;
  },
  // Zombies are released: a siren.
  released() {
    const b = buffer(1.8);
    tone(b, 0, 1.75, (t) => 520 + 180 * Math.sin(2 * Math.PI * 1.4 * t - Math.PI / 2), { wave: 'saw', vol: 0.5, attack: 0.08, release: 0.4 });
    tone(b, 0, 1.75, (t) => 260 + 90 * Math.sin(2 * Math.PI * 1.4 * t - Math.PI / 2), { wave: 'square', vol: 0.18, attack: 0.08, release: 0.4 });
    return lowpass(b, 1800);
  },
  // Ability activated: rising power-up.
  ability() {
    const b = buffer(0.45);
    tone(b, 0, 0.4, (t) => 300 * 2 ** (t * 5), { vol: 0.6, release: 0.15 });
    tone(b, 0, 0.4, (t) => 600 * 2 ** (t * 5), { wave: 'tri', vol: 0.2, release: 0.15 });
    return b;
  },
  // Countdown tick before the zombies are released.
  tick() {
    const b = buffer(0.08);
    tone(b, 0, 0.07, 1250, { vol: 0.6, decay: 0.02 });
    return b;
  },
  win() {
    const b = buffer(1.6);
    const notes = [[72, 0], [76, 0.14], [79, 0.28], [84, 0.42]];
    for (const [n, s] of notes) {
      tone(b, s, s === 0.42 ? 1.1 : 0.2, midi(n), { wave: 'saw', vol: 0.4, decay: s === 0.42 ? 0.5 : 0.1, release: 0.15 });
      tone(b, s, s === 0.42 ? 1.1 : 0.2, midi(n - 12), { wave: 'tri', vol: 0.4, decay: 0.4 });
    }
    return lowpass(b, 2600);
  },
  lose() {
    const b = buffer(1.9);
    const notes = [[67, 0], [63, 0.3], [60, 0.6], [48, 0.9]];
    for (const [n, s] of notes) tone(b, s, s === 0.9 ? 1 : 0.35, midi(n), { wave: 'saw', vol: 0.45, decay: s === 0.9 ? 0.5 : 0.2, release: 0.2, vibrato: 0.01 });
    return lowpass(b, 1100);
  },
};

// ---- Music loops (16 seconds each, seamless) ------------------------------------------------

const BAR = 2; // 120 bpm, 4/4
const LOOP = BAR * 8;

/** Calm, eerie menu music: slow minor chords with a soft arpeggio. */
function menuMusic() {
  const b = buffer(LOOP);
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]]; // Am F C E
  chords.forEach((ch, i) => {
    const start = i * BAR * 2;
    for (const n of ch) {
      for (const det of [-0.12, 0.12]) {
        tone(b, start, BAR * 2 + 0.6, midi(n) * 2 ** (det / 12), { wave: 'saw', vol: 0.16, attack: 0.9, release: 0.9, wrap: true });
      }
    }
    tone(b, start, BAR * 2 + 0.4, midi(ch[0] - 12), { wave: 'tri', vol: 0.35, attack: 0.4, release: 0.6, wrap: true });
    const arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]];
    for (let k = 0; k < 16; k++) tone(b, start + k * 0.25, 0.5, midi(arp[k % 8] + 12), { vol: 0.1, decay: 0.15, wrap: true });
  });
  return lowpass(b, 1500);
}

/** Tense chase music: pulsing bass, drums and a high eerie line. */
function gameMusic() {
  const b = buffer(LOOP);
  const roots = [38, 34, 31, 33]; // D Bb G A
  const chords = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]];
  roots.forEach((r, i) => {
    const start = i * BAR * 2;
    for (let k = 0; k < 16; k++) {
      const n = k % 8 === 6 ? r + 3 : k % 8 === 7 ? r + 7 : r;
      tone(b, start + k * 0.25, 0.22, midi(n), { wave: 'saw', vol: k % 4 === 0 ? 0.55 : 0.4, decay: 0.09, wrap: true });
    }
    for (const n of chords[i]) tone(b, start, BAR * 2 + 0.3, midi(n), { wave: 'saw', vol: 0.07, attack: 0.6, release: 0.5, wrap: true });
  });
  const body = lowpass(b, 900);

  const drums = buffer(LOOP);
  for (let k = 0; k < LOOP * 2; k++) {
    const s = k * 0.5;
    if (k % 2 === 0) tone(drums, s, 0.2, (t) => 120 - t * 400, { vol: 0.9, decay: 0.06, wrap: true }); // kick on every beat
    if (k % 4 === 2) hiss(drums, s, 0.15, { cutoff: 3000, high: 600, vol: 0.5, decay: 0.05, wrap: true }); // snare
    hiss(drums, s + 0.25, 0.05, { cutoff: 9000, high: 5000, vol: 0.35, decay: 0.012, wrap: true }); // hi-hat
  }

  const lead = buffer(LOOP);
  const line = [74, 75, 74, 70, 72, 74, 73, 69];
  line.forEach((n, i) => tone(lead, i * BAR, BAR * 0.95, midi(n + 12), { vol: 0.09, attack: 0.3, release: 0.6, vibrato: 0.006, wrap: true }));

  for (let i = 0; i < b.length; i++) body[i] += drums[i] * 0.6 + lead[i];
  return body;
}

for (const [name, make] of Object.entries(sfx)) write(name, make());
write('music-menu', menuMusic(), 0.8);
write('music-game', gameMusic(), 0.8);
console.log(`נוצרו ${Object.keys(sfx).length + 2} קבצי סאונד ב-assets/sounds`);

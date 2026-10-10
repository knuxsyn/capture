// Echidna Circuit: three designed zones that loop forever, each built
// around what Knuckles' moveset and the physics allow.
//   Coral Drift   glide chasms wider than any jump, sea stacks, big dunes
//   Ember Canyon  cliffs taller than any spring, rock walls you smash
//   Static Ruins  towers to climb and glide between, crumbling bridges,
//                 flying enemies
// Each lap raises the tier: wider chasms, taller cliffs, faster crumbling,
// more enemies, and from lap 3 some real pits. Revisits change time of
// day, then hue. The fairness rules from the base cart still apply.
import { WORLD } from '../src/core/constants.js';
import { MAT, BOTH, TOP, px } from '../src/core/world.js';
import { catchFloor, HAZARD_SPEED, objects as baseObjects } from '../src/content/base.js';
import { gimmickSegments, gimmickObjects, gimmickHooks, maybeMonitor } from './gimmicks.js';

const S = WORLD.BLOCK;
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// 0 on the first visit to Coral Drift, 1 by lap 4.
const tierT = (b) => Math.min(1, b.zone.tier / 4);

// Horizontal reach of a running jump that turns into a glide at the apex
// and sinks at the glide's 0.5 px/frame until `drop` px below takeoff.
function glideReach(b, drop = 0) {
  const P = b.P;
  return (P.top * P.jmp) / P.grv + ((b.jumpHeight() + drop) / 0.5) * 6.5;
}

function rockColumns(b, x, w, top) {
  b.mat = MAT.ROCK;
  for (let i = 0; i < w; i++) b.column(x + i, top);
  b.mat = MAT.GROUND;
}

// ---------------------------------------------------------- productions

const segments = [
  {
    // A chasm only a glide crosses. Rings trace the glide line.
    id: 'chasm', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(b.rng.int(20, 26) * S);
      const dy = Math.max(-32, b.room(b.rng.int(-2, 4) * S));
      const x = b.cx, y = b.cy, land = y + dy;
      const w = Math.round(lerp(b.jumpRange() * 1.3, glideReach(b, Math.max(0, dy)) * 0.55, t) * b.rng.range(0.9, 1));
      for (let k = 1; k <= 9; k++) {
        const u = k / 10;
        b.ring(x + w * u, y - 80 + u * (land - y + 40));
      }
      if (!(t >= 0.5 && b.rng.chance(0.35))) catchFloor(b, x, x + w, Math.max(y, land) + 144, land);
      b.gap(w, dy);
      b.flat(b.rng.int(20, 26) * S);
      maybeMonitor(b, b.cx - 96, b.cy, 0.25);
    },
  },
  {
    // Sea stacks: rock pillars to hop across. Fall, and the stacks are
    // walls you can climb; the far bank has a spring too.
    id: 'stacks', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(16 * S);
      const y0 = b.cy, x0 = b.cx, n = b.rng.int(3, 5) + Math.round(t * 2);
      let x = x0, top = y0, low = y0;
      for (let k = 0; k < n; k++) {
        x += Math.round(b.rng.range(80, lerp(160, 260, t)));
        const w = Math.round(b.rng.range(lerp(96, 56, t), lerp(128, 80, t)));
        top = clamp(top + b.rng.int(-3, 3) * S, Math.max(WORLD.Y_TOP, y0 - 96), y0 + 48);
        rockColumns(b, x, w, top);
        b.ringLine(x + 16, top - 24, x + w - 16, top - 24, 2);
        low = Math.max(low, top);
        x += w;
      }
      const exit = x + b.rng.int(5, 9) * S;
      const land = clamp(top + b.rng.int(-1, 2) * S, WORLD.Y_TOP, WORLD.Y_BOT);
      catchFloor(b, x0, exit, Math.max(low, land) + 160, land);
      b.gap(exit - b.cx, 0);
      b.cy = land;
      b.track(land);
      b.flat(24 * S);
    },
  },
  {
    // A cliff taller than a spring can reach. A ring column up the face
    // pays for climbing it.
    id: 'cliff', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(b.rng.int(10, 14) * S);
      const rise = b.room(-Math.round(lerp(144, 288, t) * b.rng.range(0.85, 1.1)));
      const x = b.cx, y = b.cy;
      if (rise < 0) for (let k = 1; k <= Math.floor(-rise / 40); k++) b.ring(x - 14, y - 20 - k * 40);
      b.step(rise);
      b.mat = MAT.ROCK;
      b.flat(6 * S);
      b.mat = MAT.GROUND;
      const len = b.rng.int(14, 20) * S;
      b.flat(len);
      if (rise < 0) maybeMonitor(b, b.cx - 64, b.cy, 0.55, 'reward');
      if (rise < 0) b.ringLine(x + 112, b.cy - 28, x + 96 + len - 32, b.cy - 28, 5);
    },
  },
  {
    // Cracked rock across the path, too tall to hop. Roll, spindash or
    // glide into it to smash through.
    id: 'rockwall', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(b.rng.int(16, 20) * S);
      const x = b.cx, y = b.cy, h = Math.round(lerp(112, 176, t)), w = 32;
      b.flat(w + b.rng.int(16, 22) * S);
      b.world.fillRect(x, y - h, x + w, y, px(BOTH, MAT.CRACKED));
      b.track(y - h);
      b.spawn('rockwall', x + w / 2, y - h / 2, { x0: x, y0: y - h, x1: x + w, y1: y, w: w / 2, h: h / 2 });
      b.ringLine(x + w + 48, y - 28, x + w + 176, y - 28, 4);
    },
  },
  {
    // A bridge of planks that give way a moment after you land on them.
    // Gaps stay under 40 px: at speed you run straight across (gravity
    // drops you only a few px per gap); slow down and the bridge goes.
    id: 'crumble', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(18 * S);
      const y = b.cy, x0 = b.cx, n = b.rng.int(4, 6) + Math.round(t * 3);
      const delay = Math.round(lerp(30, 18, t));
      let x = x0;
      for (let k = 0; k < n; k++) {
        x += b.rng.int(16, Math.round(lerp(28, 40, t)));
        const w = b.rng.int(56, 88);
        b.world.fillRect(x, y, x + w, y + 12, px(BOTH | TOP, MAT.CRUMBLE));
        b.spawn('crumble', x + w / 2, y + 6, { x0: x, x1: x + w, y0: y, y1: y + 12, delay, w: w / 2, h: 6 });
        b.ring(x + w / 2, y - 28);
        x += w;
      }
      const exit = x + b.rng.int(2, 4) * S;
      if (!(t >= 0.5 && b.rng.chance(0.3))) catchFloor(b, x0, exit, y + 160, y);
      b.track(y);
      b.gap(exit - b.cx, 0);
      b.flat(22 * S);
    },
  },
  {
    // Ruined towers: climb one, glide to the next. Fall and you land
    // between them, ready to climb again.
    id: 'towers', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(14 * S);
      const y = b.cy, n = b.rng.int(2, 3) + (t > 0.6 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const h = Math.round(Math.min(b.cy - WORLD.Y_TOP, lerp(128, 272, t) * b.rng.range(0.8, 1.15)));
        if (h < 64) break; // no headroom: a stub would only be a trip hazard
        const w = b.rng.int(4, 6) * S, x = b.cx;
        b.step(-h);
        b.mat = MAT.ROCK;
        b.flat(w);
        b.mat = MAT.GROUND;
        b.step(h);
        b.ringLine(x + 12, y - h - 24, x + w - 12, y - h - 24, 3);
        if (k === n - 1) maybeMonitor(b, x + w / 2, y - h, 0.45, 'reward');
        if (k < n - 1) b.flat(Math.round(b.rng.range(lerp(128, 96, t), lerp(224, 400, t))));
      }
      b.flat(16 * S);
    },
  },
  {
    // Flyers and spikes on open ground, spaced for reaction time.
    id: 'gauntlet', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      const n = 1 + Math.round(t * 2), x = b.cx, y = b.cy, len = 384 + n * 192;
      b.flat(len);
      for (let k = 0; k < n; k++) {
        const ex = x + 256 + k * 192;
        if (b.rng.chance(0.65)) b.spawn('buzzer', ex, y - 40, { range: 32, dir: -1 });
        else {
          const m = b.rng.int(2, 3);
          b.spawn('spikes', ex, y - 8, { n: m, w: m * 8 });
        }
      }
    },
  },
];

// ---------------------------------------------------------------- objects

function debris(core, x0, y0, x1, y1, color, n = 10) {
  for (let i = 0; i < n; i++) {
    core.objects.spawn('debris', x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0), {
      xsp: (Math.random() - 0.5) * 5, ysp: -Math.random() * 4 - 1, life: 50, color,
    });
  }
}

const objects = {
  rockwall: {
    w: 16, h: 48,
    // Smash when a curled player at speed, or a gliding one, will reach the
    // face within a frame. Checked ahead of contact, because contact zeroes
    // speed; last frame's pose and speed count too (a dash from flush).
    update(o, core) {
      const p = core.player;
      // A spindash released flush against the wall loses its speed to the
      // push sensor in the same frame; last frame's rev says what it was.
      const released = o.psd && !p.spindash && p.ground;
      const dir = released ? p.facing : Math.sign(p.xsp) || p.facing;
      const gap = dir > 0 ? o.x0 - (p.x + p.P.pushR) : p.x - p.P.pushR - o.x1;
      const level = p.y + p.hr > o.y0 && p.y - p.hr < o.y1;
      const speed = released ? p.P.dashBase + Math.floor(o.prev) / 2 : Math.max(Math.abs(p.xsp), o.pv ?? 0);
      const strong = released || ((p.curled || o.pc) && speed >= 4) || p.ext.gliding || o.pg;
      if (level && strong && gap <= Math.max(Math.abs(p.xsp), speed) + 3 && gap > -(o.x1 - o.x0)) {
        core.world.fillRect(o.x0, o.y0, o.x1, o.y1, 0);
        debris(core, o.x0, o.y0, o.x1, o.y1, '#b0664c', 14);
        p.xsp = dir * speed;
        if (p.ground) { p.gsp = dir * speed; p.rolling = true; p.curl(); }
        o.alive = false;
        core.score += 50;
        core.events.push('pop');
        return;
      }
      o.pv = Math.abs(p.xsp);
      o.pc = p.curled;
      o.pg = !!p.ext.gliding;
      o.psd = p.spindash;
      o.prev = p.rev;
    },
  },

  crumble: {
    w: 24, h: 6,
    // Planks rebuild when the player respawns, so a fallen bridge never
    // leaves a checkpoint facing an empty pit.
    update(o, core) {
      const p = core.player;
      if (o.broken) {
        if (!core.events.includes('respawn')) return;
        core.world.fillRect(o.x0, o.y0, o.x1, o.y1, px(BOTH | TOP, MAT.CRUMBLE));
        o.broken = false;
        o.t0 = undefined;
      }
      const on = p.ground && p.mode === 0 && p.x >= o.x0 - p.wr && p.x <= o.x1 + p.wr &&
        Math.abs(p.y + p.hr - o.y0) <= 2;
      if (on && o.t0 === undefined) o.t0 = core.frame;
      if (o.t0 !== undefined && core.frame - o.t0 >= o.delay) {
        core.world.fillRect(o.x0, o.y0, o.x1, o.y1, 0);
        debris(core, o.x0, o.y0, o.x1, o.y1, '#9a78d6', 8);
        o.broken = true;
      }
    },
    draw(ctx, o, f) {
      if (o.broken || o.t0 === undefined || (f >> 2) & 1) return;
      ctx.fillStyle = 'rgba(255, 90, 110, 0.45)';
      ctx.fillRect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
    },
  },

  buzzer: {
    w: 12, h: 8,
    update(o) {
      o.x += o.dir * 0.75;
      if (o.x - o.x0 > o.range) o.dir = -1;
      else if (o.x - o.x0 < -o.range) o.dir = 1;
      o.y = o.y0 + Math.sin(o.t * 0.08) * 4;
    },
    touch: baseObjects.crawler.touch,
    draw(ctx, o, f) {
      const flap = (f >> 1) & 1;
      ctx.fillStyle = 'rgba(200, 240, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(o.x - 2, o.y - 8 - flap * 2, 7, 3 + flap, -0.3, 0, TAU);
      ctx.ellipse(o.x + 4, o.y - 8 - flap * 2, 6, 3 + flap, 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffcf3f';
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, 11, 7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1d1a2b';
      for (let i = -1; i <= 1; i++) ctx.fillRect(o.x + i * 5 - 1, o.y - 6, 2, 12);
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(o.x + o.dir * 9, o.y - 1, 2.5, 0, TAU);
      ctx.fill();
    },
  },

  debris: {
    w: 0, h: 0,
    update(o) {
      if (--o.life <= 0) { o.alive = false; return; }
      o.ysp += 0.25;
      o.x += o.xsp;
      o.y += o.ysp;
    },
    draw(ctx, o) {
      ctx.fillStyle = o.color;
      ctx.fillRect(Math.round(o.x), Math.round(o.y), 4, 4);
    },
  },
};

// ------------------------------------------------------------------ zones

function toHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Rotate every color in a palette around the hue wheel.
function rotate(pal, deg) {
  const r = (c) => {
    if (Array.isArray(c)) return c.map(r);
    if (typeof c !== 'string' || c[0] !== '#') return c;
    const [h, sat, l] = toHsl(c);
    return fromHsl(h + deg, sat, l);
  };
  return Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, r(v)]));
}

const THEMES = [
  {
    theme: 'coast', name: 'Coral Drift', pattern: 'waves', skyline: 'sea',
    amp: 1.3, stretch: 1.25, loopBias: 1,
    weights: { lagoon: 1.4, vines: 1.1, chasm: 1, stacks: 0.8, garden: 0.8, hills: 1, loop: 0.9, halfpipe: 0.5, drop: 0.4, springboard: 0.3, slope: 0.4, runway: 0.3, skyway: 0.6 },
    moods: [
      {
        mood: 'day', sky: ['#1f6fb2', '#9fe3ec'], far: '#5aa9c9', mid: '#2f8f7a', cloud: '#ffffff', water: '#2b8fb8',
        grass: ['#7ef0c8', '#34c3a0', '#1d8a73'], soil: ['#f2d49b', '#e3bf7e', '#cfa765', '#9c7a45'],
        rock: ['#e7f1f4', '#b9cfd6', '#8aa6b1'], wood: ['#f0c48a', '#c4935a', '#7d5a36'],
      },
      {
        mood: 'dusk', sky: ['#3b1d52', '#ff9a6a'], far: '#7a4a7a', mid: '#3e4f5a', cloud: '#ffc4a0', water: '#5a3d6e',
        grass: ['#9df0d8', '#46b8a4', '#2a7c78'], soil: ['#e8b98a', '#d29e72', '#b98258', '#6e4a32'],
        rock: ['#f0d8e0', '#c9a8b8', '#987c8e'], wood: ['#f0c48a', '#c4935a', '#7d5a36'],
      },
    ],
  },
  {
    theme: 'canyon', name: 'Ember Canyon', pattern: 'strata', skyline: 'canyon',
    amp: 1.1, stretch: 1, loopBias: 0,
    weights: { lavapit: 1.3, cliff: 1.2, rockwall: 1, rhinos: 1.1, vines: 0.6, crushers: 0.5, drop: 0.9, terraces: 0.5, loop: 0.5, halfpipe: 0.4, slope: 0.5, runway: 0.2, crumble: 0.3 },
    moods: [
      {
        mood: 'dusk', sky: ['#3a1430', '#ff8a4c'], far: '#8a3b3b', mid: '#5c2a2a', cloud: '#ffc49a',
        grass: ['#ffd36b', '#e59b38', '#a8621f'], soil: ['#c4543a', '#a84432', '#8c3628', '#4a1a14'],
        rock: ['#e09a78', '#b86a50', '#8a4636'], wood: ['#e8b98a', '#b8865a', '#7a5236'],
      },
      {
        mood: 'night', stars: true, sky: ['#0b0a1f', '#3b2350'], far: '#2a1b3a', mid: '#20142c', cloud: '#5a3d6e',
        grass: ['#d8a24a', '#a8702e', '#7a4c1e'], soil: ['#7a3a32', '#66302a', '#522622', '#2a1210'],
        rock: ['#a87060', '#86564a', '#643e36'], wood: ['#c8a07a', '#987050', '#684a34'],
      },
    ],
  },
  {
    theme: 'ruins', name: 'Static Ruins', pattern: 'bricks', skyline: 'ruins',
    amp: 0.9, stretch: 0.95, loopBias: -1,
    weights: { towers: 1.1, crumble: 1, balloons: 1.1, crushers: 1, pinball: 0.8, orbinauts: 0.9, spikers: 0.8, gauntlet: 0.6, rockwall: 0.5, chasm: 0.4, loop: 0.5, platforms: 0.3, runway: 0.2 },
    moods: [
      {
        mood: 'night', stars: true, sky: ['#05060f', '#1b2350'], far: '#232a52', mid: '#161a36', cloud: '#3a4270', glow: '#7cf7ff',
        grass: ['#7cf7ff', '#2bb7d0', '#1a7f99'], soil: ['#3a3358', '#2f2a4a', '#25213c', '#120f22'],
        rock: ['#9aa3d6', '#6f78ad', '#4b5280'], wood: ['#c9a7ff', '#9a78d6', '#6a50a0'],
      },
      {
        mood: 'dawn', sky: ['#3c3172', '#f5c484'], far: '#6a5a9a', mid: '#4a3e72', cloud: '#ffd8b0', glow: '#ffd36b',
        grass: ['#c8f7a0', '#8cd070', '#5a9a4a'], soil: ['#7a6a9a', '#6a5a8a', '#5a4c78', '#2e2640'],
        rock: ['#d0c8f0', '#a89cd0', '#7a70a8'], wood: ['#f0c8a0', '#c09870', '#806048'],
      },
    ],
  },
];

const gauss = (rng) => Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(TAU * rng.next());

export function zoneGen(rng, index, { ids = [] } = {}) {
  const th = THEMES[index % THEMES.length], lap = Math.floor(index / THEMES.length);
  let pal = th.moods[lap % 2];
  if (lap >= 2) pal = rotate(pal, (lap - 1) * 47);
  const weights = {};
  for (const id of ids) weights[id] = (th.weights[id] ?? 0) * Math.exp(gauss(rng) * 0.25);
  return {
    name: th.name, theme: th.theme, lap, tier: lap + (index % THEMES.length) / THEMES.length,
    ...pal, stars: !!pal.stars, pattern: th.pattern, skyline: th.skyline,
    weights, amp: th.amp, stretch: th.stretch, loopBias: th.loopBias,
  };
}

export const circuit = {
  id: 'circuit',
  name: 'Echidna Circuit',
  blurb: 'Three zones built for glide and climb, looping forever and harder each lap.',
  requires: ['glide'],
  segments: [...segments, ...gimmickSegments],
  objects: { ...objects, ...gimmickObjects },
  hooks: gimmickHooks,
  zoneGen,
};

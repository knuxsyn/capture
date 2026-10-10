// The base cartridge. Everything the game ships with is content locked on
// the same way a mod would be: segments (the grammar), object types, zones.
import { WORLD } from '../core/constants.js';
import { MAT, BOTH, px } from '../core/world.js';

const S = WORLD.BLOCK;
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
// Smoothstep peaks at 1.5x the mean grade. Length 4x rise keeps the
// steepest point near 20 degrees, which is walkable from a standstill.
export const UPHILL = 4;

// ---------------------------------------------------------------- segments
// Each production: { id, weight, minD, maxSpeed?, build(b) }. `b` is the
// Builder (src/core/generator.js). Productions must leave b.cy at a
// walkable surface; the next segment starts there.
//
// Fairness rules, measured by test/flow.mjs with a reaction-time runner:
// - A production with hazards declares maxSpeed. Arriving faster, the
//   generator inserts `brake` first so the hazard is on screen >= 0.5 s.
// - Falling into a gap costs time, not a life: a catch floor and a spring
//   lead back up. True bottomless pits appear only in single-jump gaps,
//   from difficulty 0.55. Platform runs always have a catch floor.
// - Rises in the running line are ramps, never walls.

export const HAZARD_SPEED = 7.5;

// A lower route under a gap: floor, ring trail, and a spring at the far
// wall strong enough to clear it.
export function catchFloor(b, x0, x1, floorY, ledgeY) {
  for (let x = Math.round(x0); x < x1; x++) b.column(x, floorY);
  const wall = floorY - ledgeY + 2 * b.P.standH;
  b.spawn('spring', x1 - 24, floorY - 8, { power: b.springHeight(10) > wall ? 10 : 16 });
  if (x1 - x0 > 160) b.ringLine(x0 + 48, floorY - 28, x1 - 72, floorY - 28, 3);
}

export const segments = [
  {
    id: 'start',
    build(b) {
      b.block(0, 0, S, b.cy);
      b.flat(48 * S);
      b.ringLine(b.x0 + 320, b.cy - 32, b.x0 + 576, b.cy - 32, 5);
    },
  },
  {
    id: 'checkpoint',
    build(b) {
      const x = b.cx, y = b.cy;
      b.flat(14 * S);
      b.spawn('post', x + 112, y - 24);
    },
  },
  {
    // Inserted by the generator, never rolled: a climb that turns excess
    // speed into height (v^2 drops 2 * slp per px of rise above top speed).
    id: 'brake',
    build(b) {
      const excess = b.v * b.v - b.P.top * b.P.top;
      const rise = Math.min(b.cy - WORLD.Y_TOP, Math.ceil(excess / (2 * b.P.slp)) + 16);
      const x = b.cx, y = b.cy;
      if (rise > 0) b.slope(Math.max(12 * S, rise * UPHILL), -rise);
      b.flat(10 * S);
      b.ringLine(x + 64, y - 28 - rise * 0.15, b.cx - 64, b.cy - 28, 6);
    },
  },
  {
    id: 'runway', weight: 0.8,
    build(b) {
      const x = b.cx, y = b.cy, len = Math.round(b.rng.int(14, 28) * S * b.zone.stretch);
      b.flat(len);
      if (b.rng.chance(0.7)) b.ringLine(x + 64, y - 28, x + len - 64, y - 28, b.rng.int(3, 7));
    },
  },
  {
    id: 'hills', weight: 1.2,
    build(b) {
      const n = b.rng.int(1, 3), wave = Math.round(b.rng.int(20, 30) * S * b.zone.stretch);
      const amp = Math.round(b.rng.int(2, 4) * S * b.zone.amp);
      const x = b.cx, y = b.cy;
      b.hills(n * wave, amp, n);
      for (let k = 0; k < n; k++) {
        b.ringArc(x + (k + 0.5) * wave, y - amp + 40, 72, Math.PI * 0.65, Math.PI * 0.35, 3);
      }
    },
  },
  {
    id: 'slope', weight: 1,
    build(b) {
      const dy = b.room(Math.round(b.rng.sign() * b.rng.int(4, 12) * S * b.zone.amp));
      b.slope(Math.max(16 * S, Math.abs(dy) * (dy < 0 ? UPHILL : 2.2)), dy);
      b.flat(4 * S);
    },
  },
  {
    id: 'drop', weight: 0.6, minD: 0.1,
    build(b) {
      const dy = b.room(Math.round(b.rng.int(12, 22) * S * b.zone.amp));
      const len = Math.abs(dy) * (dy < 0 ? UPHILL : b.rng.range(1.6, 2.2));
      const x = b.cx, y = b.cy;
      b.slope(len, dy);
      for (let k = 1; k < 6; k++) b.ring(x + (len * k) / 6, y + dy * smooth(k / 6) - 28);
      b.flat(6 * S);
    },
  },
  {
    id: 'loop', weight: 0.8,
    build(b) {
      const lead = b.room(b.rng.int(4, 8) * S);
      if (lead > 0) b.slope(lead * 2.4, lead);
      else b.flat(12 * S);
      b.flat(6 * S);
      const r = Math.max(5, Math.min(8, b.rng.int(5, 7) + b.zone.loopBias)) * S;
      const { cx, cy } = b.loop(r);
      b.ringArc(cx, cy, r - 26, Math.PI * 0.15, Math.PI * 0.85, 7);
      b.flat(6 * S);
    },
  },
  {
    id: 'gap', weight: 1, minD: 0.06, maxSpeed: HAZARD_SPEED,
    build(b) {
      b.flat(b.rng.int(18, 24) * S);
      const w = Math.round(lerp(64, b.jumpRange() / 2, b.d) * b.rng.range(0.75, 1));
      const dy = Math.max(-32, b.room(b.rng.int(-2, 4) * S));
      const x = b.cx, y = b.cy, land = y + dy;
      for (let k = 1; k <= 5; k++) b.ring(x + (w * k) / 6, y - 40 - 56 * Math.sin((Math.PI * k) / 6));
      const pit = b.d >= 0.55 && b.rng.chance(0.35);
      if (!pit) catchFloor(b, x, x + w, Math.max(y, land) + 128, land);
      b.gap(w, dy);
      b.flat(b.rng.int(12, 18) * S);
    },
  },
  {
    // Platform runs are tuned to the full-speed jump arc (b.jumpRange(),
    // ~356 px with base physics): each gap plus the next platform spans at
    // least that, so a committed running jump lands on wood. Miss, and the
    // catch floor below walks you back to the exit.
    id: 'platforms', weight: 0.7, minD: 0.2, maxSpeed: HAZARD_SPEED,
    build(b) {
      b.flat(18 * S);
      const yEntry = b.cy, n = b.rng.int(2, 3), x0 = b.cx;
      const span = Math.round(b.jumpRange()) + 12, lift = Math.min(48, b.jumpHeight() / 2);
      let x = b.cx, y = b.cy, low = yEntry;
      for (let k = 0; k < n; k++) {
        const g = b.rng.int(4, 9) * S;
        const pw = span - g + b.rng.int(0, 2) * S;
        x += g;
        y = Math.min(yEntry + 48, Math.max(yEntry - 2 * lift, y - b.rng.range(-2 * S, lift)));
        y = Math.max(WORLD.Y_TOP, Math.round(y));
        low = Math.max(low, y);
        b.platform(x, y, pw);
        b.ringLine(x + 32, y - 24, x + pw - 32, y - 24, 4);
        x += pw;
      }
      const exit = x + b.rng.int(4, 8) * S;
      const land = Math.max(WORLD.Y_TOP, Math.min(WORLD.Y_BOT, y + b.rng.int(-1, 2) * S));
      catchFloor(b, x0, exit, Math.max(low, land) + 128, land);
      b.gap(exit - b.cx, 0);
      b.cy = land;
      b.track(b.cy);
      b.flat(24 * S);
    },
  },
  {
    id: 'springboard', weight: 0.6, minD: 0.12,
    build(b) {
      b.flat(8 * S);
      const x = b.cx, y = b.cy;
      b.flat(4 * S);
      b.spawn('spring', x + 40, y - 8, { power: 10 });
      const rise = b.room(-Math.min(b.rng.int(7, 11) * S, Math.floor(b.springHeight(10) * 0.75)));
      b.step(rise);
      b.flat(14 * S);
      if (rise < 0) b.ringLine(x + 40, y - 64, x + 40, y + rise - 32, 4);
    },
  },
  {
    // Terraces: rises are ramps so speed carries you up; drops are ledges.
    id: 'terraces', weight: 0.7, minD: 0.1,
    build(b) {
      b.flat(6 * S);
      const n = b.rng.int(2, 4), up = b.rng.chance(0.65);
      for (let k = 0; k < n; k++) {
        const h = b.room((up ? -1 : 1) * b.rng.int(2, 4) * S);
        if (h < 0) b.slope(-h * UPHILL, h);
        else b.step(h);
        b.flat(b.rng.int(6, 9) * S);
      }
    },
  },
  {
    id: 'halfpipe', weight: 0.6, minD: 0.05,
    build(b) {
      const depth = Math.min(Math.round(b.rng.int(5, 10) * S * b.zone.amp), WORLD.Y_BOT - b.cy);
      b.flat(4 * S);
      if (depth >= 3 * S) b.dip(Math.max(depth * 5.5, 20 * S), depth);
      b.flat(6 * S);
    },
  },
  {
    id: 'crawlers', weight: 0.9, minD: 0.03, maxSpeed: HAZARD_SPEED,
    build(b) {
      const x = b.cx, len = b.rng.int(24, 34) * S;
      if (b.rng.chance(0.5)) b.flat(len);
      else b.hills(len, 2 * S, 1);
      const n = 1 + Math.floor(b.d * 2.99 * b.rng.next());
      for (let k = 0; k < n; k++) {
        const ex = x + 224 + ((k + 0.5) * (len - 320)) / n;
        b.spawn('crawler', ex, b.groundAt(ex) - 10, { dir: -1, range: 40 });
      }
    },
  },
  {
    id: 'spikes', weight: 0.7, minD: 0.33, maxSpeed: HAZARD_SPEED,
    build(b) {
      b.flat(16 * S);
      const x = b.cx, y = b.cy, n = b.rng.int(2, 4);
      b.flat(n * S + 12 * S);
      b.spawn('spikes', x + 32 + n * 8, y - 8, { n, w: n * 8 });
      b.ringArc(x + 32 + n * 8, y + 24, 64, Math.PI * 0.75, Math.PI * 0.25, 3);
    },
  },
];

// ------------------------------------------------------------ draw helpers

function oval(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, TAU);
}

function drawRing(ctx, x, y, f) {
  const w = Math.abs(Math.cos(f * 0.09)) * 5.5;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#f2b632';
  oval(ctx, x, y, w + 0.6, 6);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#fff3b0';
  oval(ctx, x - 0.5, y - 0.5, Math.max(0.5, w - 0.6), 5);
  ctx.stroke();
}

// ------------------------------------------------------------ object types

function collect(o, core) {
  o.alive = false;
  core.addRings(1);
  core.score += 10;
  core.objects.spawn('fx', o.x, o.y, { kind: 'sparkle', life: 16 });
  core.events.push('ring');
}

// Item monitors are solid boxes (MAT.METAL pixels the object draws). A
// curled, gliding or invincible player breaks one from any side; landing
// on it bounces you. Kinds: rings, shield, fire, lightning, bubble,
// invincible, shoes, life.
export function placeMonitor(b, x, groundY, kind) {
  b.world.fillRect(x - 14, groundY - 30, x + 14, groundY, px(BOTH, MAT.METAL), true);
  return b.spawn('monitor', x, groundY - 15, { kind, x0: x - 14, y0: groundY - 30, x1: x + 14, y1: groundY });
}

const ICON = {
  rings: ['#f2b632', 'o'], shield: ['#6fb8ff', 'S'], fire: ['#ff6a2a', 'F'], lightning: ['#ffe14a', 'L'],
  bubble: ['#7ff0ff', 'B'], invincible: ['#ffffff', '*'], shoes: ['#ff4a6a', '>'], life: ['#7cf77c', '1'],
};

function drawIcon(ctx, kind, x, y) {
  const [c, glyph] = ICON[kind] ?? ICON.rings;
  ctx.fillStyle = c;
  if (kind === 'rings') {
    ctx.lineWidth = 2; ctx.strokeStyle = c;
    ctx.beginPath(); ctx.ellipse(x, y, 4, 5, 0, 0, TAU); ctx.stroke();
  } else if (['shield', 'fire', 'lightning', 'bubble'].includes(kind)) {
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#16121c';
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y + 0.5);
  } else {
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y + 0.5);
  }
}

export const objects = {
  monitor: {
    w: 14, h: 15,
    update(o, core) {
      const p = core.player;
      // A spindash released flush against the box loses its speed to the
      // push sensor this frame; last frame's rev restores it.
      const released = o.psd && !p.spindash && p.ground;
      o.psd = p.spindash;
      o.prev = p.rev;
      const strong = released || p.curled || p.spindash || p.ext.gliding || core.mighty();
      const ex = p.P.pushR + Math.abs(p.xsp) + 3;
      const down = p.hr + Math.max(0, p.ysp) + 3, up = p.hr + Math.max(0, -p.ysp) + 3;
      if (!strong || p.dead || p.x + ex < o.x0 || p.x - ex > o.x1 || p.y + down < o.y0 || p.y - up > o.y1) return;
      core.world.fillRect(o.x0, o.y0, o.x1, o.y1, 0, true);
      o.alive = false;
      if (released) { p.gsp = p.facing * (p.P.dashBase + Math.floor(o.prev) / 2); p.rolling = true; p.curl(); }
      if (!p.ground && p.ysp > 0 && p.y < o.y0) p.ysp = -Math.max(p.ysp, 3);
      core.score += 10;
      core.giveItem(o.kind);
      core.objects.spawn('fx', o.x, o.y, { kind: 'pop', life: 20 });
      core.objects.spawn('itemfx', o.x, o.y - 6, { kind: o.kind, life: 40 });
    },
    draw(ctx, o, f) {
      ctx.fillStyle = '#3a3f52';
      ctx.fillRect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
      ctx.fillStyle = '#c9ced8';
      ctx.fillRect(o.x0 + 2, o.y0 + 2, o.x1 - o.x0 - 4, 2);
      ctx.fillStyle = (f >> 3) & 1 ? '#10141f' : '#18223a';
      ctx.fillRect(o.x0 + 4, o.y0 + 5, o.x1 - o.x0 - 8, 17);
      if ((f & 15) < 13) drawIcon(ctx, o.kind, o.x, o.y0 + 13);
      ctx.fillStyle = '#20232e';
      ctx.fillRect(o.x0 + 2, o.y1 - 6, o.x1 - o.x0 - 4, 6);
    },
  },

  itemfx: {
    w: 0, h: 0,
    update(o) { o.y -= 0.6; if (--o.life <= 0) o.alive = false; },
    draw(ctx, o) { drawIcon(ctx, o.kind, o.x, o.y); },
  },

  // A projectile with gravity. Elemental shields knock it away.
  shot: {
    w: 5, h: 5,
    update(o, core) {
      if (--o.life <= 0) { o.alive = false; return; }
      o.ysp += o.grav ?? 0;
      o.x += o.xsp;
      o.y += o.ysp;
    },
    touch(o, p, core) {
      if (['fire', 'lightning', 'bubble'].includes(core.shield)) {
        o.xsp = Math.sign(o.x - p.x || 1) * 4;
        o.ysp = -4;
        o.grav = 0.2;
        return;
      }
      if (core.hurt(o.x, o.fire ? 'fire' : undefined)) o.alive = false;
    },
    draw(ctx, o, f) {
      ctx.fillStyle = o.fire ? ((f >> 1) & 1 ? '#ffd23a' : '#ff6a2a') : '#d6455b';
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r ?? 4, 0, TAU); ctx.fill();
      if (!o.fire) {
        ctx.fillStyle = '#f4f1e8';
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + f * 0.2;
          ctx.fillRect(o.x + Math.cos(a) * 5 - 1, o.y + Math.sin(a) * 5 - 1, 2, 2);
        }
      }
    },
  },

  ring: {
    w: 6, h: 6,
    // The lightning shield pulls nearby rings in, S3K-style: each axis
    // accelerates toward you, harder when the ring is moving away.
    update(o, core) {
      const p = core.player;
      if (!o.magnet) {
        if (core.shield !== 'lightning' || Math.abs(o.x - p.x) > 80 || Math.abs(o.y - p.y) > 80) return;
        o.magnet = true;
        o.vx = o.vy = 0;
      }
      const ax = Math.sign(p.x - o.x), ay = Math.sign(p.y - o.y);
      o.vx += ax * (ax === Math.sign(o.vx) ? 0.1875 : 0.75);
      o.vy += ay * (ay === Math.sign(o.vy) ? 0.1875 : 0.75);
      o.x += o.vx;
      o.y += o.vy;
    },
    touch: (o, p, core) => collect(o, core),
    draw: (ctx, o, f) => drawRing(ctx, o.x, o.y, f),
  },

  lostRing: {
    w: 6, h: 6,
    update(o, core) {
      if (--o.life <= 0) { o.alive = false; return; }
      o.ysp += 0.09375;
      o.x += o.xsp;
      o.y += o.ysp;
      if (o.ysp > 0) {
        const h = core.world.cast(o.x, o.y + 6, 0, 1, 3, true, 8);
        if (h && h.dist < 0) { o.y += h.dist; o.ysp *= -0.75; }
      }
    },
    touch(o, p, core) { if (o.life < 256 - 64) collect(o, core); },
    draw(ctx, o, f) { if (o.life > 64 || (f >> 2) & 1) drawRing(ctx, o.x, o.y, f * 2); },
  },

  spring: {
    w: 16, h: 8,
    update(o) { if (o.anim > 0) o.anim--; if (o.cool > 0) o.cool--; },
    touch(o, p, core) {
      if (o.cool > 0 || p.y > o.y || (p.ysp < 0 && !p.ground)) return;
      p.ground = false;
      p.jumping = false;
      p.rolling = false;
      p.spindash = false;
      p.uncurl();
      p.angle = 0;
      p.y = o.y - o.h - p.hr;
      p.ysp = -o.power;
      p.ext.sprung = true;
      o.anim = 10;
      o.cool = 10;
      core.events.push('spring');
    },
    draw(ctx, o) {
      const ext = o.anim > 0 ? 10 : 0;
      const base = o.y + 8;
      ctx.fillStyle = '#4a4f5c';
      ctx.fillRect(o.x - 14, base - 4, 28, 4);
      ctx.strokeStyle = '#c7ccd6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const top = base - 10 - ext;
      for (let i = 0; i <= 3; i++) {
        const yy = base - 4 - ((base - 4 - top) * i) / 3;
        ctx.moveTo(o.x - 9, yy);
        ctx.lineTo(o.x + 9, yy - 2);
      }
      ctx.stroke();
      ctx.fillStyle = o.power >= 16 ? '#e0483e' : '#f2c230';
      ctx.fillRect(o.x - 15, top - 5, 30, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(o.x - 13, top - 5, 26, 1);
    },
  },

  spikes: {
    w: 16, h: 8,
    touch(o, p, core) { core.hurt(o.x); },
    draw(ctx, o) {
      const n = o.n ?? 2, x0 = o.x - n * 8, base = o.y + 8;
      ctx.fillStyle = '#5b6170';
      ctx.fillRect(x0, base - 3, n * 16, 3);
      for (let i = 0; i < n; i++) {
        const sx = x0 + i * 16;
        ctx.fillStyle = '#c9ced8';
        ctx.beginPath();
        ctx.moveTo(sx + 1, base - 3);
        ctx.lineTo(sx + 8, base - 16);
        ctx.lineTo(sx + 15, base - 3);
        ctx.fill();
        ctx.fillStyle = '#7d8494';
        ctx.beginPath();
        ctx.moveTo(sx + 8, base - 16);
        ctx.lineTo(sx + 15, base - 3);
        ctx.lineTo(sx + 9, base - 3);
        ctx.fill();
      }
    },
  },

  crawler: {
    w: 12, h: 10,
    update(o, core) {
      o.x += o.dir * 0.5;
      if (o.x - o.x0 > o.range) o.dir = -1;
      else if (o.x - o.x0 < -o.range) o.dir = 1;
      const h = core.world.cast(o.x, o.y + o.h, 0, 1, 1, true, 24);
      if (h) o.y += h.dist;
    },
    touch(o, p, core) {
      if (p.curled || p.spindash || core.mighty()) {
        o.alive = false;
        core.score += 100;
        core.objects.spawn('fx', o.x, o.y, { kind: 'pop', life: 20 });
        core.events.push('pop');
        if (!p.ground) {
          if (p.ysp > 0 && p.y < o.y) p.ysp = -p.ysp;
          else p.ysp -= Math.sign(p.ysp);
        }
      } else {
        core.hurt(o.x);
      }
    },
    draw(ctx, o, f) {
      const step = (f >> 3) & 1;
      ctx.fillStyle = '#2a2233';
      for (let i = -1; i <= 1; i++) ctx.fillRect(o.x + i * 7 - 1 + (step ? 1 : -1) * (i & 1), o.y + 5, 3, 5);
      ctx.fillStyle = '#d6455b';
      ctx.beginPath();
      ctx.ellipse(o.x, o.y + 4, 13, 11, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff8a8a';
      ctx.fillRect(o.x - 8, o.y - 4, 5, 2);
      ctx.fillStyle = '#f4f1e8';
      oval(ctx, o.x + o.dir * 8, o.y, 3, 3);
      ctx.fill();
      ctx.fillStyle = '#16121c';
      ctx.fillRect(o.x + o.dir * 9 - 1, o.y - 1, 2, 2);
    },
  },

  post: {
    w: 8, h: 24,
    touch(o, p, core) {
      if (o.on) return;
      o.on = true;
      core.checkpoint = { x: o.x, y: o.y + 2 };
      core.events.push('post');
    },
    draw(ctx, o, f) {
      ctx.fillStyle = '#3c4a66';
      ctx.fillRect(o.x - 2, o.y - 16, 4, 40);
      const a = o.on ? f * 0.25 : 0;
      ctx.fillStyle = o.on ? '#ff5d73' : '#4fb3ff';
      oval(ctx, o.x + Math.sin(a) * 6, o.y - 20 + (1 - Math.cos(a)) * 3, 5, 5);
      ctx.fill();
    },
  },

  fx: {
    w: 0, h: 0,
    update(o) { if (--o.life <= 0) o.alive = false; },
    draw(ctx, o) {
      const t = 1 - o.life / (o.kind === 'pop' ? 20 : 16);
      ctx.strokeStyle = o.kind === 'pop' ? '#ffd27a' : '#fff6c8';
      ctx.lineWidth = 1.5;
      const r = (o.kind === 'pop' ? 18 : 10) * t;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + t;
        ctx.moveTo(o.x + Math.cos(a) * r * 0.4, o.y + Math.sin(a) * r * 0.4);
        ctx.lineTo(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r);
      }
      ctx.stroke();
    },
  },
};

// ------------------------------------------------------------------ zones
// Hand-made palettes. zoneGen below mixes them in now and then; carts can
// add more through `zones`. All hex, all original.

export const zones = [
  {
    name: 'Prism Ridge',
    sky: ['#1d4e89', '#7fc8d9'], far: '#4a6fa5', mid: '#2f7f6a', cloud: '#e8f6f8',
    grass: ['#9be07a', '#53b85a', '#2c7d45'], soil: ['#c98a4b', '#b0733c', '#93602f', '#5e3a1c'],
    rock: ['#a6b3c9', '#7f8ca6', '#5c6780'], wood: ['#e6b874', '#b8854a', '#7d5428'],
  },
  {
    name: 'Ember Hollow',
    sky: ['#2b1240', '#f08a5d'], far: '#6b3159', mid: '#8f4a3f', cloud: '#ffd1b3',
    grass: ['#ffd36b', '#e59b38', '#a8621f'], soil: ['#6e3540', '#5b2b37', '#48222e', '#2a1219'],
    rock: ['#c48a8a', '#9a6470', '#6e4453'], wood: ['#f0c088', '#c08850', '#80502a'],
  },
  {
    name: 'Tidal Spire',
    sky: ['#071a33', '#1d7a8c'], far: '#173d63', mid: '#18625f', cloud: '#9fe7e0',
    grass: ['#86f0d8', '#36b9a2', '#1b7f78'], soil: ['#3c4c70', '#30405f', '#27334d', '#141c2e'],
    rock: ['#b4c4e4', '#8392b8', '#5b678c'], wood: ['#d8c79a', '#a8956a', '#6e5f40'],
  },
  {
    name: 'Static Garden',
    sky: ['#140c2a', '#6b3fa0'], far: '#36235e', mid: '#5a3a8a', cloud: '#e9c8ff',
    grass: ['#f59ae6', '#c25cc0', '#843788'], soil: ['#2f2b4d', '#272340', '#1e1b33', '#100e1d'],
    rock: ['#c9b8f0', '#9886c4', '#6a5a96'], wood: ['#e8c4a0', '#b88f6c', '#7a5a44'],
  },
];

// ------------------------------------------------------------- biomes
// Every zone is generated from (seed, zone index): a name, a time of day,
// a palette, a ground pattern, a skyline, and a production mix that leans
// on one or two signature sections. Acts 1 and 2 of a zone share it.

const ADJ = ['Prism', 'Ember', 'Tidal', 'Static', 'Marble', 'Cinder', 'Aurora', 'Moss', 'Quartz', 'Sunset',
  'Thunder', 'Velvet', 'Copper', 'Lunar', 'Coral', 'Saffron', 'Glass', 'Iron', 'Nectar', 'Signal', 'Jade',
  'Rust', 'Pollen', 'Basalt', 'Chrome', 'Orchid', 'Cobalt', 'Tundra', 'Mirage', 'Clover'];
const LAND = ['Ridge', 'Hollow', 'Spire', 'Garden', 'Cascade', 'Canyon', 'Heights', 'Reef', 'Grove', 'Mesa',
  'Terrace', 'Falls', 'Dunes', 'Gorge', 'Bluffs', 'Basin', 'Shoals', 'Steppe', 'Crag', 'Vale', 'Causeway', 'Atoll'];
const MOODS = [['day', 3], ['dawn', 1], ['dusk', 2], ['night', 1.4], ['haze', 1]];
const GRASS = [[90, 135, 5], [38, 55, 1.5], [160, 185, 1.2], [285, 330, 1], [8, 22, 1.3]];
export const PATTERNS = ['strata', 'bricks', 'pebbles', 'diagonal', 'columns', 'waves'];
export const SKYLINES = ['peaks', 'spires', 'mesas', 'rolling', 'canopy'];
const SIGNATURE = ['loop', 'hills', 'drop', 'halfpipe', 'platforms', 'terraces', 'springboard', 'gap', 'crawlers'];

function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function weighted(rng, items) {
  let r = rng.next() * items.reduce((t, it) => t + it[it.length - 1], 0);
  for (const it of items) if ((r -= it[it.length - 1]) <= 0) return it;
  return items[items.length - 1];
}

const gauss = (rng) => Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(TAU * rng.next());

export function zoneGen(rng, index, { fixed = [], ids = [] } = {}) {
  const mood = weighted(rng, MOODS)[0];
  const dark = mood === 'night' ? 14 : mood === 'dusk' ? 6 : 0;
  let skyH = mood === 'day' && rng.chance(0.75) ? rng.range(190, 225) : rng.range(0, 360);
  if (mood === 'dawn') skyH = rng.range(250, 290);
  if (mood === 'dusk') skyH = rng.range(260, 320);
  if (mood === 'night') skyH = rng.range(215, 250);
  const sky = {
    day: [hsl(skyH, 62, 36), hsl(skyH - 8, 58, 74)],
    dawn: [hsl(skyH, 40, 32), hsl(rng.range(18, 40), 85, 74)],
    dusk: [hsl(skyH, 50, 16), hsl(rng.range(5, 30), 80, 62)],
    night: [hsl(skyH, 60, 7), hsl(skyH - 10, 45, 24)],
    haze: [hsl(skyH, 30, 58), hsl(skyH + 30, 35, 84)],
  }[mood];
  let g = rng.range(...weighted(rng, GRASS).slice(0, 2));
  if (Math.abs(((g - skyH + 540) % 360) - 180) < 40) g += 120; // keep ground off the sky's hue
  const soilH = rng.chance(0.65) ? rng.range(18, 36) : g + 180;
  const soilS = rng.range(35, 55);
  let palette = {
    sky,
    far: hsl(skyH + 10, 28, (mood === 'night' ? 18 : mood === 'dusk' ? 30 : 50)),
    mid: hsl(g, 32, 38 - dark * 1.4),
    cloud: { day: hsl(skyH, 40, 95), dawn: hsl(20, 80, 88), dusk: hsl(15, 70, 78), night: hsl(skyH, 30, 40), haze: hsl(skyH, 20, 96) }[mood],
    grass: [hsl(g, 62, 66 - dark), hsl(g, 55, 48 - dark), hsl(g, 58, 32 - dark * 0.7)],
    soil: [hsl(soilH, soilS, 52 - dark), hsl(soilH, soilS, 45 - dark), hsl(soilH, soilS, 38 - dark), hsl(soilH, soilS, 20 - dark * 0.5)],
    rock: [hsl(skyH, 18, 70 - dark), hsl(skyH, 18, 56 - dark), hsl(skyH, 18, 42 - dark)],
    wood: [hsl(rng.range(22, 38), 52, 72 - dark), hsl(30, 50, 54 - dark), hsl(28, 48, 34 - dark)],
  };
  let name = `${rng.pick(ADJ)} ${rng.pick(LAND)}`;
  // Now and then a hand-made palette (or one a cart added) comes round.
  if (fixed.length && rng.chance(0.25)) {
    const f = rng.pick(fixed);
    palette = { sky: f.sky, far: f.far, mid: f.mid, cloud: f.cloud, grass: f.grass, soil: f.soil, rock: f.rock, wood: f.wood };
    name = f.name;
  }

  const weights = {};
  for (const id of ids) weights[id] = Math.exp(gauss(rng) * 0.55);
  for (let k = rng.int(1, 2); k > 0; k--) {
    const sig = rng.pick(SIGNATURE);
    if (sig in weights) weights[sig] *= 2.5;
  }

  return {
    name, mood, ...palette,
    stars: mood === 'night',
    pattern: rng.pick(PATTERNS),
    skyline: rng.pick(SKYLINES),
    weights,
    amp: rng.range(0.75, 1.35),
    stretch: rng.range(0.85, 1.25),
    loopBias: rng.int(-1, 1),
  };
}

export const base = {
  id: 'base',
  name: 'Base Cartridge',
  segments,
  objects,
  zones,
  zoneGen,
  hooks: {
    onLand(p) { p.ext.sprung = false; },
  },
};

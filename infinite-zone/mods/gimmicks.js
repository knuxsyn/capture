// S3K set pieces for the Echidna Circuit. Each one is a physics toy first:
//   lagoon     Hydrocity water: skim the surface at speed, sink and swim when
//              slow, air runs out (bubble vents, bubble shield), Jawz patrol
//   vines      Angel Island / Mushroom Hill swings: a real pendulum you can
//              pump; let go and you fly off on the tangent
//   lavapit    Lava Reef: lava throws you out (fire shield shrugs it off),
//              spouts arc fireballs on a beat
//   balloons   Carnival Night: each balloon is a fixed upward kick; chain them
//   pinball    Carnival Night bumpers: reflect you at a fixed speed
//   crushers   Flying Battery pistons: wait for the beat or get flattened
//   rhinos, garden, orbinauts, spikers: badniks with behavior
// Objects expose `clearFor(core)` when they are timed hazards, so the test
// players (and anyone reading the code) know what "safe to pass" means.
import { WORLD, AIR } from '../src/core/constants.js';
import { MAT, BOTH, TOP, px } from '../src/core/world.js';
import { catchFloor, HAZARD_SPEED, placeMonitor, objects as baseObjects } from '../src/content/base.js';

const S = WORLD.BLOCK;
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const tierT = (b) => Math.min(1, b.zone.tier / 4);
const stomp = baseObjects.crawler.touch; // jump or roll on it, or get hurt

// A monitor with a weighted pick of items, `p` the chance of placing one.
const POOLS = {
  common: [['rings', 5], ['shield', 2], ['lightning', 1.2], ['shoes', 1], ['invincible', 0.5], ['life', 0.25]],
  reward: [['rings', 2], ['lightning', 2], ['invincible', 1.5], ['shoes', 1.2], ['life', 1]],
};
export function maybeMonitor(b, x, groundY, p = 0.35, pool = 'common', forced = null) {
  if (!b.rng.chance(p)) return null;
  let kind = forced;
  if (!kind) {
    const items = POOLS[pool];
    let r = b.rng.next() * items.reduce((t, [, w]) => t + w, 0);
    kind = items.find(([, w]) => (r -= w) <= 0)?.[0] ?? 'rings';
  }
  return placeMonitor(b, Math.round(x), groundY, kind);
}

// ---------------------------------------------------------- productions

export const gimmickSegments = [
  {
    // Hydrocity lagoon. A downhill run-in carries a player holding right to
    // skimming speed; slow down on the water and you sink and swim.
    id: 'lagoon', weight: 1,
    build(b) {
      const t = tierT(b);
      b.flat(8 * S);
      maybeMonitor(b, b.cx - 64, b.cy, 0.45, 'common', b.rng.chance(0.5) ? 'bubble' : null);
      const drop = b.room(b.rng.int(5, 8) * S);
      if (drop > 0) b.slope(Math.round(drop * 2.2), drop);
      else b.flat(10 * S);
      b.flat(4 * S);
      const x0 = b.cx, y = b.cy, surf = y + 8;
      const W = Math.round(lerp(480, 1100, t) * b.rng.range(0.85, 1.1));
      const D = b.rng.int(7, 11) * S;
      for (let x = x0; x < x0 + W; x++) b.column(x, y + D);
      b.world.fillRect(x0, surf, x0 + W, surf + 16, px(BOTH | TOP, MAT.SKIM));
      b.world.addLiquid(x0, x0 + W, surf, 'water');
      for (let x = x0 + 200; x < x0 + W - 80; x += 360) b.spawn('vent', x, y + D - 4, { period: 150 });
      for (let k = 0; k < Math.round(t * 3); k++) {
        b.spawn('jawz', x0 + W * (0.4 + 0.25 * k), surf + 40 + b.rng.int(0, Math.max(0, D - 72)), { xa: x0, xb: x0 + W });
      }
      b.ringLine(x0 + 64, surf - 26, x0 + W - 64, surf - 26, Math.floor(W / 64));
      b.ringLine(x0 + 96, y + D - 24, x0 + W - 160, y + D - 24, Math.floor(W / 128));
      b.spawn('spring', x0 + W - 24, y + D - 8, { power: 10 });
      b.gap(W, 0);
      b.track(y + D);
      b.flat(18 * S);
    },
  },
  {
    // Swinging vines across a chasm. Running into the first handle grabs
    // it with your speed; let go on the upswing to reach the next.
    id: 'vines', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(14 * S);
      const x0 = b.cx, y = b.cy, n = b.rng.int(2, 3) + (t > 0.5 ? 1 : 0), L = 104;
      const spacing = Math.round(lerp(160, 200, t));
      const pivotY = y - 19 - L + 4;
      for (let k = 0; k < n; k++) {
        const vx = x0 + 64 + k * spacing;
        b.spawn('vine', vx, pivotY, { L, a: 0, w: 0 });
        b.ringArc(vx, pivotY, L + 8, Math.PI * 1.35, Math.PI * 1.65, 3);
      }
      const W = 64 + (n - 1) * spacing + 176;
      catchFloor(b, x0, x0 + W, y + 144, y);
      b.gap(W, 0);
      b.flat(20 * S);
    },
  },
  {
    // Lava Reef pit. Jump it; fall in and the lava throws you out, burned.
    // Spouts launch fireballs on a beat from tier 0.2.
    id: 'lavapit', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(16 * S);
      maybeMonitor(b, b.cx - 96, b.cy, 0.4, 'common', 'fire');
      const x0 = b.cx, y = b.cy, W = b.rng.int(6, Math.round(lerp(10, 15, t))) * S, lavaY = y + 40;
      for (let x = x0; x < x0 + W; x++) b.column(x, y + 72);
      b.world.addLiquid(x0, x0 + W, lavaY, 'lava');
      if (t > 0.2) b.spawn('spout', x0 + W / 2, lavaY, { period: Math.round(lerp(150, 100, t)), phase: b.rng.int(0, 60) });
      for (let k = 1; k <= 3; k++) b.ring(x0 + (W * k) / 4, y - 48 - 24 * Math.sin((Math.PI * k) / 4));
      b.gap(W, 0);
      b.track(y + 72);
      b.flat(16 * S);
    },
  },
  {
    // Carnival Night balloons over a chasm: each pop is a fixed kick up.
    id: 'balloons', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(16 * S);
      const x0 = b.cx, y = b.cy, n = b.rng.int(3, 5);
      let x = x0 + 72;
      for (let k = 0; k < n; k++) {
        b.spawn('balloon', x, y - b.rng.int(48, 120), { hue: b.rng.int(0, 3) });
        x += Math.round(b.rng.range(120, lerp(160, 210, t)));
      }
      const W = x - x0 + 64;
      catchFloor(b, x0, x0 + W, y + 144, y);
      b.gap(W, 0);
      b.flat(18 * S);
    },
  },
  {
    // Bumper clusters overhead: optional, chaotic, worth points.
    id: 'pinball', weight: 1,
    build(b) {
      const x = b.cx, y = b.cy, len = b.rng.int(36, 48) * S;
      b.flat(len);
      for (let c = 0; c < 2; c++) {
        const cx = x + len * (0.3 + 0.4 * c), cy = y - b.rng.int(88, 112);
        for (const [dx, dy] of [[-28, 0], [28, 0], [0, -30]]) b.spawn('bumper', cx + dx, cy + dy, {});
        b.ringArc(cx, cy - 10, 52, 0, Math.PI, 7);
      }
      maybeMonitor(b, x + 64, y, 0.4); // clear of the bumpers, so a hop onto it isn't kicked back
    },
  },
  {
    // Flying Battery crushers: pistons slam on a beat. Wait, then go.
    id: 'crushers', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      b.flat(18 * S);
      const y = b.cy, n = b.rng.int(2, 3), up = Math.round(lerp(90, 56, t));
      for (let k = 0; k < n; k++) {
        const x = b.cx + 48;
        b.flat(48 + 96 + b.rng.int(0, 4) * S);
        b.spawn('crusher', x + 24, y - 128, { x0: x, x1: x + 48, ground: y, h: 56, up, phase: k * 37 });
      }
      b.flat(16 * S);
    },
  },
  {
    // Rhinobots: patrol, spot you, charge, skid and turn.
    id: 'rhinos', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      const x = b.cx, len = b.rng.int(30, 40) * S;
      b.flat(len);
      const n = 1 + Math.round(t * 2);
      for (let k = 0; k < n; k++) b.spawn('rhinobot', x + 320 + k * 224, b.cy - 12, { dir: -1 });
      maybeMonitor(b, x + 160, b.cy, 0.3);
    },
  },
  {
    // Bloominators on mounds lob spike balls in arcs; crawlers below.
    id: 'garden', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      const x = b.cx, len = b.rng.int(36, 46) * S;
      b.hills(len, 2 * S, 2);
      const n = 1 + Math.round(t * 2);
      for (let k = 0; k < n; k++) {
        const fx = x + 288 + k * Math.round((len - 448) / Math.max(1, n));
        b.spawn('bloominator', fx, b.groundAt(fx) - 12, { period: Math.round(lerp(170, 120, t)), phase: k * 50 });
      }
      maybeMonitor(b, x + 96, b.groundAt(x + 96), 0.3);
    },
  },
  {
    // Orbinauts hover over the path: run under; jump into one and its
    // orbiting spikes catch you unless the gap lines up.
    id: 'orbinauts', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      const x = b.cx, y = b.cy, len = b.rng.int(30, 40) * S;
      b.flat(len);
      const n = 1 + Math.round(t * 2);
      for (let k = 0; k < n; k++) {
        const ox = x + 288 + k * 208;
        b.spawn('orbinaut', ox, y - 68, {});
        b.ringLine(ox - 40, y - 120, ox + 40, y - 120, 3);
      }
    },
  },
  {
    // Turbo Spikers: spiked on top, so stomping hurts. Roll into them.
    id: 'spikers', weight: 1, maxSpeed: HAZARD_SPEED,
    build(b) {
      const t = tierT(b);
      const x = b.cx, len = b.rng.int(30, 38) * S;
      b.flat(len);
      const n = 1 + Math.round(t * 2);
      for (let k = 0; k < n; k++) b.spawn('spiker', x + 320 + k * 192, b.cy - 11, { dir: -1, range: 32 });
    },
  },
];

// ---------------------------------------------------------------- objects

function burst(core, x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    core.objects.spawn('debris', x, y, { xsp: Math.cos(a) * 2.5, ysp: Math.sin(a) * 2.5 - 1, life: 30, color });
  }
}

// One frame of a crusher's cycle: up (wait) → warn (shake) → slam → hold → rise.
function crusherNext(o, k) {
  const t = k.t + 1, bottom = o.ground - o.h;
  if (k.state === 'up') return t >= o.up ? { state: 'warn', t: 0, cy: k.cy } : { ...k, t };
  if (k.state === 'warn') return t >= 20 ? { state: 'slam', t: 0, cy: k.cy } : { ...k, t };
  if (k.state === 'slam') {
    const cy = Math.min(bottom, k.cy + 12);
    return cy === bottom ? { state: 'hold', t: 0, cy } : { state: 'slam', t, cy };
  }
  if (k.state === 'hold') return t >= 24 ? { state: 'rise', t: 0, cy: k.cy } : { ...k, t };
  const cy = Math.max(o.top, k.cy - 2);
  return cy === o.top ? { state: 'up', t: 0, cy } : { state: 'rise', t, cy };
}

export const gimmickObjects = {
  vine: {
    w: 0, h: 0,
    update(o, core) {
      const p = core.player, g = core.registry.physics.grv;
      if (p.ext.swing === o) return; // the swing hook drives a held vine
      o.w += -(g / o.L) * Math.sin(o.a);
      o.w *= 0.995;
      o.a += o.w;
      if (o.cool > 0) { o.cool--; return; }
      if (p.ext.swing || p.dead || p.hurt || p.spindash) return;
      const hx = o.x + o.L * Math.sin(o.a), hy = o.y + o.L * Math.cos(o.a);
      if (Math.hypot(p.x - hx, p.y - p.hr + 4 - hy) > 22) return;
      p.ground = false;
      p.rolling = false;
      p.uncurl();
      p.ext.gliding = p.ext.climbing = false;
      p.jumping = false;
      o.w = (p.xsp * Math.cos(o.a) - p.ysp * Math.sin(o.a)) / o.L;
      p.ext.swing = o;
      core.events.push('grab');
    },
    draw(ctx, o) {
      const hx = o.x + o.L * Math.sin(o.a), hy = o.y + o.L * Math.cos(o.a);
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(o.x - 10, o.y - 4, 20, 6);
      ctx.strokeStyle = '#3f8f4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.quadraticCurveTo((o.x + hx) / 2 - o.w * 200, (o.y + hy) / 2, hx, hy);
      ctx.stroke();
      ctx.fillStyle = '#9be07a';
      for (let k = 1; k < 5; k++) {
        const u = k / 5;
        ctx.fillRect(o.x + (hx - o.x) * u - 2, o.y + (hy - o.y) * u - 1, 4, 3);
      }
      ctx.fillStyle = '#c9ced8';
      ctx.fillRect(hx - 7, hy - 2, 14, 4);
    },
  },

  vent: {
    w: 0, h: 0,
    update(o, core) {
      if ((core.frame + o.id * 17) % o.period !== 0) return;
      o.n = (o.n ?? 0) + 1;
      core.objects.spawn('bubble', o.x, o.y - 6, { big: o.n % 3 === 0, x0: o.x, life: 600 });
    },
    draw(ctx, o) {
      ctx.fillStyle = '#4a5a6e';
      ctx.fillRect(o.x - 6, o.y - 3, 12, 4);
    },
  },

  // Rising air bubble. The big ones refill your air, S3K-style: you stop
  // for a gulp.
  bubble: {
    w: 7, h: 7,
    update(o, core) {
      o.y -= o.big ? 0.75 : 1.1;
      o.x = o.x0 + Math.sin(o.t * 0.12) * 3;
      const l = core.world.liquidAt(o.x);
      if (--o.life <= 0 || !l || o.y < l.y) o.alive = false;
    },
    touch(o, p, core) {
      if (!o.big || !p.wet) return;
      p.air = AIR;
      p.xsp = p.ysp = 0;
      if (p.ground) p.gsp = 0;
      p.ext.gulp = 16;
      o.alive = false;
      core.events.push('gulp');
    },
    draw(ctx, o) {
      ctx.strokeStyle = 'rgba(220, 250, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.big ? 7 : 2.5, 0, TAU);
      ctx.stroke();
      if (o.big) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(o.x - 3, o.y - 4, 2, 2); }
    },
  },

  jawz: {
    w: 12, h: 6,
    update(o) {
      o.x -= 1.5;
      if (o.x < o.xa) o.x = o.xb;
    },
    touch: stomp,
    draw(ctx, o) {
      ctx.fillStyle = '#5a7ab0';
      ctx.beginPath();
      ctx.moveTo(o.x - 14, o.y); ctx.lineTo(o.x + 8, o.y - 6); ctx.lineTo(o.x + 14, o.y); ctx.lineTo(o.x + 8, o.y + 6);
      ctx.fill();
      ctx.fillStyle = '#e8f0ff';
      for (let i = 0; i < 3; i++) ctx.fillRect(o.x - 12 + i * 3, o.y + 1, 2, 2);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(o.x + 8, o.y - 2, 2, 2);
    },
  },

  // Fires a fireball straight up out of the lava every `period` frames.
  spout: {
    w: 0, h: 0,
    update(o, core) {
      const t = (core.frame + o.phase) % o.period;
      if (t === 0) core.objects.spawn('shot', o.x, o.y, { xsp: 0, ysp: -6.5, grav: 0.1875, life: 72, fire: true, r: 6 });
    },
    // Frames until the next fireball would be in the way.
    clearFor(o, core) {
      const t = (core.frame + o.phase) % o.period;
      return t < 72 ? 0 : o.period - t;
    },
  },

  balloon: {
    w: 11, h: 12,
    update(o) { if (o.popT > 0 && --o.popT === 0) o.popped = false; },
    touch(o, p, core) {
      if (o.popped || p.dead) return;
      o.popped = true;
      o.popT = 150;
      p.ysp = -7;
      p.ground = false;
      p.jumping = false;
      p.ext.gliding = false;
      p.ext.used = false;
      core.score += 10;
      core.events.push('pop');
      burst(core, o.x, o.y, ['#ff4d6d', '#ffd23a', '#4dd2ff', '#9d7cff'][o.hue], 6);
    },
    draw(ctx, o, f) {
      if (o.popped) return;
      const c = ['#ff4d6d', '#ffd23a', '#4dd2ff', '#9d7cff'][o.hue];
      const bob = Math.sin((f + o.id * 9) * 0.06) * 2;
      ctx.strokeStyle = '#e8e4df';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(o.x, o.y + 12 + bob); ctx.lineTo(o.x + 2, o.y + 24 + bob); ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(o.x, o.y + bob, 11, 13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(o.x - 4, o.y - 5 + bob, 3, 4, -0.4, 0, TAU); ctx.fill();
    },
  },

  bumper: {
    w: 12, h: 12,
    touch(o, p, core) {
      if ((o.cool ?? 0) > core.frame) return;
      const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
      p.xsp = (dx / d) * 7;
      p.ysp = (dy / d) * 7;
      p.ground = false;
      p.jumping = false;
      p.ext.gliding = false;
      p.ext.used = false;
      o.cool = core.frame + 8;
      o.flash = 8;
      if ((o.hits = (o.hits ?? 0) + 1) <= 10) core.score += 10;
      core.events.push('bump');
    },
    draw(ctx, o) {
      const r = 12 + (o.flash > 0 ? 3 : 0);
      if (o.flash > 0) o.flash--;
      ctx.fillStyle = '#1d1a2b';
      ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = o.flash > 0 ? '#ffffff' : '#ff4dc4';
      ctx.beginPath(); ctx.arc(o.x, o.y, r - 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7cf7ff';
      ctx.beginPath(); ctx.arc(o.x, o.y, r - 7, 0, TAU); ctx.fill();
    },
  },

  // A piston block that owns its pixels. Cycle: up (waits `up` frames),
  // shakes 20, slams at 12 px/frame, holds 24, rises at 2 px/frame.
  crusher: {
    w: 24, h: 28,
    init(o) { o.state = 'up'; o.n = o.phase ?? 0; o.top = o.y; o.cy = o.y; },
    update(o, core) {
      const w = core.world;
      const prev = o.cy;
      const k = crusherNext(o, { state: o.state, t: o.n, cy: o.cy });
      if (k.state === 'slam' && o.state === 'warn') core.events.push('slam');
      o.state = k.state; o.n = k.t; o.cy = k.cy;
      if (o.cy !== prev || !o.drawn) {
        w.fillRect(o.x0, Math.round(prev), o.x1, Math.round(prev) + o.h, 0);
        w.fillRect(o.x0, Math.round(o.cy), o.x1, Math.round(o.cy) + o.h, px(BOTH, MAT.METAL));
        o.drawn = true;
      }
      o.y = o.cy + o.h / 2;
      const p = core.player;
      if (p.dead || core.mighty()) return;
      const inX = p.x + p.wr > o.x0 && p.x - p.wr < o.x1;
      if (inX && o.state === 'slam' && p.y - p.hr < o.cy + o.h && p.y + p.hr > o.cy) {
        if (p.ground) { core.kill(false); core.events.push('crush'); }
        else { p.ysp = Math.max(p.ysp, 6); }
      }
    },
    // Frames you can spend underneath before it next comes down.
    clearFor(o) {
      if (o.state === 'up') return o.up - o.n + 20;
      if (o.state === 'warn') return 20 - o.n;
      return 0;
    },
    // Exact forecast: is the column below y = head open `dt` frames from now?
    openAt(o, dt, head) {
      let k = { state: o.state, t: o.n, cy: o.cy };
      for (let i = 0; i < dt; i++) k = crusherNext(o, k);
      return k.cy + o.h < head - 2 && k.state !== 'slam';
    },
    draw(ctx, o, f) {
      const shake = o.state === 'warn' ? ((f >> 1) & 1 ? 1 : -1) : 0;
      ctx.fillStyle = '#2c2f3c';
      ctx.fillRect(o.x0 + 18, o.top - 400, 12, o.cy - o.top + 400);
      ctx.fillStyle = '#5a6074';
      ctx.fillRect(o.x0 + shake, o.cy, o.x1 - o.x0, o.h);
      ctx.fillStyle = '#ffd23a';
      for (let i = 0; i < 4; i++) ctx.fillRect(o.x0 + 4 + i * 12 + shake, o.cy + o.h - 6, 6, 6);
      ctx.fillStyle = '#8a91a8';
      ctx.fillRect(o.x0 + 2 + shake, o.cy + 2, o.x1 - o.x0 - 4, 3);
    },
  },

  rhinobot: {
    w: 14, h: 10,
    init(o) { o.x0 = o.x; o.mode = 'patrol'; o.v = 0; },
    update(o, core) {
      const p = core.player;
      const ahead = (p.x - o.x) * o.dir;
      if (o.mode === 'patrol') {
        o.x += o.dir * 0.75;
        if (Math.abs(o.x - o.x0) > 48) o.dir = -o.dir;
        if (ahead > 0 && ahead < 200 && Math.abs(p.y - o.y) < 40) { o.mode = 'charge'; o.v = 0; core.events.push('rev'); }
      } else if (o.mode === 'charge') {
        o.v = Math.min(4, o.v + 0.25);
        o.x += o.dir * o.v;
        if (ahead < -48 || Math.abs(o.x - o.x0) > 200) o.mode = 'skid';
      } else {
        o.v = Math.max(0, o.v - 0.2);
        o.x += o.dir * o.v;
        if (o.v === 0) { o.dir = -o.dir; o.mode = 'patrol'; o.x0 = o.x; }
      }
      const h = core.world.cast(o.x, o.y + o.h, 0, 1, 1, true, 24);
      if (h) o.y += h.dist;
    },
    touch: stomp,
    draw(ctx, o, f) {
      const d = o.dir;
      ctx.fillStyle = '#2a2233';
      ctx.fillRect(o.x - 10, o.y + 6, 5, 4); ctx.fillRect(o.x + 5, o.y + 6, 5, 4);
      ctx.fillStyle = '#5a7ab0';
      ctx.beginPath(); ctx.ellipse(o.x, o.y, 15, 9, 0, Math.PI, TAU); ctx.fill();
      ctx.fillRect(o.x - 15, o.y, 30, 6);
      ctx.fillStyle = '#e8e4df';
      ctx.beginPath(); ctx.moveTo(o.x + d * 12, o.y - 2); ctx.lineTo(o.x + d * 22, o.y - 8); ctx.lineTo(o.x + d * 15, o.y + 2); ctx.fill();
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(o.x + d * 6 - 1, o.y - 5, 3, 3);
      if (o.mode === 'charge' && (f >> 1) & 1) {
        ctx.fillStyle = 'rgba(232,228,223,0.6)';
        ctx.fillRect(o.x - d * 20, o.y + 6, 6, 3);
      }
    },
  },

  bloominator: {
    w: 10, h: 12,
    update(o, core) {
      if ((core.frame + o.phase) % o.period !== 0) return;
      for (const s of [-1, 1]) core.objects.spawn('shot', o.x, o.y - 12, { xsp: s * 1.6, ysp: -5.5, grav: 0.1875, life: 120 });
      o.fire = 10;
    },
    touch: stomp,
    draw(ctx, o) {
      ctx.fillStyle = '#2f7f3a';
      ctx.fillRect(o.x - 2, o.y - 2, 4, 14);
      ctx.fillStyle = '#3fb05a';
      ctx.beginPath(); ctx.ellipse(o.x - 6, o.y + 6, 6, 3, -0.5, 0, TAU); ctx.ellipse(o.x + 6, o.y + 6, 6, 3, 0.5, 0, TAU); ctx.fill();
      const open = o.fire > 0 ? (o.fire--, 4) : 0;
      ctx.fillStyle = '#ff4d6d';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath(); ctx.ellipse(o.x + Math.cos(a) * (6 + open), o.y - 10 + Math.sin(a) * (6 + open), 4, 3, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath(); ctx.arc(o.x, o.y - 10, 4, 0, TAU); ctx.fill();
    },
  },

  // A core with four spikes orbiting it. The core can be stomped; the
  // spikes hurt from any side.
  orbinaut: {
    w: 7, h: 7,
    init(o) { o.x0 = o.x; o.spin = 0; },
    update(o, core) {
      const p = core.player;
      o.spin += 0.045;
      if (Math.abs(p.x - o.x) < 220) o.x += Math.sign(p.x - o.x) * 0.4;
      if (p.dead || p.hurt || core.mighty()) return;
      for (let k = 0; k < 4; k++) {
        const a = o.spin + (k * TAU) / 4;
        if (Math.hypot(p.x - (o.x + Math.cos(a) * 22), p.y - (o.y + Math.sin(a) * 22)) < 6 + p.wr) {
          core.hurt(o.x);
          return;
        }
      }
    },
    touch: stomp,
    draw(ctx, o) {
      ctx.fillStyle = '#9aa3d6';
      ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(o.x - 3, o.y - 2, 2, 3); ctx.fillRect(o.x + 1, o.y - 2, 2, 3);
      for (let k = 0; k < 4; k++) {
        const a = o.spin + (k * TAU) / 4, sx = o.x + Math.cos(a) * 22, sy = o.y + Math.sin(a) * 22;
        ctx.fillStyle = '#c9ced8';
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5b6170';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
    },
  },

  // Turbo Spiker: a spike on top, so landing on it hurts. Roll or spindash
  // into its side, or be invincible.
  spiker: {
    w: 12, h: 10,
    update(o, core) {
      o.x += o.dir * 0.5;
      if (o.x - o.x0 > o.range) o.dir = -1;
      else if (o.x - o.x0 < -o.range) o.dir = 1;
      const h = core.world.cast(o.x, o.y + o.h, 0, 1, 1, true, 24);
      if (h) o.y += h.dist;
    },
    touch(o, p, core) {
      const fromAbove = p.y + p.hr < o.y + 2 && p.ysp >= 0;
      if (core.mighty() || ((p.curled || p.spindash) && !fromAbove)) return stomp(o, p, core);
      core.hurt(o.x);
    },
    draw(ctx, o) {
      ctx.fillStyle = '#2a2233';
      ctx.fillRect(o.x - 9, o.y + 6, 4, 4); ctx.fillRect(o.x + 5, o.y + 6, 4, 4);
      ctx.fillStyle = '#d6455b';
      ctx.beginPath(); ctx.ellipse(o.x, o.y + 2, 13, 9, 0, Math.PI, TAU); ctx.fill();
      ctx.fillRect(o.x - 13, o.y + 2, 26, 4);
      ctx.fillStyle = '#e8e4df';
      ctx.beginPath(); ctx.moveTo(o.x - 5, o.y - 6); ctx.lineTo(o.x, o.y - 20); ctx.lineTo(o.x + 5, o.y - 6); ctx.fill();
    },
  },
};

// ------------------------------------------------------------------ hooks

// Swinging: a held vine is a pendulum. Left/right pump it, jump lets go on
// the tangent with a small hop. Landing or getting hurt drops the vine.
export const gimmickHooks = {
  beforeAir(p, inp, ev) {
    const s = p.ext.swing;
    if (!s) return false;
    if (p.hurt || p.dead) { p.ext.swing = null; return false; }
    if (inp.jumpPressed) {
      const v = s.w * s.L;
      p.xsp = v * Math.cos(s.a);
      p.ysp = -v * Math.sin(s.a) - 3.5;
      p.jumping = true;
      p.curl();
      p.ext.swing = null;
      p.ext.used = false;
      s.cool = 24;
      p.facing = p.xsp >= 0 ? 1 : -1;
      ev.push('jump');
      return true;
    }
    s.w += -(p.P.grv / s.L) * Math.sin(s.a) + (inp.right ? 1 : inp.left ? -1 : 0) * 0.0007 * Math.cos(s.a);
    s.w *= 0.999;
    s.a += s.w;
    p.xsp = s.x + s.L * Math.sin(s.a) - p.x;
    p.ysp = s.y + s.L * Math.cos(s.a) + p.hr - 4 - p.y;
    p.facing = s.w >= 0 ? 1 : -1;
    return true;
  },
  onLand(p) {
    p.ext.swing = null;
  },
  onStep(core) {
    const g = core.player.ext;
    if (g.gulp > 0) g.gulp--;
  },
};

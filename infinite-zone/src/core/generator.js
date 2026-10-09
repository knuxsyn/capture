// The generator is a sampler over a grammar. Each production ("segment")
// maps (entry height, difficulty, rng) to terrain + objects + exit height.
// Segments chain left to right forever; the world streams ahead of the
// player and is pruned behind.
import { WORLD, ZONE_LEN } from './constants.js';
import { createRng, mix } from './rng.js';
import { MAT, BOTH, TOP, SOLID_A, SOLID_B, px } from './world.js';

const TAU = Math.PI * 2;
const smooth = (t) => t * t * (3 - 2 * t);

export const difficulty = (i) => 1 - Math.exp(-i / 40);

export class Generator {
  constructor(core) {
    this.core = core;
    this.world = core.world;
    this.objects = core.objects;
    this.x = 0;
    this.y = 1024;
    this.i = 0;
    this.segments = [];
    this.last = null;
    this.v = 0; // expected ground speed of a player holding right
  }

  ensure(xMax) {
    while (this.x < xMax) this.next();
  }

  // Choose the next production. Index 0 is the start; every 10th is a
  // checkpoint. Otherwise weighted by difficulty, never the same id twice.
  // `calm` excludes hazards (productions that declare maxSpeed).
  choose(rng, d, calm = false) {
    const reg = this.core.registry.segments;
    if (this.i === 0 && reg.has('start')) return reg.get('start');
    if (this.i % 10 === 0 && reg.has('checkpoint')) return reg.get('checkpoint');
    const pool = [];
    let total = 0;
    for (const s of reg.values()) {
      if (!s.weight || (s.minD ?? 0) > d || s.id === this.last || (calm && s.maxSpeed)) continue;
      const wgt = typeof s.weight === 'function' ? s.weight(d) : s.weight;
      if (wgt <= 0) continue;
      pool.push([s, wgt]);
      total += wgt;
    }
    let r = rng.next() * total;
    for (const [s, wgt] of pool) if ((r -= wgt) <= 0) return s;
    return pool[pool.length - 1][0];
  }

  next() {
    const rng = createRng(mix(this.core.seed, this.i));
    const d = difficulty(this.i);
    let prod = this.choose(rng, d);
    // Speed budget: a hazard is only fair if it's on screen long enough to
    // react to. Arriving faster than it allows, climb first (a brake) or,
    // with no headroom to climb, pick something without hazards.
    if (prod.maxSpeed && this.v > prod.maxSpeed) {
      const brake = this.core.registry.segments.get('brake');
      prod = brake && this.y - WORLD.Y_TOP >= 96 ? brake : this.choose(rng, d, true);
    }
    const b = new Builder(this, rng, d);
    prod.build(b);
    const seg = {
      id: prod.id, i: this.i, zone: Math.floor(this.i / ZONE_LEN),
      x0: this.x, x1: b.cx, y0: this.y, y1: b.cy, yLow: b.yLow, yHigh: b.yHigh,
      vIn: this.v, vOut: b.v,
    };
    this.segments.push(seg);
    for (const f of this.core.registry.hooks.onSegment) f(seg, this.core);
    this.x = b.cx;
    this.y = b.cy;
    this.v = b.v;
    this.last = prod.id;
    this.i++;
    return seg;
  }

  at(x) {
    const s = this.segments;
    let lo = 0, hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid].x0 <= x) lo = mid; else hi = mid - 1;
    }
    return s[lo];
  }

  prune(xMin) {
    while (this.segments.length > 2 && this.segments[1].x1 < xMin) this.segments.shift();
  }
}

// The builder is the vocabulary productions write with. Terrain ops advance
// a cursor (cx, cy) at the ground surface; placement ops do not.
export class Builder {
  constructor(gen, rng, d) {
    this.world = gen.world;
    this.objects = gen.objects;
    this.rng = rng;
    this.d = d;
    this.index = gen.i;
    this.x0 = this.cx = gen.x;
    this.y0 = this.cy = gen.y;
    this.yLow = gen.y;
    this.yHigh = gen.y;
    this.mat = MAT.GROUND;
    this.P = gen.core.registry.physics;
    this.v = gen.v;
  }

  // Integrate the expected speed of a player holding right across one
  // step of surface: v dv = (input accel - slope factor * sin) ds.
  advance(dx, dy) {
    const P = this.P, ds = Math.hypot(dx, dy), sin = -dy / ds, below = this.v < P.top;
    const a = (below ? P.acc : 0) - P.slp * sin;
    this.v = Math.sqrt(Math.max(0.25, this.v * this.v + 2 * a * ds));
    if (below && sin >= 0 && this.v > P.top) this.v = P.top;
  }

  // Physics-derived reach, so productions stay traversable when a cart
  // changes gravity or jump strength.
  jumpHeight() { return (this.P.jmp * this.P.jmp) / (2 * this.P.grv); }
  jumpRange() { return (this.P.top * 2 * this.P.jmp) / this.P.grv; }
  springHeight(power) { return (power * power) / (2 * this.P.grv); }

  track(y) {
    if (y > this.yLow) this.yLow = y;
    if (y < this.yHigh) this.yHigh = y;
  }

  column(x, y) {
    this.world.fillCol(x, y, y + WORLD.DEPTH, px(BOTH, this.mat));
    this.track(y);
  }

  // Ground whose surface is entry height + f(t), t in [0, 1).
  ground(len, f = () => 0) {
    len = Math.round(len);
    const x0 = Math.round(this.cx), y0 = this.cy;
    let prev = y0;
    for (let i = 0; i < len; i++) {
      const y = Math.round(y0 + f(i / len));
      this.column(x0 + i, y);
      this.advance(1, y - prev);
      prev = y;
    }
    this.cx = x0 + len;
    this.cy = Math.round(y0 + f(1));
    return this;
  }

  flat(len) { return this.ground(len); }
  slope(len, dy) { return this.ground(len, (t) => dy * smooth(t)); }
  hills(len, amp, n = 1) { return this.ground(len, (t) => (-amp * (1 - Math.cos(TAU * n * t))) / 2); }
  dip(len, depth) { return this.ground(len, (t) => depth * Math.sin(Math.PI * t) ** 2); }

  gap(len, dy = 0) {
    this.cx += Math.round(len);
    this.cy += Math.round(dy);
    this.track(this.cy);
    return this;
  }

  // Vertical cliff: the next ground op starts dy higher or lower.
  step(dy) {
    this.cy += Math.round(dy);
    return this;
  }

  // Clamp a height change so the surface stays inside the play band;
  // flips direction first if that fits.
  room(dy) {
    const lo = WORLD.Y_TOP, hi = WORLD.Y_BOT;
    if (this.cy + dy < lo || this.cy + dy > hi) dy = -dy;
    return Math.max(lo - this.cy, Math.min(hi - this.cy, dy));
  }

  platform(x, y, w, h = 12, mat = MAT.WOOD) {
    this.world.fillRect(x, y, x + w, y + h, px(BOTH | TOP, mat));
    this.track(y);
  }

  block(x, y, w, h, mat = MAT.ROCK) {
    this.world.fillRect(x, y, x + w, y + h, px(BOTH, mat));
  }

  // A 360-degree loop of inner radius r on flat ground. The right half is
  // solid only on layer A, the left half only on layer B, the crown on both.
  // Swappers flip layers: enter on A, cross the crown leftward -> B, exit,
  // then reset to A.
  loop(r, T = 16) {
    const lead = 64;
    const xL = Math.round(this.cx), yf = this.cy;
    this.flat(lead + 2 * (r + T) + lead);
    const cx = xL + lead + r + T, cy = yf - r;
    const crown = cy - r * 0.5;
    // Below the equator the outside is filled down to the floor, so the
    // ring never forms an acute overhang a player could run into.
    for (let x = cx - r - T; x < cx + r + T; x++) {
      for (let y = cy - r - T; y < yf; y++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < r || (d >= r + T && y < cy)) continue;
        const solid = y < crown ? BOTH : x >= cx ? SOLID_A : SOLID_B;
        this.world.set(x, y, px(solid, MAT.ROCK));
      }
    }
    const ya = cy - r - T - 48, yb = yf + 32;
    this.spawn('swap', xL + lead / 2, yf, { ya, yb, right: 0, left: 0 });
    this.spawn('swap', cx, cy - r, { ya: cy - r - T - 8, yb: crown + 8, right: 0, left: 1 });
    this.spawn('swap', cx + r + T + lead / 2, yf, { ya, yb, right: 0, left: 1 });
    this.track(cy - r - T);
    return { cx, cy, r };
  }

  spawn(type, x, y, props) {
    return this.objects.spawn(type, Math.round(x), Math.round(y), props);
  }

  ring(x, y) { return this.spawn('ring', x, y); }

  ringLine(x0, y0, x1, y1, n) {
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0.5 : k / (n - 1);
      this.ring(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }

  ringArc(cx, cy, r, a0, a1, n) {
    for (let k = 0; k < n; k++) {
      const a = a0 + ((a1 - a0) * k) / Math.max(1, n - 1);
      this.ring(cx + Math.cos(a) * r, cy - Math.sin(a) * r);
    }
  }

  // Surface height at x on layer A (first solid pixel from the top band).
  groundAt(x, from = WORLD.Y_TOP - 320) {
    x = Math.round(x);
    for (let y = Math.max(0, from); y < WORLD.H; y++) {
      if (this.world.get(x, y) & SOLID_A) return y;
    }
    return null;
  }
}

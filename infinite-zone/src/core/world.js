// The world: an x-unbounded, chunked collision bitmap with two collision
// layers (S3K "paths") so loops can be entered from one side and exited
// from the other. One byte per pixel:
//   bit 0  solid on layer A        bit 2  top-only (jump-through)
//   bit 1  solid on layer B        bits 4-7  material id (render only)
import { WORLD } from './constants.js';

const SHIFT = 7;                 // log2(CHUNK)
const MASK = WORLD.CHUNK - 1;
export const CHUNK_ROWS = WORLD.H >> SHIFT; // chunks per column
const ROWS = CHUNK_ROWS;
const TAU = Math.PI * 2;

export const SOLID_A = 1;
export const SOLID_B = 2;
export const BOTH = 3;
export const TOP = 4;
// CRACKED: breakable rock (render + climb rules). CRUMBLE: platforms that fall.
// METAL: solids an object owns and draws itself (monitors, crushers).
// SKIM: the water surface film, solid only while world.skim is set.
export const MAT = Object.freeze({ GROUND: 0, ROCK: 1, WOOD: 2, METAL: 3, CRACKED: 4, CRUMBLE: 5, SKIM: 6 });
export const px = (solid, mat = 0) => solid | (mat << 4);

// Ground modes: 0 floor, 1 right wall, 2 ceiling, 3 left wall.
// DOWN is the sensor cast direction (toward the surface); ALONG is the
// direction of positive ground speed.
export const DOWN = [[0, 1], [1, 0], [0, -1], [-1, 0]];
export const ALONG = [[1, 0], [0, -1], [-1, 0], [0, 1]];
const CARDINAL = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

export class World {
  constructor() {
    this.chunks = new Map();
    this.dirty = new Set();
    // Liquids: { x0, x1, y, kind: 'water' | 'lava' }, kept in x order.
    this.liquids = [];
    // The water film is solid only while this is set (the core sets it
    // when the player moves fast enough to skim the surface).
    this.skim = false;
  }

  // A body of liquid: surface y over [x0, x1), down to `bottom` (for the
  // renderer; physics only reads the surface).
  addLiquid(x0, x1, y, kind, bottom = y + 256) {
    this.liquids.push({ x0, x1, y, kind, bottom });
    this.liquids.sort((a, b) => a.x0 - b.x0);
  }

  liquidAt(x) {
    for (const l of this.liquids) {
      if (l.x0 > x) return null;
      if (x < l.x1) return l;
    }
    return null;
  }

  key(cx, cy) { return cx * ROWS + cy; }

  chunk(cx, cy, make) {
    const k = cx * ROWS + cy;
    let c = this.chunks.get(k);
    if (!c && make) {
      c = new Uint8Array(WORLD.CHUNK * WORLD.CHUNK);
      this.chunks.set(k, c);
    }
    return c;
  }

  get(x, y) {
    if (y < 0 || y >= WORLD.H || x < 0) return 0;
    const c = this.chunks.get((x >> SHIFT) * ROWS + (y >> SHIFT));
    return c ? c[((y & MASK) << SHIFT) | (x & MASK)] : 0;
  }

  set(x, y, v) {
    if (y < 0 || y >= WORLD.H || x < 0) return;
    const cx = x >> SHIFT, cy = y >> SHIFT;
    this.chunk(cx, cy, true)[((y & MASK) << SHIFT) | (x & MASK)] = v;
    this.dirty.add(cx * ROWS + cy);
  }

  // Fill one pixel column over [y0, y1). `quiet` skips the redraw flag, for
  // object-owned solids (METAL) that draw themselves and change every frame.
  fillCol(x, y0, y1, v, quiet = false) {
    y0 = Math.max(0, Math.floor(y0));
    y1 = Math.min(WORLD.H, Math.floor(y1));
    if (x < 0 || y0 >= y1) return;
    const cx = x >> SHIFT, lx = x & MASK;
    for (let y = y0; y < y1;) {
      const cy = y >> SHIFT, end = Math.min(y1, (cy + 1) << SHIFT);
      const c = this.chunk(cx, cy, true);
      for (; y < end; y++) c[((y & MASK) << SHIFT) | lx] = v;
      if (!quiet) this.dirty.add(cx * ROWS + cy);
    }
  }

  fillRect(x0, y0, x1, y1, v, quiet = false) {
    for (let x = Math.floor(x0); x < x1; x++) this.fillCol(x, y0, y1, v, quiet);
  }

  solid(x, y, mask, top) {
    const v = this.get(x, y);
    if ((v & mask) === 0 || (!top && (v & TOP) !== 0)) return false;
    return v >> 4 !== MAT.SKIM || this.skim;
  }

  // Cast a sensor from (x, y) along (dx, dy). Returns { dist, x, y } where
  // x/y is the first solid pixel along the ray and dist is how far to move
  // so the sensor pixel sits just before it: 0 = touching, negative =
  // embedded, positive = surface ahead. null if nothing within range.
  cast(x, y, dx, dy, mask, top, range = 32) {
    const sx = Math.floor(x), sy = Math.floor(y);
    if (this.solid(sx, sy, mask, top)) {
      for (let k = 1; k <= range; k++) {
        if (!this.solid(sx - k * dx, sy - k * dy, mask, top)) {
          return { dist: -k, x: sx - (k - 1) * dx, y: sy - (k - 1) * dy };
        }
      }
      return { dist: -range - 1, x: sx, y: sy };
    }
    for (let k = 1; k <= range; k++) {
      if (this.solid(sx + k * dx, sy + k * dy, mask, top)) {
        return { dist: k - 1, x: sx + k * dx, y: sy + k * dy };
      }
    }
    return null;
  }

  // Surface pixel near (x, y) along (dx, dy), within +/- reach.
  probe(x, y, dx, dy, mask, top, reach) {
    if (this.solid(x, y, mask, top)) {
      for (let k = 1; k <= reach; k++) {
        if (!this.solid(x - k * dx, y - k * dy, mask, top)) return [x - (k - 1) * dx, y - (k - 1) * dy];
      }
      return null;
    }
    for (let k = 1; k <= reach; k++) {
      if (this.solid(x + k * dx, y + k * dy, mask, top)) return [x + k * dx, y + k * dy];
    }
    return null;
  }

  // Surface angle at a hit pixel: fit a chord through the surface probed
  // K px either side. Angles are radians, counterclockwise on screen,
  // 0 = flat floor, PI/2 = right wall. A probe that jumps more than 10 px
  // is a ledge, not a slope, so it is dropped: standing at an edge reads
  // flat. Wide chords are preferred; a narrow one resolves steep curves.
  angleAt(hx, hy, mode, mask, top) {
    const [dx, dy] = DOWN[mode], [tx, ty] = ALONG[mode];
    const chord = (a, b) => (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) + TAU) % TAU;
    const h = [hx, hy];
    let one = null;
    for (const K of [8, 4]) {
      const ok = (p) => p && Math.abs((p[0] - hx) * dx + (p[1] - hy) * dy) <= 10 ? p : null;
      const f = ok(this.probe(hx + tx * K, hy + ty * K, dx, dy, mask, top, 16));
      const b = ok(this.probe(hx - tx * K, hy - ty * K, dx, dy, mask, top, 16));
      if (f && b) return chord(b, f);
      if (!one && (f || b)) one = f ? chord(h, f) : chord(b, h);
    }
    return one ?? CARDINAL[mode];
  }

  // Drop chunks wholly left of xMin.
  prune(xMin) {
    this.liquids = this.liquids.filter((l) => l.x1 >= xMin);
    const cmin = Math.floor(xMin / WORLD.CHUNK);
    for (const k of this.chunks.keys()) {
      if (Math.floor(k / ROWS) < cmin) {
        this.chunks.delete(k);
        this.dirty.delete(k);
      }
    }
  }
}

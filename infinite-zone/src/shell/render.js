// Canvas renderer. Reads the core, never writes it. Terrain is painted
// per 128x128 chunk into cached canvases; color comes from the zone
// palette and each pixel's depth below the surface.
import { WORLD } from '../core/constants.js';
import { CHUNK_ROWS, MAT, DOWN, ALONG } from '../core/world.js';
import { modeOf } from '../core/player.js';
import { Camera, VIEW_W, VIEW_H } from '../core/camera.js';
import { createRng, mix } from '../core/rng.js';

const C = WORLD.CHUNK;
const TAU = Math.PI * 2;

const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
};

function compile(z) {
  return {
    grass: z.grass.map(rgb), soil: z.soil.map(rgb), rock: z.rock.map(rgb), wood: z.wood.map(rgb),
    pattern: z.pattern ?? 'strata',
  };
}

function hash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// Which of the soil tones (0-2 body, 3 dark) a pixel takes under a pattern.
function soilTone(pattern, wx, wy, wob) {
  switch (pattern) {
    case 'bricks': {
      const sx = wx + ((wy >> 3) & 1) * 8;
      return (wy & 7) === 0 || (sx & 15) === 0 ? 3 : (sx >> 4) & 1;
    }
    case 'pebbles': {
      const h = hash(wx >> 2, wy >> 2) % 13;
      return h === 0 ? 0 : h === 1 ? 2 : h === 2 ? 3 : 1;
    }
    case 'diagonal': return ((wx + wy) >> 4) % 3;
    case 'columns': return ((wx + (wob >> 1)) >> 3) % 3;
    case 'waves': return (((wy + Math.round(Math.sin(wx * 0.07 + (wy >> 4)) * 3)) >> 3) % 3 + 3) % 3;
    default: return (hash(wx, wy) & 127) === 0 ? 3 : ((wy + wob) >> 3) % 3;
  }
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Parallax strips, generated once per zone and tiling every 512 px. The
// skyline style and its random features come from the zone's own rng.
const BW = 512;

function silhouette(g, H, top) {
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= BW; x += 2) g.lineTo(x, top(x));
  g.lineTo(BW, H);
  g.fill();
}

// Draw a feature three times (x - BW, x, x + BW) so the strip wraps.
function wrapped(fn) {
  for (const o of [-BW, 0, BW]) fn(o);
}

function backdrop(z, rng) {
  const far = makeCanvas(BW, 140), mid = makeCanvas(BW, 100), sky = makeCanvas(BW, 80), stars = makeCanvas(BW, 140);
  const ph = rng.range(0, TAU), ph2 = rng.range(0, TAU);
  const wave = (x, f, p) => Math.sin((x / BW) * TAU * f + p);
  let g = far.getContext('2d');
  g.fillStyle = z.far;
  const style = z.skyline ?? 'peaks';
  if (style === 'sea') {
    // Islands on the horizon over open water with a shimmer.
    for (let k = 0; k < 4; k++) {
      const x = rng.range(0, BW), w = rng.range(40, 110), h = rng.range(10, 34);
      wrapped((o) => { g.beginPath(); g.ellipse(x + o, 112, w / 2, h, 0, Math.PI, TAU); g.fill(); });
    }
    g.fillStyle = z.water ?? z.far;
    g.fillRect(0, 112, BW, 28);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let k = 0; k < 40; k++) g.fillRect(Math.floor(rng.range(0, BW)), Math.floor(rng.range(115, 138)), Math.floor(rng.range(4, 14)), 1);
  } else if (style === 'canyon') {
    // Layered mesas, the far rank paler.
    for (const [tint, base, n] of [[0.35, 104, 5], [0, 122, 6]]) {
      for (let k = 0; k < n; k++) {
        const x = rng.range(0, BW), w = rng.range(50, 130), h = rng.range(30, 80);
        wrapped((o) => {
          g.globalAlpha = 1 - tint;
          g.beginPath();
          g.moveTo(x + o - w / 2 - 14, 140); g.lineTo(x + o - w / 2, base - h);
          g.lineTo(x + o + w / 2, base - h); g.lineTo(x + o + w / 2 + 14, 140); g.fill();
        });
      }
    }
    g.globalAlpha = 1;
  } else if (style === 'ruins') {
    // A broken colonnade with arches; lit windows when the zone glows.
    for (let x0 = 0; x0 < BW; x0 += rng.int(40, 64)) {
      const h = rng.range(50, 115), w = rng.range(16, 28);
      g.fillRect(x0, 140 - h, w, h);
      if (rng.chance(0.5)) g.fillRect(x0 - 4, 140 - h - 6, w + 8, 6);
      if (rng.chance(0.4)) {
        g.beginPath();
        g.arc(x0 + w + 14, 140 - h * 0.55, 18, Math.PI, TAU);
        g.lineWidth = 6; g.strokeStyle = z.far; g.stroke();
      }
      if (z.glow) {
        g.fillStyle = z.glow;
        g.globalAlpha = 0.5;
        for (let y = 140 - h + 10; y < 132; y += 14) if (rng.chance(0.45)) g.fillRect(x0 + 5, y, 4, 5);
        g.globalAlpha = 1;
        g.fillStyle = z.far;
      }
    }
    g.fillRect(0, 128, BW, 12);
  } else if (style === 'spires') {
    for (let k = 0; k < 14; k++) {
      const x = rng.range(0, BW), w = rng.range(10, 26), h = rng.range(50, 125);
      wrapped((o) => { g.beginPath(); g.moveTo(x + o - w, 140); g.lineTo(x + o, 140 - h); g.lineTo(x + o + w, 140); g.fill(); });
    }
    g.fillRect(0, 120, BW, 20);
  } else if (style === 'mesas') {
    for (let k = 0; k < 6; k++) {
      const x = rng.range(0, BW), w = rng.range(50, 120), h = rng.range(40, 92);
      wrapped((o) => {
        g.beginPath();
        g.moveTo(x + o - w / 2 - 12, 140); g.lineTo(x + o - w / 2, 140 - h);
        g.lineTo(x + o + w / 2, 140 - h); g.lineTo(x + o + w / 2 + 12, 140); g.fill();
      });
    }
    g.fillRect(0, 118, BW, 22);
  } else if (style === 'rolling') {
    silhouette(g, 140, (x) => 92 - 18 * wave(x, 2, ph) - 9 * wave(x, 3, ph2));
  } else {
    silhouette(g, 140, (x) => 70 - 34 * wave(x, 2, ph) - 18 * wave(x, 5, ph2) - 8 * wave(x, 11, ph));
  }

  g = mid.getContext('2d');
  g.fillStyle = z.mid;
  const ridge = (x) => 46 - 18 * wave(x, 3, ph2) - 10 * wave(x, 7, ph);
  if (style === 'sea') {
    // Palms on a low dune.
    silhouette(g, 100, (x) => 84 - 6 * wave(x, 2, ph2));
    for (let k = 0; k < 7; k++) {
      const x = rng.range(0, BW), h = rng.range(36, 62), lean = rng.range(-14, 14);
      wrapped((o) => {
        g.strokeStyle = z.mid;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x + o, 86);
        g.quadraticCurveTo(x + o + lean * 0.3, 86 - h / 2, x + o + lean, 86 - h);
        g.stroke();
        g.lineWidth = 2.5;
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * TAU, len = 16 + (j % 2) * 4;
          g.beginPath();
          g.moveTo(x + o + lean, 86 - h);
          g.quadraticCurveTo(x + o + lean + Math.cos(a) * len * 0.6, 86 - h - 8, x + o + lean + Math.cos(a) * len, 86 - h + Math.abs(Math.sin(a)) * 10 + 4);
          g.stroke();
        }
      });
    }
  } else if (style === 'canyon') {
    // Hoodoos: tall rock pillars with caps.
    silhouette(g, 100, (x) => 88 - 4 * wave(x, 3, ph));
    for (let k = 0; k < 9; k++) {
      const x = rng.range(0, BW), w = rng.range(8, 16), h = rng.range(30, 70);
      wrapped((o) => {
        g.fillRect(x + o - w / 2, 92 - h, w, h);
        g.beginPath();
        g.ellipse(x + o, 92 - h, w * 0.9, 5, 0, 0, TAU);
        g.fill();
      });
    }
  } else if (style === 'ruins') {
    // Rubble and toppled columns.
    silhouette(g, 100, (x) => 82 - 5 * wave(x, 5, ph) - 3 * wave(x, 11, ph2));
    for (let k = 0; k < 8; k++) {
      const x = rng.range(0, BW), w = rng.range(10, 18), h = rng.range(18, 50);
      wrapped((o) => {
        g.fillRect(x + o, 84 - h, w, h);
        g.beginPath();
        g.moveTo(x + o, 84 - h); g.lineTo(x + o + w * 0.4, 84 - h - 6); g.lineTo(x + o + w, 84 - h); g.fill();
      });
    }
  } else if (style === 'canopy') {
    for (let k = 0; k < 26; k++) {
      const x = rng.range(0, BW), r = rng.range(9, 18), y = rng.range(30, 52);
      wrapped((o) => { g.beginPath(); g.arc(x + o, y, r, 0, TAU); g.fill(); g.fillRect(x + o - r, y, 2 * r, 100 - y); });
    }
  } else {
    silhouette(g, 100, ridge);
    g.globalAlpha = 0.18;
    g.fillStyle = '#ffffff';
    for (let x = 0; x < BW; x += 4) g.fillRect(x, ridge(x), 4, 2);
    g.globalAlpha = 1;
  }

  g = sky.getContext('2d');
  g.fillStyle = z.cloud;
  const clouds = z.stars ? 3 : rng.int(3, 9);
  for (let k = 0; k < clouds; k++) {
    const cx = rng.range(0, BW), cy = rng.range(14, 60), r = rng.range(8, 22);
    g.globalAlpha = z.stars ? 0.25 : 0.55;
    for (let j = 0; j < 4; j++) {
      wrapped((o) => { g.beginPath(); g.ellipse(cx + o + j * r * 0.8, cy + (j % 2) * 3, r, r * 0.55, 0, 0, TAU); g.fill(); });
    }
  }
  if (z.stars) {
    g = stars.getContext('2d');
    for (let k = 0; k < 90; k++) {
      g.fillStyle = rng.chance(0.2) ? '#ffe9b0' : '#ffffff';
      g.globalAlpha = rng.range(0.4, 1);
      g.fillRect(Math.floor(rng.range(0, BW)), Math.floor(rng.range(0, 130)), 1, 1);
    }
  }
  return { far, mid, sky, stars: z.stars ? stars : null };
}

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.cache = new Map();
    this.pals = new Map();
    this.backs = new Map();
    this.cam = new Camera();
    this.skin = null; // SpriteSkin, or null for the built-in runner
    this.debug = false;
    this.core = null;
    this.zi = undefined;
    this.fade = 0;
    this.runPhase = 0;
  }

  attach(core) {
    this.core = core;
    this.cache.clear();
    this.pals.clear();
    this.backs.clear();
    this.zi = undefined;
    this.fade = 0;
    this.snap();
  }

  snap() {
    this.cam.snap(this.core.player);
  }

  follow() {
    this.cam.follow(this.core);
  }

  pal(zi) {
    if (!this.pals.has(zi)) this.pals.set(zi, compile(this.core.zoneInfo(zi)));
    return this.pals.get(zi);
  }

  back(zi) {
    if (!this.backs.has(zi)) this.backs.set(zi, backdrop(this.core.zoneInfo(zi), createRng(mix(this.core.seed ^ 0xbac4, zi))));
    return this.backs.get(zi);
  }

  chunkCanvas(k) {
    const core = this.core, world = core.world;
    const cx = Math.floor(k / CHUNK_ROWS), cy = k - cx * CHUNK_ROWS;
    const zi = core.gen.at(cx * C + C / 2).zone;
    const hit = this.cache.get(k);
    if (hit && hit.zi === zi && !world.dirty.has(k)) return hit.cv;
    world.dirty.delete(k);
    const data = world.chunks.get(k);
    const cv = hit?.cv ?? makeCanvas(C, C);
    const img = new ImageData(C, C);
    const out = new Uint32Array(img.data.buffer);
    const P = this.pal(zi);
    const x0 = cx * C, y0 = cy * C;
    for (let x = 0; x < C; x++) {
      const wx = x0 + x;
      let run = 0;
      while (run < 12 && world.get(wx, y0 - 1 - run) & 3) run++;
      const wob = Math.round(Math.sin(wx * 0.045) * 3 + Math.sin(wx * 0.013) * 5);
      for (let y = 0; y < C; y++) {
        const v = data[(y << 7) | x];
        if (!(v & 3)) { run = 0; continue; }
        const d = run++;
        const wy = y0 + y, mat = v >> 4;
        let c;
        if (mat === MAT.CRACKED) {
          // Stacked stone slabs, staggered per row, with dark seams and
          // a few diagonal fractures.
          const row = Math.floor(wy / 10), sx = wx + (row & 1) * 9;
          const seam = wy % 10 === 0 || sx % 18 === 0;
          const fracture = (wx + wy * 2) % 29 === 0 && hash(sx >> 4, row) % 3 === 0;
          c = d < 2 ? P.rock[0] : seam || fracture ? P.soil[3] : hash(sx >> 4, row) & 1 ? P.rock[1] : P.rock[2];
        } else if (mat === MAT.CRUMBLE) {
          c = d < 2 ? P.wood[0] : wx % 14 === 0 || d > 8 ? P.wood[2] : P.wood[1];
        } else if (mat === MAT.ROCK) {
          c = d < 2 ? P.rock[0] : ((wx + wy) >> 3) & 1 ? P.rock[1] : P.rock[2];
        } else if (mat === MAT.WOOD) {
          c = d < 2 ? P.wood[0] : (wx & 15) === 0 || d > 9 ? P.wood[2] : P.wood[1];
        } else if (d < 2) c = P.grass[0];
        else if (d < 5) c = P.grass[1];
        else if (d < 7 + (hash(wx, 7) & 1)) c = P.grass[2];
        else if (d < 9) c = P.soil[3];
        else c = P.soil[soilTone(P.pattern, wx, wy, wob)];
        out[(y << 7) | x] = c;
      }
    }
    cv.getContext('2d').putImageData(img, 0, 0);
    this.cache.set(k, { cv, zi });
    return cv;
  }

  draw(frame) {
    const core = this.core, ctx = this.ctx, world = core.world;
    const camX = Math.round(this.cam.x), camY = Math.round(this.cam.y);
    const zi = core.gen.at(camX + VIEW_W / 2).zone;
    if (this.zi === undefined) this.zi = zi;
    if (zi !== this.zi) {
      this.fromZi = this.zi;
      this.zi = zi;
      this.fade = 1;
    }
    this.sky(core.zoneInfo(zi), zi, camX, camY, 1);
    if (this.fade > 0) {
      this.sky(core.zoneInfo(this.fromZi), this.fromZi, camX, camY, this.fade);
      this.fade = Math.max(0, this.fade - 1 / 60);
    }

    const c0 = Math.floor(camX / C), c1 = Math.floor((camX + VIEW_W) / C);
    const r0 = Math.max(0, Math.floor(camY / C)), r1 = Math.min(CHUNK_ROWS - 1, Math.floor((camY + VIEW_H) / C));
    for (let cx = c0; cx <= c1; cx++) {
      for (let cy = r0; cy <= r1; cy++) {
        const k = cx * CHUNK_ROWS + cy;
        if (!world.chunks.has(k)) continue;
        ctx.drawImage(this.chunkCanvas(k), cx * C - camX, cy * C - camY);
      }
    }
    if (frame % 120 === 0) {
      for (const k of this.cache.keys()) if (!world.chunks.has(k)) this.cache.delete(k);
    }

    ctx.save();
    ctx.translate(-camX, -camY);
    const types = core.registry.types;
    if (frame % 600 === 0) {
      for (const k of this.pals.keys()) if (k < zi - 1) { this.pals.delete(k); this.backs.delete(k); }
    }
    for (const o of core.objects.near(camX - 48, camX + VIEW_W + 48)) {
      if (o.y < camY - 64 || o.y > camY + VIEW_H + 64) continue;
      types.get(o.type).draw?.(ctx, o, frame);
    }
    this.player(ctx, core.player, frame);
    if (this.debug) this.overlay(ctx, camX, camY);
    ctx.restore();
  }

  sky(z, zi, camX, camY, alpha) {
    const ctx = this.ctx, b = this.back(zi);
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, z.sky[0]);
    g.addColorStop(1, z.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const lift = Math.max(-24, Math.min(24, (camY - 1000) * 0.04));
    const strip = (cv, f, y) => {
      const off = -(((camX * f) % 512) + 512) % 512;
      for (let x = off; x < VIEW_W; x += 512) ctx.drawImage(cv, Math.round(x), Math.round(y));
    };
    if (b.stars) strip(b.stars, 0.02, 0);
    strip(b.sky, 0.04, 6 - lift * 0.3);
    strip(b.far, 0.12, VIEW_H - 150 - lift);
    strip(b.mid, 0.28, VIEW_H - 84 - lift * 1.6);
    ctx.globalAlpha = 1;
  }

  player(ctx, p, frame) {
    if (p.invuln > 0 && !p.hurt && (frame >> 2) & 1) return;
    if (this.skin?.draw(ctx, p)) return;
    for (const f of this.core.registry.hooks.drawPlayer) if (f(ctx, p, frame)) return;
    const x = Math.round(p.x), y = Math.round(p.y);
    ctx.save();
    ctx.translate(x, y);
    if (p.curled || p.spindash) {
      this.ball(ctx, p, frame);
    } else {
      if (p.ground) ctx.rotate(-p.angle);
      ctx.scale(p.facing, 1);
      this.body(ctx, p, frame);
    }
    ctx.restore();
  }

  ball(ctx, p, frame) {
    const spin = p.spindash ? frame * 0.9 : frame * (0.3 + Math.min(Math.abs(p.gsp || p.xsp), 12) * 0.05);
    ctx.rotate(spin * p.facing);
    ctx.fillStyle = '#ffb03b';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.35) * 11, Math.sin(a - 0.35) * 11);
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.lineTo(Math.cos(a + 0.35) * 11, Math.sin(a + 0.35) * 11);
      ctx.fill();
    }
    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffe3c2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0.3, 2.2);
    ctx.stroke();
    if (p.spindash) {
      ctx.rotate(-spin * p.facing);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 3; i++) {
        const d = ((frame * 3 + i * 7) % 18) + 8;
        ctx.beginPath();
        ctx.arc(-p.facing * d, 11 - (d % 5), 2.5 - d / 12, 0, TAU);
        ctx.fill();
      }
    }
  }

  body(ctx, p, frame) {
    const speed = Math.abs(p.gsp);
    const skid = p.ground && speed > 3 && Math.sign(p.gsp) !== p.facing;
    if (p.ground && !p.pushing) this.runPhase += speed * 0.12;
    const crouch = p.crouch ? 4 : 0;
    if (skid) ctx.rotate(-0.25);
    if (p.pushing) ctx.rotate(0.2);
    if (p.hurt || p.dead) ctx.rotate(-0.3);

    // legs and shoes
    ctx.strokeStyle = '#ff6b4a';
    ctx.fillStyle = '#2ec4b6';
    ctx.lineWidth = 3;
    if (p.ground && speed >= 6) {
      ctx.strokeStyle = '#2ec4b6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(1, 13, 8, 5, 0, 0, TAU);
      ctx.stroke();
    } else {
      const ph = p.ground && speed > 0.2 ? this.runPhase : 0;
      for (const s of [0, Math.PI]) {
        const fx = p.ground ? Math.sin(ph + s) * Math.min(7, 2 + speed * 1.5) : s ? -4 : 5;
        const fy = p.ground ? 16 - Math.max(0, Math.cos(ph + s)) * 3 : 13;
        ctx.beginPath();
        ctx.moveTo(s ? -2 : 2, 6);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(fx - 3, fy - 1, 9, 4, 2);
        ctx.fill();
      }
    }

    // crest
    ctx.fillStyle = '#ffb03b';
    ctx.beginPath();
    ctx.moveTo(-5, -11 + crouch); ctx.lineTo(-18, -15 + crouch); ctx.lineTo(-8, -4 + crouch);
    ctx.moveTo(-8, -5 + crouch); ctx.lineTo(-20, -3 + crouch); ctx.lineTo(-8, 2 + crouch);
    ctx.moveTo(-7, 1 + crouch); ctx.lineTo(-16, 8 + crouch); ctx.lineTo(-4, 6 + crouch);
    ctx.fill();

    // body
    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath();
    ctx.ellipse(0, -1 + crouch, 10, 11 - crouch / 2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffe3c2';
    ctx.beginPath();
    ctx.ellipse(3.5, 3 + crouch, 5, 6 - crouch / 2, 0, 0, TAU);
    ctx.fill();

    // eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(5, -5 + crouch, 3.4, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b1b2f';
    if (p.dead) {
      ctx.fillRect(4, -7 + crouch, 4, 1);
      ctx.fillRect(4, -4 + crouch, 4, 1);
    } else {
      ctx.beginPath();
      ctx.arc(6.5, -5 + crouch, 1.7, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#1b1b2f';
    ctx.fillRect(9, -2 + crouch, 2, 2);
  }

  overlay(ctx, camX, camY) {
    const core = this.core, p = core.player;
    ctx.lineWidth = 1;
    for (const s of core.gen.segments) {
      if (s.x1 < camX || s.x0 > camX + VIEW_W) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(s.x0 + 0.5, camY);
      ctx.lineTo(s.x0 + 0.5, camY + VIEW_H);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.fillText(`#${s.i} ${s.id}`, s.x0 + 3, camY + 52);
    }
    for (const o of core.objects.near(camX, camX + VIEW_W)) {
      if (o.type !== 'swap') continue;
      ctx.strokeStyle = o.left ? '#ff3df2' : '#3dfff2';
      ctx.beginPath();
      ctx.moveTo(o.x + 0.5, o.ya);
      ctx.lineTo(o.x + 0.5, o.yb);
      ctx.stroke();
    }
    const mode = p.ground ? modeOf(p.angle) : 0;
    const [dx, dy] = DOWN[mode], [tx, ty] = ALONG[mode];
    ctx.strokeStyle = '#00ff66';
    for (const s of [-1, 1]) {
      const sx = p.x + dx * p.hr + s * tx * p.wr, sy = p.y + dy * p.hr + s * ty * p.wr;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dx * 16, sy + dy * 16);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ff4466';
    ctx.beginPath();
    ctx.moveTo(p.x - core.registry.physics.pushR, p.y);
    ctx.lineTo(p.x + core.registry.physics.pushR, p.y);
    ctx.stroke();
  }

  debugText() {
    const p = this.core.player, s = this.core.gen.at(p.x);
    const deg = Math.round((p.angle * 180) / Math.PI);
    return `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}\ngsp ${p.gsp.toFixed(3)}  xsp ${p.xsp.toFixed(2)}  ysp ${p.ysp.toFixed(2)}\nangle ${deg}°  mode ${['floor', 'r-wall', 'ceiling', 'l-wall'][p.mode]}  layer ${'AB'[p.layer]}\n#${s.i} ${s.id}  zone ${s.zone} act ${s.act + 1}  v ${s.vIn.toFixed(1)}`;
  }
}

// Canvas renderer. Reads the core, never writes it. Terrain is painted
// per 128x128 chunk into cached canvases; color comes from the zone
// palette and each pixel's depth below the surface.
import { WORLD } from '../core/constants.js';
import { CHUNK_ROWS, MAT, DOWN, ALONG } from '../core/world.js';
import { modeOf } from '../core/player.js';

export const VIEW_W = 400;
export const VIEW_H = 224;
const C = WORLD.CHUNK;
const TAU = Math.PI * 2;

const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
};

function compile(z) {
  return {
    grass: z.grass.map(rgb), soil: z.soil.map(rgb), rock: z.rock.map(rgb), wood: z.wood.map(rgb),
  };
}

function hash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Parallax strips, generated once per zone. Tiles every 512 px.
function backdrop(z, i) {
  const W = 512;
  const far = makeCanvas(W, 140), mid = makeCanvas(W, 100), sky = makeCanvas(W, 80);
  let g = far.getContext('2d');
  g.fillStyle = z.far;
  g.beginPath();
  g.moveTo(0, 140);
  for (let x = 0; x <= W; x += 4) {
    const t = (x / W) * TAU;
    const y = 70 - 34 * Math.sin(t * 2 + i) - 18 * Math.sin(t * 5 + i * 3) - 8 * Math.sin(t * 11);
    g.lineTo(x, y);
  }
  g.lineTo(W, 140);
  g.fill();
  g = mid.getContext('2d');
  g.fillStyle = z.mid;
  g.beginPath();
  g.moveTo(0, 100);
  for (let x = 0; x <= W; x += 4) {
    const t = (x / W) * TAU;
    g.lineTo(x, 46 - 18 * Math.sin(t * 3 + i * 2) - 10 * Math.sin(t * 7 + 1));
  }
  g.lineTo(W, 100);
  g.fill();
  g.globalAlpha = 0.18;
  g.fillStyle = '#ffffff';
  for (let x = 0; x < W; x += 4) {
    const t = (x / W) * TAU;
    g.fillRect(x, 46 - 18 * Math.sin(t * 3 + i * 2) - 10 * Math.sin(t * 7 + 1), 4, 2);
  }
  g = sky.getContext('2d');
  g.fillStyle = z.cloud;
  for (let k = 0; k < 7; k++) {
    const cx = (k * 83 + i * 37) % W, cy = 18 + ((k * 29) % 44), r = 10 + ((k * 13) % 12);
    g.globalAlpha = 0.55;
    for (let j = 0; j < 4; j++) {
      g.beginPath();
      g.ellipse(cx + j * r * 0.8, cy + (j % 2) * 3, r, r * 0.55, 0, 0, TAU);
      g.fill();
    }
  }
  return { far, mid, sky };
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
    this.cam = { x: 0, y: 0 };
    this.look = 0;
    this.debug = false;
    this.core = null;
    this.zi = undefined;
    this.fade = 0;
    this.runPhase = 0;
  }

  attach(core) {
    this.core = core;
    this.cache.clear();
    this.zi = undefined;
    this.fade = 0;
    this.snap();
  }

  snap() {
    const p = this.core.player;
    this.cam.x = Math.max(0, p.x - VIEW_W / 2);
    this.cam.y = p.y - VIEW_H / 2 + 8;
    this.look = 0;
  }

  pal(zi) {
    const zones = this.core.registry.zones;
    const k = zi % zones.length;
    if (!this.pals.has(k)) this.pals.set(k, compile(zones[k]));
    return this.pals.get(k);
  }

  back(zi) {
    const zones = this.core.registry.zones;
    const k = zi % zones.length;
    if (!this.backs.has(k)) this.backs.set(k, backdrop(zones[k], k));
    return this.backs.get(k);
  }

  follow() {
    const core = this.core, p = core.player;
    if (core.events.includes('respawn')) this.snap();
    const target = Math.max(-48, Math.min(72, p.xsp * 10));
    this.look += (target - this.look) * 0.04;
    const tx = p.x - VIEW_W / 2 + this.look;
    this.cam.x += Math.max(-24, Math.min(24, tx - this.cam.x));
    this.cam.x = Math.max(0, this.cam.x);
    if (p.dead) return;
    let ty = p.y - VIEW_H / 2 + 8;
    if (!p.ground) {
      const dy = ty - this.cam.y;
      ty = Math.abs(dy) < 32 ? this.cam.y : this.cam.y + dy - Math.sign(dy) * 32;
    }
    const v = !p.ground || Math.abs(p.gsp) > 8 ? 16 : 6;
    this.cam.y += Math.max(-v, Math.min(v, ty - this.cam.y));
    const seg = core.gen.at(p.x);
    this.cam.y = Math.min(this.cam.y, seg.yLow + 150 - VIEW_H);
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
        if (mat === MAT.ROCK) {
          c = d < 2 ? P.rock[0] : ((wx + wy) >> 3) & 1 ? P.rock[1] : P.rock[2];
        } else if (mat === MAT.WOOD) {
          c = d < 2 ? P.wood[0] : (wx & 15) === 0 || d > 9 ? P.wood[2] : P.wood[1];
        } else if (d < 2) c = P.grass[0];
        else if (d < 5) c = P.grass[1];
        else if (d < 7 + (hash(wx, 7) & 1)) c = P.grass[2];
        else if (d < 9) c = P.soil[3];
        else if ((hash(wx, wy) & 127) === 0) c = P.soil[3];
        else c = P.soil[((wy + wob) >> 3) % 3];
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
    const zones = core.registry.zones, n = zones.length;
    if (this.zi === undefined) this.zi = zi;
    if (zi !== this.zi) {
      this.fromZi = this.zi;
      this.zi = zi;
      this.fade = 1;
    }
    this.sky(zones[zi % n], zi, camX, camY, 1);
    if (this.fade > 0) {
      this.sky(zones[this.fromZi % n], this.fromZi, camX, camY, this.fade);
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
    strip(b.sky, 0.04, 6 - lift * 0.3);
    strip(b.far, 0.12, VIEW_H - 150 - lift);
    strip(b.mid, 0.28, VIEW_H - 84 - lift * 1.6);
    ctx.globalAlpha = 1;
  }

  player(ctx, p, frame) {
    for (const f of this.core.registry.hooks.drawPlayer) if (f(ctx, p, frame)) return;
    if (p.invuln > 0 && !p.hurt && (frame >> 2) & 1) return;
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
    return `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}\ngsp ${p.gsp.toFixed(3)}  xsp ${p.xsp.toFixed(2)}  ysp ${p.ysp.toFixed(2)}\nangle ${deg}°  mode ${['floor', 'r-wall', 'ceiling', 'l-wall'][p.mode]}  layer ${'AB'[p.layer]}\n#${s.i} ${s.id}  zone ${s.zone}`;
  }
}

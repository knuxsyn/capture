// Character skins. A skin is a sprite sheet plus an atlas that maps
// animation names to frame rectangles. Frames face right; the renderer
// mirrors them. Atlas format:
//   {
//     "name": "My runner",
//     "key": "auto" | "#rrggbb" | ["#rrggbb", ...], // background colors to clear
//     "anims": {
//       "idle": { "frames": [[x, y, w, h], ...], "fps": 6, "pivot": "feet" },
//       "roll": { "frames": [[x, y, w, h, ox, oy], ...], "pivot": "center" },
//       "run":  { "frames": [12, 13, 14, 15] },   // indices into "frames"
//       ...
//     },
//     "frames": [[x, y, w, h], ...]           // optional table (tools/slice.py)
//   }
// pivot "feet" puts the frame's bottom center on the ground under the
// player; "center" centers it on the player. ox/oy override the pivot
// point within a frame. Missing animations fall back along FALLBACK.

export const ANIMS = ['idle', 'bored', 'lookup', 'balance', 'walk', 'run', 'dash', 'roll', 'spindash', 'skid', 'push', 'crouch',
  'spring', 'fall', 'glide', 'glideTurn', 'drop', 'glideSlide', 'getUp', 'climb', 'climbUp', 'hurt', 'die'];

const FALLBACK = {
  dash: 'run', run: 'walk', walk: 'idle', fall: 'walk', spring: 'fall', skid: 'walk',
  push: 'walk', crouch: 'idle', spindash: 'roll', hurt: 'fall', die: 'hurt', roll: 'idle', glide: 'fall',
  bored: 'idle', lookup: 'idle', balance: 'idle', glideTurn: 'glide', drop: 'fall', glideSlide: 'glide',
  getUp: 'crouch', climb: 'fall', climbUp: 'climb',
};

// Which animation a player state shows, S3K-style.
export function animOf(p) {
  if (p.dead) return 'die';
  if (p.hurt) return 'hurt';
  const g = p.ext;
  if (g.ledge > 0) return 'climbUp';
  if (g.climbing) return 'climb';
  if (g.gliding) return g.turn > 0 ? 'glideTurn' : 'glide';
  if (g.slide) return 'glideSlide';
  if (g.getUp > 0) return 'getUp';
  if (g.drop && !p.ground) return 'drop';
  if (g.dropLand > 0) return 'crouch';
  if (p.spindash) return 'spindash';
  if (p.curled) return 'roll';
  if (!p.ground) return p.ext.sprung ? 'spring' : 'fall';
  const s = Math.abs(p.gsp);
  if (p.crouch) return 'crouch';
  if (p.lookUp) return 'lookup';
  if (p.pushing) return 'push';
  if (s > 3 && Math.sign(p.gsp) !== p.facing) return 'skid';
  if (s >= 10) return 'dash';
  if (s >= 6) return 'run';
  if (s > 0) return 'walk';
  if (p.edge) return 'balance';
  return p.idleT > 180 ? 'bored' : 'idle';
}

// Frames to hold each image, from the S3K rules: faster = quicker cycle.
function holdFrames(name, p, fps) {
  const s = Math.abs(p.gsp || p.xsp);
  if (name === 'walk' || name === 'run' || name === 'dash') return Math.max(1, 8 - s);
  if (name === 'roll' || name === 'spindash') return Math.max(1, 4 - s);
  if (name === 'climb') return p.ysp === 0 ? Infinity : 6;
  return Math.max(1, Math.round(60 / (fps || 10)));
}

function keyOut(img, key) {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth || img.width;
  cv.height = img.naturalHeight || img.height;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  if (!key) return cv;
  const data = g.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  const keys = (Array.isArray(key) ? key : [key]).map((k) => {
    const n = k === 'auto' ? (d[0] << 16) | (d[1] << 8) | d[2] : parseInt(k.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  // Small tolerance so recompressed (JPEG/WebP) sheets still key cleanly.
  const near = (i) => keys.some(([r, g2, b]) => Math.abs(d[i] - r) + Math.abs(d[i + 1] - g2) + Math.abs(d[i + 2] - b) < 24);
  for (let i = 0; i < d.length; i += 4) if (near(i)) d[i + 3] = 0;
  g.putImageData(data, 0, 0);
  return cv;
}

export class SpriteSkin {
  constructor(img, atlas) {
    this.name = atlas.name ?? 'Custom skin';
    this.scale = atlas.scale ?? 1;
    this.sheet = keyOut(img, atlas.key ?? 'auto');
    const table = atlas.frames ?? [];
    this.anims = {};
    for (const [k, a] of Object.entries(atlas.anims ?? {})) {
      const frames = (a.frames ?? []).map((f) => (typeof f === 'number' ? table[f] : f)).filter(Boolean);
      this.anims[k] = { ...a, frames };
    }
    this.cur = null;
    this.idx = 0;
    this.t = 0;
  }

  resolve(name) {
    let n = name;
    for (let i = 0; i < 8 && n && !this.anims[n]?.frames?.length; i++) n = FALLBACK[n];
    return n && this.anims[n]?.frames?.length ? n : Object.keys(this.anims)[0];
  }

  draw(ctx, p) {
    const name = this.resolve(animOf(p));
    if (!name) return false;
    const a = this.anims[name];
    if (name !== this.cur) { this.cur = name; this.idx = 0; this.t = 0; }
    if (++this.t >= holdFrames(name, p, a.fps)) {
      this.t = 0;
      this.idx = a.loop === false ? Math.min(this.idx + 1, a.frames.length - 1) : (this.idx + 1) % a.frames.length;
    }
    const [sx, sy, w, h, ox, oy] = a.frames[this.idx % a.frames.length];
    const center = a.pivot === 'center';
    const px = ox ?? w / 2, py = oy ?? (center ? h / 2 : h);
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    // Pixel art rotates in 45-degree steps, like the original's rotated frames.
    if (p.ground && !center) ctx.rotate(-Math.round(p.angle / (Math.PI / 4)) * (Math.PI / 4));
    ctx.scale(p.facing, 1);
    const k = 1 / this.scale;
    ctx.drawImage(this.sheet, sx, sy, w, h, -Math.round(px * k), Math.round((center ? 0 : p.hr) - py * k), Math.round(w * k), Math.round(h * k));
    ctx.restore();
    return true;
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be read. Use a PNG or GIF sprite sheet.'));
    img.src = src;
  });
}


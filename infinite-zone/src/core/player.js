// The player: a sensor-based ground-following state machine in the S3K
// style. Ground speed (gsp) runs along the surface; angle selects one of
// four ground modes so the same code runs floors, walls, ceilings, loops.
import { DOWN, ALONG } from './world.js';

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;

export function modeOf(a) {
  const d = a * DEG;
  if (d <= 45 || d >= 315) return 0;
  if (d < 135) return 1;
  if (d <= 225) return 2;
  return 3;
}

// Quantize to 256 steps (the Genesis angle byte) and snap near-cardinals.
function quant(a) {
  let q = Math.round((a / TAU) * 256) & 255;
  const r = q & 63;
  if (r <= 2) q -= r;
  else if (r >= 62) q = (q + 64 - r) & 255;
  return (q * TAU) / 256;
}

function closer(a, b) {
  if (!a) return b;
  if (!b) return a;
  return b.dist < a.dist ? b : a;
}

export class Player {
  constructor(physics, hooks) {
    this.P = physics;
    this.hooks = hooks;
    this.reset(0, 0);
  }

  reset(x, y) {
    Object.assign(this, {
      x, y, px: x, py: y, xsp: 0, ysp: 0, gsp: 0, angle: 0,
      ground: false, curled: false, rolling: false, jumping: false,
      spindash: false, rev: 0, crouch: false, pushing: false,
      layer: 0, lock: 0, facing: 1, hurt: false, invuln: 0, dead: false,
      mode: 0, ext: {}, lookUp: false, edge: false, idleT: 0,
    });
  }

  get wr() { return this.curled ? this.P.rollW : this.P.standW; }
  get hr() { return this.curled ? this.P.rollH : this.P.standH; }
  get mask() { return this.layer ? 2 : 1; }

  // Changing radii keeps the feet planted: shift the center along "down".
  curl() {
    if (this.curled) return;
    const [dx, dy] = DOWN[this.ground ? modeOf(this.angle) : 0];
    const d = this.P.standH - this.P.rollH;
    this.curled = true;
    this.x += dx * d; this.y += dy * d;
  }

  uncurl() {
    if (!this.curled) return;
    const [dx, dy] = DOWN[this.ground ? modeOf(this.angle) : 0];
    const d = this.P.standH - this.P.rollH;
    this.curled = false;
    this.x -= dx * d; this.y -= dy * d;
  }

  update(inp, w, ev) {
    const P = this.P;
    if (this.dead) {
      this.ysp = Math.min(this.ysp + P.grv, P.maxFall);
      this.y += this.ysp;
      return;
    }
    if (this.ground) this.groundStep(inp, w, ev);
    else this.airStep(inp, w, ev);
    if (this.invuln > 0 && !this.hurt) this.invuln--;
    this.mode = this.ground ? modeOf(this.angle) : 0;
    this.idleT = this.ground && this.gsp === 0 && !this.crouch && !this.lookUp && !this.spindash ? this.idleT + 1 : 0;
  }

  groundStep(inp, w, ev) {
    const P = this.P;

    if (this.spindash) {
      if (inp.down) {
        if (inp.jumpPressed) {
          this.rev = Math.min(this.rev + P.dashRevAdd, P.dashRevMax);
          ev.push('rev');
        }
        this.rev -= Math.floor(this.rev / 0.125) / 256;
        this.gsp = this.xsp = this.ysp = 0;
        this.snap(w);
        return;
      }
      this.spindash = false;
      this.rolling = true;
      this.gsp = (P.dashBase + Math.floor(this.rev) / 2) * this.facing;
      ev.push('dash');
    }

    this.crouch = !this.rolling && inp.down && this.gsp === 0 && modeOf(this.angle) === 0;
    this.lookUp = !this.rolling && !this.crouch && inp.up && this.gsp === 0 && modeOf(this.angle) === 0;
    if (this.crouch && inp.jumpPressed) {
      this.spindash = true;
      this.rev = 0;
      this.curl();
      ev.push('rev');
      return;
    }
    if (inp.jumpPressed && !this.crouch) {
      this.jump(ev);
      return;
    }

    // Slope factor. Like S2/S3K, it only acts on a moving player, so you
    // can stand (and crouch, and spindash) on a floor-mode slope. Steeper
    // ground is handled by the slip check below.
    const sin = Math.sin(this.angle);
    if (this.rolling) {
      this.gsp -= (this.gsp * sin > 0 ? P.slpRollUp : P.slpRollDown) * sin;
    } else if (this.gsp !== 0) {
      this.gsp -= P.slp * sin;
    }

    const L = inp.left && !inp.right && !this.lock;
    const R = inp.right && !inp.left && !this.lock;
    if (this.lock > 0) this.lock--;

    if (!this.rolling) {
      if (L) {
        if (this.gsp > 0) { this.gsp -= P.dec; if (this.gsp <= 0) this.gsp = -0.5; }
        else if (this.gsp > -P.top) this.gsp = Math.max(this.gsp - P.acc, -P.top);
        if (this.gsp <= 0) this.facing = -1;
      } else if (R) {
        if (this.gsp < 0) { this.gsp += P.dec; if (this.gsp >= 0) this.gsp = 0.5; }
        else if (this.gsp < P.top) this.gsp = Math.min(this.gsp + P.acc, P.top);
        if (this.gsp >= 0) this.facing = 1;
      } else {
        this.gsp -= Math.min(Math.abs(this.gsp), P.frc) * Math.sign(this.gsp);
      }
      if (inp.down && !L && !R && Math.abs(this.gsp) >= P.rollMin) {
        this.rolling = true;
        this.curl();
        ev.push('roll');
      }
    } else {
      if (L && this.gsp > 0) this.gsp -= P.rollDec;
      if (R && this.gsp < 0) this.gsp += P.rollDec;
      this.gsp -= Math.min(Math.abs(this.gsp), P.rollFrc) * Math.sign(this.gsp);
      if (Math.abs(this.gsp) < P.unroll) {
        this.rolling = false;
        this.uncurl();
      }
    }

    this.gsp = Math.max(-P.maxGsp, Math.min(P.maxGsp, this.gsp));
    this.xsp = this.gsp * Math.cos(this.angle);
    this.ysp = -this.gsp * sin;

    // Push sensors look one frame ahead along the direction of travel,
    // rotated with the ground mode, so a wall met from any surface stops
    // you (running down a wall into the floor included).
    this.pushing = false;
    if (this.gsp !== 0) {
      const mode = modeOf(this.angle), dir = this.gsp > 0 ? 1 : -1;
      const cx = ALONG[mode][0] * dir, cy = ALONG[mode][1] * dir;
      const off = mode === 0 && this.angle === 0 ? 8 : 0;
      const h = w.cast(
        this.x + this.xsp + cx * P.pushR + DOWN[mode][0] * off,
        this.y + this.ysp + cy * P.pushR + DOWN[mode][1] * off,
        cx, cy, this.mask, false,
      );
      if (h && h.dist < 0 && this.isWall(w, h, cx, cy, dir)) {
        this.xsp += cx * h.dist;
        this.ysp += cy * h.dist;
        this.gsp = 0;
        this.pushing = true;
      }
    }

    this.x += this.xsp;
    this.y += this.ysp;
    if (!this.snap(w)) return;

    // Too slow on a steep surface: slip, or fall off walls and ceilings.
    if (this.lock === 0 && Math.abs(this.gsp) < P.slipSpeed) {
      const d = this.angle * DEG;
      if (d >= 46 && d <= 314) {
        this.lock = P.lockFrames;
        if (d >= 69 && d <= 291) this.detach();
        else this.gsp += d < 180 ? -0.5 : 0.5;
      }
    }
  }

  // A wall is a surface that turns more than 50 degrees away from the
  // ground underfoot. Anything gentler (a loop's quarter-pipe) is a slope
  // the ground sensors will carry us onto.
  isWall(w, h, cx, cy, dir) {
    const m = DOWN.findIndex(([x, y]) => x === cx && y === cy);
    const wa = w.angleAt(h.x, h.y, m, this.mask, false);
    let d = dir > 0 ? wa - this.angle : this.angle - wa;
    d = ((d % TAU) + TAU + Math.PI) % TAU - Math.PI;
    return d > (50 * Math.PI) / 180;
  }

  // Keep the feet on the surface. Returns false if the ground was lost.
  snap(w) {
    const mode = modeOf(this.angle);
    const [dx, dy] = DOWN[mode], [tx, ty] = ALONG[mode];
    const hr = this.hr, wr = this.wr, top = mode === 0;
    const fx = this.x + dx * hr, fy = this.y + dy * hr;
    const a = w.cast(fx - tx * wr, fy - ty * wr, dx, dy, this.mask, top);
    const b = w.cast(fx + tx * wr, fy + ty * wr, dx, dy, this.mask, top);
    const h = closer(a, b);
    // One foot over nothing on flat ground: the player is at a ledge.
    const off = (s) => !s || s.dist > 8;
    this.edge = mode === 0 && off(a) !== off(b);
    const tol = Math.min(Math.max(Math.abs(this.xsp), Math.abs(this.ysp)) + 4, 14);
    if (!h || h.dist > tol) {
      this.detach();
      return false;
    }
    if (h.dist < -14) return true;
    if (dx) this.x = Math.floor(fx) + dx * h.dist - dx * hr;
    else this.y = Math.floor(fy) + dy * h.dist - dy * hr;
    this.angle = quant(w.angleAt(h.x, h.y, mode, this.mask, top));
    return true;
  }

  detach() {
    this.ground = false;
    this.rolling = false;
    this.jumping = false;
  }

  jump(ev) {
    const P = this.P, s = Math.sin(this.angle), c = Math.cos(this.angle);
    this.xsp = this.gsp * c - P.jmp * s;
    this.ysp = -this.gsp * s - P.jmp * c;
    this.curl();
    this.ground = false;
    this.rolling = false;
    this.jumping = true;
    ev.push('jump');
  }

  airStep(inp, w, ev) {
    const P = this.P;
    this.pushing = false;
    this.edge = false;
    this.lookUp = false;
    let handled = false;
    for (const f of this.hooks.beforeAir) {
      if (f(this, inp, ev, w)) { handled = true; break; }
    }
    if (!handled) {
      if (this.jumping && !inp.jump && this.ysp < -P.jmpCut) this.ysp = -P.jmpCut;
      if (!this.hurt) {
        if (inp.left && !inp.right) {
          if (this.xsp > -P.top) this.xsp = Math.max(this.xsp - P.air, -P.top);
          this.facing = -1;
        } else if (inp.right && !inp.left) {
          if (this.xsp < P.top) this.xsp = Math.min(this.xsp + P.air, P.top);
          this.facing = 1;
        }
      }
      if (this.ysp < 0 && this.ysp > -4) this.xsp -= Math.trunc(this.xsp / 0.125) / 256;
    }
    this.x += this.xsp;
    this.y += this.ysp;
    if (!handled) this.ysp = Math.min(this.ysp + (this.hurt ? P.hurtGrv : P.grv), P.maxFall);

    // Ease the sprite back upright.
    if (this.angle !== 0) {
      const step = TAU / 128;
      if (this.angle < Math.PI) this.angle = Math.max(0, this.angle - step);
      else this.angle = this.angle + step >= TAU ? 0 : this.angle + step;
    }
    this.airCollide(w, ev);
  }

  airCollide(w, ev) {
    const P = this.P, m = this.mask, wr = this.wr, hr = this.hr;
    let h = w.cast(this.x + P.pushR, this.y, 1, 0, m, false);
    if (h && h.dist < 0) { this.x += h.dist; if (this.xsp > 0) this.xsp = 0; }
    h = w.cast(this.x - P.pushR, this.y, -1, 0, m, false);
    if (h && h.dist < 0) { this.x -= h.dist; if (this.xsp < 0) this.xsp = 0; }

    if (this.ysp < 0) {
      h = closer(
        w.cast(this.x - wr, this.y - hr, 0, -1, m, false),
        w.cast(this.x + wr, this.y - hr, 0, -1, m, false),
      );
      if (h && h.dist < 0) {
        const a = quant(w.angleAt(h.x, h.y, 2, m, false)), d = a * DEG;
        this.y -= h.dist;
        if ((d > 90 && d <= 135) || (d >= 225 && d < 270)) {
          this.angle = a;
          this.attach(ev);
        } else {
          this.ysp = 0;
        }
      }
      return;
    }

    h = closer(
      w.cast(this.x - wr, this.y + hr, 0, 1, m, true),
      w.cast(this.x + wr, this.y + hr, 0, 1, m, true),
    );
    if (h && h.dist < 0 && h.dist >= -(this.ysp + 16)) {
      this.y = Math.floor(this.y + hr) + h.dist - hr;
      this.angle = quant(w.angleAt(h.x, h.y, 0, m, true));
      this.attach(ev);
    }
  }

  // Landing: project air velocity onto the surface tangent.
  attach(ev) {
    const s = Math.sin(this.angle), c = Math.cos(this.angle), d = this.angle * DEG;
    this.gsp = d < 23 || d > 337 ? this.xsp : this.xsp * c - this.ysp * s;
    this.ground = true;
    this.jumping = false;
    if (this.hurt) {
      this.hurt = false;
      this.gsp = this.xsp = this.ysp = 0;
    }
    this.uncurl();
    for (const f of this.hooks.onLand) f(this, ev);
    ev.push('land');
  }
}

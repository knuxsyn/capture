// What the renderer layers around the player and over the level: water and
// lava, the four shields, invincibility stars, Super's glow, splashes,
// spray, embers and the drowning countdown. Cosmetic only: it reads the
// core and never writes it, so Math.random here can't touch determinism.
import { VIEW_W, VIEW_H } from '../core/camera.js';
import { SUPER_RINGS } from '../core/constants.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const MAX_PARTS = 500;

export class Effects {
  constructor(core) {
    this.core = core;
    this.parts = [];
  }

  add(x, y, vx, vy, life, kind, color, size = 2, grav = 0) {
    if (this.parts.length < MAX_PARTS) this.parts.push({ x, y, vx, vy, life, max: life, kind, color, size, grav });
  }

  // One simulation frame: emit from this frame's events and from states
  // that leave a trail, then move everything.
  step() {
    const core = this.core, p = core.player, w = core.world, f = core.frame;
    const l = w.liquidAt(Math.floor(p.x));
    for (const e of core.events) {
      if (e === 'splash' && l) {
        for (let i = 0; i < 16; i++) {
          this.add(p.x + rand(-8, 8), l.y - 1, rand(-2.5, 2.5) + p.xsp * 0.25, rand(-5.5, -1.5), rand(24, 42), 'drop', i % 3 ? '#a8dcff' : '#ffffff', rand(1.5, 2.6), 0.22);
        }
        this.add(p.x, l.y, 0, 0, 26, 'ripple', '#e6f7ff', 5);
      } else if (e === 'sizzle') {
        for (let i = 0; i < 12; i++) this.add(p.x + rand(-10, 10), p.y + p.hr, rand(-1.5, 1.5), rand(-3.5, -1), rand(20, 36), 'ember', i % 2 ? '#ffb02e' : '#ff5a1a', rand(1.2, 2.2), 0.08);
        for (let i = 0; i < 5; i++) this.add(p.x + rand(-8, 8), p.y, rand(-0.4, 0.4), rand(-1.2, -0.6), rand(30, 50), 'smoke', '#4a4038', rand(4, 7));
      } else if (e === 'super') {
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * TAU;
          this.add(p.x, p.y, Math.cos(a) * 4, Math.sin(a) * 4, 30, 'star', i % 2 ? '#ffffff' : '#ffe27a', 3);
        }
        this.add(p.x, p.y, 0, 0, 24, 'flash', '#ffffff', 40);
      } else if (e === 'unsuper') {
        for (let i = 0; i < 10; i++) this.add(p.x, p.y, rand(-2, 2), rand(-2, 2), 20, 'star', '#ffd0e8', 2);
      } else if (e === 'drown') {
        for (let i = 0; i < 10; i++) this.add(p.x + rand(-6, 6), p.y - 8, rand(-0.6, 0.6), rand(-2, -0.8), 90, 'bubble', '#dff6ff', rand(2, 4));
      } else if (e === 'gulp') {
        this.add(p.x, p.y - 8, 0, 0, 20, 'ripple', '#dff6ff', 3);
      } else if (e === 'bump') {
        this.add(p.x, p.y, 0, 0, 14, 'flash', '#fff6c8', 18);
      } else if (e === 'crush') {
        for (let i = 0; i < 12; i++) this.add(p.x + rand(-20, 20), p.y + p.hr, rand(-3, 3), rand(-2, -0.5), 24, 'dust', '#cfc6b8', rand(3, 6), 0.05);
      }
    }

    if (!p.dead) {
      // Breath bubbles underwater.
      if (p.wet && f % 50 === 0) this.add(p.x + p.facing * 6, p.y - 10, rand(-0.2, 0.2), -0.7, 160, 'bubble', '#dff6ff', rand(1.8, 2.8));
      // Skimming: spray off the heels.
      if (l && l.kind === 'water' && w.skim && p.ground && Math.abs(p.y + p.hr - l.y) < 8) {
        for (let i = 0; i < 2; i++) this.add(p.x - p.facing * 8, l.y - 1, -p.xsp * rand(0.1, 0.35), rand(-2.8, -0.8), rand(14, 24), 'drop', i ? '#ffffff' : '#a8dcff', rand(1.2, 2), 0.2);
        if (f % 6 === 0) this.add(p.x - p.facing * 10, l.y, 0, 0, 20, 'ripple', '#e6f7ff', 3);
      }
      if (core.power.super && f % 3 === 0) {
        const a = rand(0, TAU), r = rand(10, 22);
        this.add(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, -p.xsp * 0.2, -p.ysp * 0.2, 18, 'star', f % 2 ? '#ffffff' : '#ffc6e6', rand(1.5, 3));
      } else if (core.power.invinc > 0 && f % 2 === 0) {
        this.add(p.x + rand(-6, 6), p.y + rand(-12, 12), -p.xsp * 0.3, rand(-0.5, 0.5), 20, 'star', ['#ffffff', '#ffe95a', '#7ff0ff', '#ff8ad8'][(f >> 1) & 3], rand(1.5, 2.5));
      }
      if (core.power.shoes > 0 && p.ground && Math.abs(p.gsp) > 3 && f % 4 === 0) {
        this.add(p.x - p.facing * 6, p.y + p.hr - 2, -p.gsp * 0.1, rand(-0.6, -0.2), 18, 'dust', '#e8e2d6', rand(2, 4));
      }
      if (core.shield === 'fire' && Math.abs(p.xsp) > 4 && f % 2 === 0) {
        this.add(p.x - Math.sign(p.xsp) * 10, p.y + rand(-6, 6), -p.xsp * 0.3, rand(-0.6, 0), 14, 'ember', f % 4 ? '#ff7a1a' : '#ffd23a', rand(1.5, 3));
      }
    }

    // The scenery's own motion: crushers dust the floor, lava spits embers.
    for (const o of core.objects.near(p.x - VIEW_W, p.x + VIEW_W)) {
      if (o.type === 'crusher' && o.state === 'hold' && o.n === 1) {
        for (let x = o.x0; x <= o.x1; x += 8) this.add(x, o.ground, rand(-1.5, 1.5), rand(-1.5, -0.3), 22, 'dust', '#cfc6b8', rand(3, 5), 0.04);
      }
    }
    for (const q of w.liquids) {
      if (q.kind !== 'lava' || q.x1 < p.x - VIEW_W || q.x0 > p.x + VIEW_W) continue;
      if (Math.random() < (q.x1 - q.x0) / 900) this.add(rand(q.x0, q.x1), q.y, rand(-0.3, 0.3), rand(-1.6, -0.6), rand(30, 60), 'ember', Math.random() < 0.5 ? '#ffb02e' : '#ff6a1a', rand(1, 2), 0.01);
    }

    for (const s of this.parts) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += s.grav;
      s.life--;
      if (s.kind === 'bubble') {
        s.x += Math.sin((s.life + s.max) * 0.15) * 0.3;
        const q = w.liquidAt(Math.floor(s.x));
        if (!q || s.y < q.y + 2) s.life = 0;
      } else if (s.kind === 'drop') {
        const q = w.liquidAt(Math.floor(s.x));
        if (q && s.vy > 0 && s.y > q.y) s.life = 0;
      } else if (s.kind === 'smoke' || s.kind === 'dust') {
        s.vx *= 0.94;
        s.size += 0.08;
      }
    }
    this.parts = this.parts.filter((s) => s.life > 0);
  }

  // Behind the player: Super's glow.
  back(ctx, frame) {
    const core = this.core, p = core.player;
    if (!core.power.super || p.dead) return;
    const r = 26 + Math.sin(frame * 0.2) * 3;
    const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, r);
    g.addColorStop(0, 'rgba(255,240,200,0.55)');
    g.addColorStop(0.5, 'rgba(255,150,210,0.25)');
    g.addColorStop(1, 'rgba(255,150,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
  }

  // Super tint for the player sprite. Canvas filters where the browser has
  // them; elsewhere the glow and sparkles carry it.
  tint(ctx, frame) {
    if (!this.core.power.super || !('filter' in ctx)) return false;
    const b = 1.25 + Math.sin(frame * 0.25) * 0.12;
    ctx.filter = `brightness(${b.toFixed(2)}) saturate(0.75) hue-rotate(-18deg)`;
    return true;
  }

  // In front of the player: shields and invincibility.
  front(ctx, frame) {
    const core = this.core, p = core.player;
    if (p.dead || core.power.super) return;
    const x = Math.round(p.x), y = Math.round(p.y) - (p.curled ? 0 : 2);
    if (core.power.invinc > 0) {
      for (let i = 0; i < 8; i++) {
        const a = frame * 0.18 + (i / 8) * TAU, r = i % 2 ? 22 : 17;
        star(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, i % 2 ? 2.5 : 3.5, ['#ffffff', '#ffe95a', '#7ff0ff', '#ff8ad8'][i % 4]);
      }
      return;
    }
    const s = core.shield;
    if (!s) return;
    ctx.save();
    if (s === 'shield') {
      ctx.fillStyle = 'rgba(80,160,255,0.2)';
      ctx.strokeStyle = (frame >> 2) & 1 ? 'rgba(170,220,255,0.9)' : 'rgba(120,190,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(x, y, 17, -2.4, -1.6); ctx.stroke();
    } else if (s === 'fire') {
      // A flame bubble that leans against your motion.
      const lean = Math.max(-1, Math.min(1, -p.xsp / 8));
      for (const [r, c] of [[23, 'rgba(255,70,20,0.35)'], [18, 'rgba(255,140,30,0.45)'], [12, 'rgba(255,220,90,0.4)']]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const a = (i / 16) * TAU, flick = 1 + 0.12 * Math.sin(frame * 0.7 + i * 2.1);
          const up = Math.sin(a) < 0 ? 1 + 0.35 * -Math.sin(a) : 1;
          const px = x + Math.cos(a) * r * flick + lean * r * 0.35 * (1 - Math.cos(a)) * 0.5;
          const py = y + Math.sin(a) * r * flick * up;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.fill();
      }
    } else if (s === 'lightning') {
      ctx.strokeStyle = 'rgba(255,240,140,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * TAU, r = 21 + (Math.random() - 0.5) * 5;
        i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,200,0.15)';
      ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const a = frame * 0.3 + (i / 4) * TAU;
        star(ctx, x + Math.cos(a) * 24, y + Math.sin(a) * 24, 2, '#ffffff');
      }
    } else if (s === 'bubble') {
      const k = 1 + Math.sin(frame * 0.15) * 0.06;
      ctx.translate(x, y);
      ctx.scale(k, 2 - k);
      ctx.fillStyle = 'rgba(110,255,215,0.16)';
      ctx.strokeStyle = 'rgba(190,255,240,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(-6, -7, 7, 3.4, 4.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(9, 10, 3, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // Water tints everything below its surface; lava is opaque and glows.
  liquids(ctx, camX, camY, frame) {
    for (const l of this.core.world.liquids) {
      if (l.x1 < camX || l.x0 > camX + VIEW_W || l.y > camY + VIEW_H || l.bottom < camY) continue;
      const x0 = Math.max(l.x0, camX - 2), x1 = Math.min(l.x1, camX + VIEW_W + 2);
      const wave = (x) => l.y + Math.sin((x + frame * 1.2) * 0.07) * 1.5 + Math.sin((x - frame * 0.8) * 0.031) * 1;
      if (l.kind === 'water') {
        const g = ctx.createLinearGradient(0, l.y, 0, l.bottom + 16);
        g.addColorStop(0, 'rgba(40,140,230,0.30)');
        g.addColorStop(1, 'rgba(10,40,120,0.55)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, l.bottom + 16);
        for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, wave(x));
        ctx.lineTo(x1, l.bottom + 16);
        ctx.fill();
        // Light shafts and the surface line.
        ctx.fillStyle = 'rgba(200,240,255,0.06)';
        for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) {
          const sx = x + Math.sin(frame * 0.02 + x) * 6;
          ctx.beginPath(); ctx.moveTo(sx, l.y); ctx.lineTo(sx + 14, l.y); ctx.lineTo(sx + 40, l.bottom); ctx.lineTo(sx + 20, l.bottom); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(225,248,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 4) x === x0 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x));
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let x = Math.floor(x0 / 32) * 32; x < x1; x += 32) {
          const gx = x + ((frame * 0.5 + x * 0.37) % 32);
          if (gx > x0 && gx < x1) ctx.fillRect(gx, wave(gx) + 2, 4, 1);
        }
      } else {
        const g = ctx.createLinearGradient(0, l.y - 2, 0, l.bottom);
        g.addColorStop(0, '#ffe27a');
        g.addColorStop(0.08, '#ff8a1e');
        g.addColorStop(0.45, '#c8300e');
        g.addColorStop(1, '#5a0c06');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, l.bottom);
        for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, wave(x) - 1);
        ctx.lineTo(x1, l.bottom);
        ctx.fill();
        // Crust plates drifting on the surface, and a heat glow above it.
        ctx.fillStyle = 'rgba(90,20,8,0.55)';
        for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) {
          const cx = x + ((frame * 0.25 + x * 0.61) % 40);
          if (cx > x0 + 4 && cx < x1 - 12) ctx.fillRect(cx, wave(cx) + 3, 10, 2);
        }
        const h = ctx.createLinearGradient(0, l.y - 28, 0, l.y);
        h.addColorStop(0, 'rgba(255,120,30,0)');
        h.addColorStop(1, `rgba(255,120,30,${0.22 + Math.sin(frame * 0.1) * 0.06})`);
        ctx.fillStyle = h;
        ctx.fillRect(x0, l.y - 28, x1 - x0, 28);
      }
    }
  }

  particles(ctx) {
    for (const s of this.parts) {
      const a = Math.min(1, s.life / Math.min(12, s.max));
      ctx.globalAlpha = a;
      if (s.kind === 'star') star(ctx, s.x, s.y, s.size, s.color);
      else if (s.kind === 'ripple') {
        const t = 1 - s.life / s.max;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.size + t * 22, 1 + t * 3, 0, 0, TAU); ctx.stroke();
      } else if (s.kind === 'flash') {
        const t = 1 - s.life / s.max;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (0.3 + t), 0, TAU); ctx.stroke();
      } else if (s.kind === 'bubble') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, TAU); ctx.stroke();
      } else {
        ctx.fillStyle = s.color;
        if (s.kind === 'smoke' || s.kind === 'dust') {
          ctx.globalAlpha = a * 0.5;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, TAU); ctx.fill();
        } else ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  // The S3K drowning countdown: 5 to 0 over the player's head, one number
  // every two seconds once air runs low.
  air(ctx, frame) {
    const p = this.core.player;
    if (!p.wet || p.dead || p.air > 720 || this.core.shield === 'bubble' || this.core.power.super) return;
    const n = Math.floor(p.air / 120);
    const phase = p.air % 120, y = p.y - 44 - (phase > 100 ? (phase - 100) * 0.5 : 0);
    ctx.fillStyle = 'rgba(220,245,255,0.25)';
    ctx.strokeStyle = 'rgba(230,250,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, y, 10, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = (frame >> 3) & 1 ? '#ffffff' : '#ffe14a';
    ctx.font = 'bold 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), p.x, y + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // Screen space: what you're carrying, and the Super prompt.
  status(ctx, frame) {
    const core = this.core, p = core.player;
    const icons = [];
    if (core.shield) icons.push({ shield: '#6fb8ff', fire: '#ff6a2a', lightning: '#ffe14a', bubble: '#7ff0ff' }[core.shield]);
    if (core.power.invinc > 0) icons.push(core.power.invinc > 120 || (frame >> 3) & 1 ? '#ffffff' : null);
    if (core.power.shoes > 0) icons.push(core.power.shoes > 120 || (frame >> 3) & 1 ? '#ff4a6a' : null);
    icons.forEach((c, i) => {
      if (!c) return;
      ctx.fillStyle = 'rgba(10,10,10,0.55)';
      ctx.fillRect(8 + i * 18, VIEW_H - 22, 14, 14);
      ctx.fillStyle = c;
      ctx.fillRect(11 + i * 18, VIEW_H - 19, 8, 8);
    });
    if (core.rings >= SUPER_RINGS && !core.power.super && !p.dead && (frame >> 4) & 1) {
      ctx.font = 'bold 9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,10,10,0.6)';
      ctx.fillRect(VIEW_W / 2 - 62, VIEW_H - 22, 124, 14);
      ctx.fillStyle = '#ffe27a';
      ctx.fillText('JUMP, THEN UP + JUMP: SUPER', VIEW_W / 2, VIEW_H - 12);
      ctx.textAlign = 'left';
    }
  }
}

function star(ctx, x, y, r, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6);
  ctx.lineTo(x + r * 0.4, y - r * 0.4);
  ctx.lineTo(x + r * 1.6, y);
  ctx.lineTo(x + r * 0.4, y + r * 0.4);
  ctx.lineTo(x, y + r * 1.6);
  ctx.lineTo(x - r * 0.4, y + r * 0.4);
  ctx.lineTo(x - r * 1.6, y);
  ctx.lineTo(x - r * 0.4, y - r * 0.4);
  ctx.fill();
}

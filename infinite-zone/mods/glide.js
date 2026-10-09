// Ability cartridge built only from hooks: Knuckles' moveset.
//   Glide: press jump again mid-air; hold to stay up, steer to turn,
//   release to drop. Land while gliding and you belly-slide, then get up.
//   Climb: glide into a wall to grab it. Up/down to climb, jump to kick
//   off, climb past the top to pull yourself onto the ledge.
const TAU = Math.PI * 2;
const LEDGE_FRAMES = 18;
const CRACKED = 4; // world MAT.CRACKED: breakable walls shatter instead of being grabbed
const solidAt = (w, p, x, y) => w.solid(Math.floor(x), Math.floor(y), p.mask, false);
// Only near-vertical, unbroken rock: no cracked walls, and nothing leaning
// over the climber (a loop's inner curve would pin him under it).
const grabbable = (w, p, x, y) => solidAt(w, p, x, y) &&
  w.get(Math.floor(x), Math.floor(y)) >> 4 !== CRACKED &&
  !solidAt(w, p, x - p.facing * 6, y - p.hr - 6);

export const glide = {
  id: 'glide',
  name: 'Glide & Climb',
  blurb: 'Press jump again mid-air to glide. Glide into a wall to grab it, then climb with up and down.',

  hooks: {
    beforeAir(p, inp, ev, w) {
      const g = p.ext, P = p.P;

      if (g.ledge > 0) {
        p.xsp = p.ysp = 0;
        if (--g.ledge === 0) {
          g.climbing = false;
          p.x += p.facing * (P.pushR + 16);
          p.y = g.ledgeY - p.hr - 1;
        }
        return true;
      }

      if (g.climbing) {
        if (inp.jumpPressed) {
          g.climbing = false;
          g.used = false;
          p.facing = -p.facing;
          p.xsp = 4 * p.facing;
          p.ysp = -4;
          p.jumping = true;
          p.curl();
          ev.push('jump');
          return true;
        }
        // Pinned (climbing into an overhang): let go.
        g.stuck = (inp.up || inp.down) && Math.abs(p.y - (g.lastY ?? p.y)) < 0.01 ? (g.stuck ?? 0) + 1 : 0;
        g.lastY = p.y;
        if (g.stuck > 20) { g.climbing = false; g.stuck = 0; return false; }
        p.xsp = 0;
        p.ysp = inp.up ? -1 : inp.down ? 1 : 0;
        const wx = p.x + p.facing * (P.pushR + 2);
        const head = solidAt(w, p, wx, p.y - p.hr + 2), body = solidAt(w, p, wx, p.y);
        if (!head && !body) { g.climbing = false; return false; }
        if (!head) {
          let ty = Math.floor(p.y);
          while (ty > p.y - 64 && solidAt(w, p, wx, ty - 1)) ty--;
          g.ledge = LEDGE_FRAMES;
          g.ledgeY = ty;
          p.ysp = 0;
        }
        return true;
      }

      if (!g.gliding) {
        if (!p.jumping || !inp.jumpPressed || g.used) return false;
        g.gliding = true;
        g.used = true;
        g.drop = false;
        p.xsp = Math.max(Math.abs(p.xsp), 4) * p.facing;
        if (p.ysp < 0) p.ysp = 0;
        ev.push('glide');
        return true;
      }
      if (!inp.jump) {
        g.gliding = false;
        g.drop = true;
        return false;
      }
      if (grabbable(w, p, p.x + p.facing * (P.pushR + 2), p.y)) {
        g.gliding = false;
        g.climbing = true;
        p.uncurl();
        p.xsp = p.ysp = 0;
        ev.push('land');
        return true;
      }
      if ((inp.left && p.facing > 0) || (inp.right && p.facing < 0)) {
        p.facing = -p.facing;
        p.xsp = -p.xsp * 0.5;
        g.turn = 10;
      }
      if (g.turn > 0) g.turn--;
      p.xsp = Math.max(-8, Math.min(8, p.xsp + 0.015625 * p.facing));
      p.ysp = p.ysp < 0.5 ? p.ysp + 0.125 : Math.max(0.5, p.ysp - 0.125);
      return true;
    },

    onLand(p) {
      const g = p.ext;
      if (g.gliding) { g.slide = true; p.lock = 99; }
      else if (g.drop) g.dropLand = 10;
      g.gliding = g.used = g.drop = g.climbing = false;
      g.ledge = 0;
    },

    onStep(core) {
      const p = core.player, g = p.ext;
      if (g.slide) {
        if (!p.ground) g.slide = false;
        else {
          p.gsp -= Math.sign(p.gsp) * Math.min(Math.abs(p.gsp), 0.125);
          if (p.gsp === 0) { g.slide = false; g.getUp = 14; }
        }
      }
      if (g.getUp > 0) { p.lock = Math.max(p.lock, 2); g.getUp--; }
      if (g.dropLand > 0) g.dropLand--;
    },

    // Built-in look while gliding, used when no sprite skin is loaded.
    drawPlayer(ctx, p) {
      if (!p.ext.gliding) return false;
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.scale(p.facing, 1);
      ctx.fillStyle = '#ffb03b';
      ctx.beginPath();
      ctx.moveTo(-6, -6); ctx.lineTo(-22, -10); ctx.lineTo(-8, 0);
      ctx.moveTo(-6, 0); ctx.lineTo(-20, 4); ctx.lineTo(-6, 5);
      ctx.fill();
      ctx.fillStyle = '#ff6b4a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 8, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ff6b4a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, -2);
      ctx.lineTo(18, -4);
      ctx.stroke();
      ctx.fillStyle = '#ffe3c2';
      ctx.beginPath();
      ctx.arc(19, -4, 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(6, -3, 3, 3.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1b1b2f';
      ctx.beginPath();
      ctx.arc(7.5, -3, 1.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      return true;
    },
  },
};

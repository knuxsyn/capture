// Ability cartridge built only from hooks. Press jump again in mid-air to
// glide; hold to keep gliding, release to drop. Speed builds while you glide.
const TAU = Math.PI * 2;

export const glide = {
  id: 'glide',
  name: 'Glide',
  blurb: 'Press jump again mid-air to glide. Hold to stay up, release to drop.',

  hooks: {
    beforeAir(p, inp, ev) {
      const g = p.ext;
      if (!g.gliding) {
        if (!p.jumping || !inp.jumpPressed || g.used) return false;
        g.gliding = true;
        g.used = true;
        p.xsp = Math.max(Math.abs(p.xsp), 4) * p.facing;
        if (p.ysp < 0) p.ysp = 0;
        ev.push('glide');
        return true;
      }
      if (!inp.jump) {
        g.gliding = false;
        return false;
      }
      if ((inp.left && p.facing > 0) || (inp.right && p.facing < 0)) {
        p.facing = -p.facing;
        p.xsp = -p.xsp * 0.5;
      }
      p.xsp = Math.max(-8, Math.min(8, p.xsp + 0.015625 * p.facing));
      p.ysp = p.ysp < 0.5 ? p.ysp + 0.125 : Math.max(0.5, p.ysp - 0.125);
      return true;
    },

    onLand(p) {
      p.ext.gliding = false;
      p.ext.used = false;
    },

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

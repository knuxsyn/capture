// Content cartridge: a new production and a new object type.
// A booster pad launches you up a ramp onto a long bridge above the main
// path. Miss it and the ground route below still carries you through.
const S = 16;

export const skyways = {
  id: 'skyways',
  name: 'Skyways',
  blurb: 'Adds boosters and a high bridge route above the main path.',

  objects: {
    booster: {
      w: 12, h: 6,
      touch(o, p, core) {
        if (!p.ground || p.gsp * o.dir >= 12) return;
        p.gsp = 12 * o.dir;
        p.facing = o.dir;
        core.events.push('dash');
      },
      draw(ctx, o, f) {
        ctx.fillStyle = '#20263a';
        ctx.fillRect(o.x - 14, o.y + 2, 28, 4);
        for (let i = 0; i < 3; i++) {
          const lit = ((f >> 2) + i) % 3 === 0;
          ctx.fillStyle = lit ? '#7cf7ff' : '#2b8fa3';
          const x = o.x - 10 + i * 8;
          ctx.beginPath();
          ctx.moveTo(x, o.y + 2);
          ctx.lineTo(x + 5 * o.dir, o.y + 4);
          ctx.lineTo(x, o.y + 6);
          ctx.fill();
        }
      },
    },
  },

  segments: [
    {
      id: 'skyway', weight: 0.6, minD: 0.1,
      build(b) {
        const y = b.cy;
        b.flat(10 * S);
        b.spawn('booster', b.cx - 64, y - 6, { dir: 1 });
        // A ramp that ends at 45 degrees kicks the player off at speed.
        // Deck and ground route are sized from the launch arc, so gravity
        // carts keep the landing on solid footing.
        const rise = 96, v = 12 * Math.SQRT1_2, range = (2 * v * v) / b.P.grv;
        b.ground(12 * S, (t) => -rise * t * t);
        const lip = b.cx, bridgeY = y - 176, deck = Math.round(range * 1.1);
        b.cy = y;
        b.platform(lip + 96, bridgeY, deck);
        b.ringLine(lip + 160, bridgeY - 24, lip + 32 + deck, bridgeY - 24, 12);
        b.ground(Math.max(70 * S, Math.round(range * 1.6) + 256), () => 0);
        b.ringLine(lip + 128, y - 28, lip + 640, y - 28, 6);
      },
    },
  ],
};

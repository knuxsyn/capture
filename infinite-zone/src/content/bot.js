// A reference player. It reads terrain the way a person reads the screen:
// gaps and walls ahead mean jump, hazards ahead mean jump, stuck means
// spindash. It drives the attract mode and the traversability eval.

function surfaceAt(w, x, y0, mask) {
  for (let y = y0; y < y0 + 160; y++) {
    const v = w.get(x, y);
    if (v & mask) return { y, v };
  }
  return null;
}

export function createBot() {
  let hold = 0, cool = 0, stuck = 0, dash = 0;

  return function bot(core) {
    const p = core.player, w = core.world;
    const inp = { right: true, left: false, down: false, jump: false };
    if (!p || p.dead || core.state !== 'play') return inp;

    // Spindash: release right, crouch, rev three times, let go.
    if (dash > 0) {
      dash--;
      inp.right = false;
      inp.down = dash > 2;
      inp.jump = dash > 4 && dash < 22 && dash % 6 < 3;
      return inp;
    }

    if (hold > 0) { hold--; inp.jump = true; }
    if (cool > 0) cool--;

    // In the air, descending over ground with a pit ahead: brake to land.
    if (!p.ground) {
      if (p.ysp > -1 && p.xsp > 1) {
        const foot = Math.floor(p.y + p.hr);
        const below = surfaceAt(w, Math.floor(p.x), foot, p.mask);
        const ahead = surfaceAt(w, Math.floor(p.x + 24 + p.xsp * 8), foot, p.mask);
        if (below && !ahead) { inp.right = false; inp.left = true; }
      }
      return inp;
    }
    if (p.mode !== 0) return inp;

    stuck = Math.abs(p.gsp) < 0.6 && !p.hurt ? stuck + 1 : 0;
    if (stuck > 45) {
      stuck = 0;
      dash = 40;
      inp.right = false;
      return inp;
    }
    if (cool > 0) return inp;

    const foot = Math.floor(p.y + p.hr);
    const reach = 24 + Math.abs(p.xsp) * 6;
    const brake = 24 + Math.abs(p.xsp) * 14; // skid distance from overspeed
    const edge = 16 + Math.abs(p.xsp) * 3;
    const top = core.registry.physics.top;
    let prev = foot, act = false;
    for (let k = 8; k <= brake && !act; k += 8) {
      const s = surfaceAt(w, Math.floor(p.x + k), foot - 64, p.mask);
      if (!s) {
        // Gap. Overspeed jumps overshoot, so skid down to top speed
        // first, then jump at the lip.
        if (p.gsp > top + 0.5 && k > 8) { inp.right = false; inp.left = true; return inp; }
        act = k <= edge;
        break;
      }
      // A sharp rise in two-layer ground is a wall. Loop pixels are
      // single-layer, so a loop's curve is never mistaken for one.
      if (k <= reach && (s.v & 3) === 3 && prev - s.y > 20) act = true;
      else prev = s.y;
    }
    if (!act) {
      for (const o of core.objects.near(p.x + 8, p.x + reach + 24)) {
        if ((o.type === 'crawler' || o.type === 'spikes') && Math.abs(o.y - p.y) < 40) { act = true; break; }
      }
    }
    if (act) {
      inp.jump = true;
      hold = 28;
      cool = 34;
    }
    return inp;
  };
}

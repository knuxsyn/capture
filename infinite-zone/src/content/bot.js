import { Camera } from '../core/camera.js';

// Reference players. The bot reads terrain the way a skilled player reads
// the screen: gaps and walls ahead mean jump, hazards ahead mean jump,
// stuck means spindash. It drives attract mode and the traversability eval.

function surfaceAt(w, x, y0, mask) {
  for (let y = y0; y < y0 + 160; y++) {
    const v = w.get(x, y);
    if (v & mask) return { y, v };
  }
  return null;
}

// Spindash: release right, crouch, rev three times, let go.
function dashInput(dash, inp) {
  inp.right = false;
  inp.down = dash > 2;
  inp.jump = dash > 4 && dash < 22 && dash % 6 < 3;
  return inp;
}

// A casual player with human reaction time. It holds right, sees only what
// the camera shows, and reacts to a hazard only once it has been on screen
// for REACT frames. It never brakes or aims. Whatever still hurts this
// player is a trap: a hazard placed where a person can't respond in time.
export const REACT = 30; // 0.5 s

export function createRunner() {
  const cam = new Camera();
  const seen = new Map();
  let hold = 0, cool = 0, stuck = 0, dash = 0, f = 0, started = false;

  const age = (key) => {
    if (!seen.has(key)) seen.set(key, f);
    return f - seen.get(key);
  };

  return function runner(core) {
    const p = core.player, w = core.world;
    const inp = { right: true, left: false, down: false, jump: false };
    if (!p || p.dead || core.state !== 'play') return inp;
    if (!started) { cam.snap(p); started = true; }
    cam.follow(core);
    f++;
    if (dash > 0) return dashInput(--dash, inp);
    if (hold > 0) { hold--; inp.jump = true; }
    if (cool > 0) cool--;

    // Register everything on screen ahead: the first gap or wall, and
    // hazard objects. Sightings age while the player approaches.
    const horizon = cam.ahead(p);
    const foot = Math.floor(p.y + p.hr);
    let feature = null, prev = foot;
    for (let k = 8; k <= horizon && !feature; k += 8) {
      const s = surfaceAt(w, Math.floor(p.x + k), foot - 64, p.mask);
      if (!s) feature = { k, kind: 'gap' };
      else if ((s.v & 3) === 3 && prev - s.y > 20) feature = { k, kind: 'wall' };
      else prev = s.y;
    }
    const key = feature && `${feature.kind}${Math.round((p.x + feature.k) / 16)}`;
    if (key) age(key);
    const threats = [];
    for (const o of core.objects.near(p.x + 8, p.x + horizon)) {
      if ((o.type === 'crawler' || o.type === 'spikes') && Math.abs(o.y - p.y) < 40) threats.push(o);
    }
    for (const o of threats) age(`o${o.id}`);

    if (!p.ground || p.mode !== 0) return inp;
    stuck = Math.abs(p.gsp) < 0.6 && !p.hurt ? stuck + 1 : 0;
    if (stuck > 45) { stuck = 0; dash = 40; inp.right = false; return inp; }
    if (cool > 0) return inp;

    const reach = 24 + Math.abs(p.xsp) * 6, edge = 16 + Math.abs(p.xsp) * 3;
    let act = p.pushing; // a wall already stopped us: anyone jumps then
    if (feature && age(key) >= REACT) {
      act ||= feature.kind === 'gap' ? feature.k <= edge : feature.k <= reach;
    }
    for (const o of threats) {
      if (o.x - p.x <= reach + 24 && age(`o${o.id}`) >= REACT) act = true;
    }
    if (act) { inp.jump = true; hold = 28; cool = 34; }
    return inp;
  };
}

export function createBot() {
  let hold = 0, cool = 0, stuck = 0, dash = 0;

  return function bot(core) {
    const p = core.player, w = core.world;
    const inp = { right: true, left: false, down: false, jump: false };
    if (!p || p.dead || core.state !== 'play') return inp;
    if (dash > 0) return dashInput(--dash, inp);

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

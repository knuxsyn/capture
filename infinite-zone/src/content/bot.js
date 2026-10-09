import { Camera } from '../core/camera.js';

// Reference players. The bot reads terrain the way a skilled player reads
// the screen; the runner plays like a person with human reaction time.
// Both know the cart's moveset: with Glide & Climb locked on they glide
// gaps too wide to jump and climb walls too tall to hop.

const CRACKED = 4; // MAT.CRACKED: walls you smash rather than climb
const THREATS = new Set(['crawler', 'spikes', 'buzzer']);

function surfaceAt(w, x, y0, mask, span = 160) {
  for (let y = y0; y < y0 + span; y++) {
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

const hasMoves = (core) => core.registry.carts.some((c) => c.id === 'glide');

// The first gap or wall ahead within `range` px.
function scanAhead(core, p, range) {
  const w = core.world, foot = Math.floor(p.y + p.hr);
  let prev = foot;
  for (let k = 8; k <= range; k += 8) {
    const x = Math.floor(p.x + k);
    const s = surfaceAt(w, x, foot - 64, p.mask);
    if (!s) return { kind: 'gap', k, x, foot };
    // A sharp rise in two-layer ground is a wall. Loop pixels are
    // single-layer, so a loop's curve is never mistaken for one.
    if ((s.v & 3) === 3 && prev - s.y > 20) return { kind: 'wall', k, x, foot, top: s.y, cracked: s.v >> 4 === CRACKED };
    prev = s.y;
  }
  return null;
}

// Where ground resumes after a gap at a height you could land on (catch
// floors and the ground between towers sit lower, so they don't count).
function landingAfter(w, p, x0, foot) {
  for (let k = 0; k < 1200; k += 8) {
    if (surfaceAt(w, x0 + k, foot - 160, p.mask, 256)) return x0 + k;
  }
  return null;
}

// Jump, glide or climb for a feature, given the moveset.
function decide(core, p, f) {
  const P = core.registry.physics, w = core.world, moves = hasMoves(core);
  if (f.kind === 'gap') {
    const land = landingAfter(w, p, f.x, f.foot);
    const width = land === null ? Infinity : land - f.x;
    // Short gap at speed: you fall less than you can step up, so keep running.
    const fall = (P.grv / 2) * (width / Math.max(Math.abs(p.xsp), 0.1)) ** 2;
    if (fall < 12 && land !== null && surfaceAt(w, land, f.foot - 16, p.mask, 32)) return { move: 'none' };
    const range = (Math.max(P.top, Math.abs(p.xsp)) * 2 * P.jmp) / P.grv;
    return moves && width > range * 0.7 ? { move: 'glide', landX: land } : { move: 'jump' };
  }
  // Cracked rock breaks under a curled player at speed: jump into it when
  // already fast, otherwise spindash into it.
  if (f.cracked) return { move: Math.abs(p.gsp) >= 4.5 ? 'jump' : 'dash' };
  if (!moves) return { move: 'jump' };
  let top = f.top;
  while (top > f.foot - 480 && w.get(f.x, top - 1) & p.mask) top--;
  return f.foot - top > ((P.jmp * P.jmp) / (2 * P.grv)) * 0.8 ? { move: 'climb' } : { move: 'jump' };
}

// Multi-frame move sequences: a glide (jump, tap again near the apex, let
// go over the landing) and a climb (jump, glide into the wall, hold up
// through the ledge pull-up).
function createMoves() {
  let seq = null;
  return {
    start(kind, landX = null) { seq = { kind, t: 0, landX }; },
    step(core) {
      if (!seq) return null;
      const p = core.player, g = p.ext;
      const inp = { right: true, left: false, up: false, down: false, jump: false };
      seq.t++;
      if (p.dead || seq.t > 900) { seq = null; return null; }
      if (g.climbing || g.ledge > 0) { seq.climbed = true; inp.right = false; inp.up = true; return inp; }
      if (seq.climbed || (p.ground && seq.t > 5)) { seq = null; return null; }
      if (seq.t === 1) return inp;                         // let go first: a held jump never re-triggers
      if (seq.t === 2) { inp.jump = true; return inp; }    // jump
      if (!g.gliding) {
        const ready = seq.kind === 'climb' ? seq.t > 7 : p.ysp > -1.5;
        if (!ready) { inp.jump = true; return inp; }           // hold for full height
        if (!seq.released) { seq.released = true; return inp; } // one frame off...
        inp.jump = true;                                        // ...so this is a new press
        return inp;
      }
      inp.jump = !seq.dropping;
      if (seq.kind === 'glide' && seq.landX !== null && !seq.dropping) {
        const foot = Math.floor(p.y + p.hr);
        const below = surfaceAt(core.world, Math.floor(p.x), foot, p.mask, 200);
        if (below && p.x > seq.landX + 24) { seq.dropping = true; inp.jump = false; }
      }
      return inp;
    },
  };
}

// A casual player with human reaction time. It holds right, sees only what
// the camera shows, and reacts to a hazard only once it has been on screen
// for REACT frames. It never brakes or aims. Whatever still hurts this
// player is a trap: a hazard placed where a person can't respond in time.
export const REACT = 30; // 0.5 s

export function createRunner() {
  const cam = new Camera();
  const moves = createMoves();
  const seen = new Map();
  let hold = 0, cool = 0, stuck = 0, dash = 0, f = 0, started = false;

  const age = (key) => {
    if (!seen.has(key)) seen.set(key, f);
    return f - seen.get(key);
  };

  return function runner(core) {
    const p = core.player;
    const inp = { right: true, left: false, down: false, jump: false };
    if (!p || p.dead || core.state !== 'play') return inp;
    if (!started) { cam.snap(p); started = true; }
    cam.follow(core);
    f++;
    const m = moves.step(core);
    if (m) return m;
    if (dash > 0) return dashInput(--dash, inp);
    if (hold > 0) { hold--; inp.jump = true; }
    if (cool > 0) cool--;

    // Register what's on screen ahead; sightings age as the player nears.
    const horizon = cam.ahead(p);
    const feature = scanAhead(core, p, horizon);
    const key = feature && `${feature.kind}${Math.round(feature.x / 16)}`;
    if (key) age(key);
    const threats = [];
    for (const o of core.objects.near(p.x + 8, p.x + horizon)) {
      if (THREATS.has(o.type) && Math.abs(o.y - p.y) < 40) threats.push(o);
    }
    for (const o of threats) age(`o${o.id}`);

    if (!p.ground || p.mode !== 0) return inp;
    stuck = Math.abs(p.gsp) < 0.6 && !p.hurt ? stuck + 1 : 0;
    if (stuck > 45 && !(feature?.kind === 'wall' && feature.k < 24 && !feature.cracked && hasMoves(core))) {
      stuck = 0; dash = 40; inp.right = false; return inp;
    }
    if (cool > 0) return inp;

    const reach = 24 + Math.abs(p.xsp) * 6, edge = 16 + Math.abs(p.xsp) * 3;
    let act = null;
    if (feature && (age(key) >= REACT || p.pushing)) {
      const near = feature.kind === 'gap' ? feature.k <= edge : feature.k <= reach;
      if (near) act = decide(core, p, feature);
    }
    if (!act && p.pushing) act = { move: 'jump' }; // stopped by a wall: anyone jumps then
    for (const o of threats) {
      if (!act && o.x - p.x <= reach + 24 && age(`o${o.id}`) >= REACT) act = { move: 'jump' };
    }
    if (!act || act.move === 'none') return inp;
    if (act.move === 'dash') { hold = 0; dash = 40; return dashInput(dash, inp); }
    if (act.move !== 'jump') { hold = 0; moves.start(act.move, act.landX); return moves.step(core); }
    inp.jump = true;
    hold = 28;
    cool = 34;
    return inp;
  };
}

export function createBot() {
  const moves = createMoves();
  let hold = 0, cool = 0, stuck = 0, dash = 0;

  return function bot(core) {
    const p = core.player, w = core.world;
    const inp = { right: true, left: false, down: false, jump: false };
    if (!p || p.dead || core.state !== 'play') return inp;
    const m = moves.step(core);
    if (m) return m;
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

    const reach = 24 + Math.abs(p.xsp) * 6;
    const brake = 24 + Math.abs(p.xsp) * 14; // skid distance from overspeed
    const edge = 16 + Math.abs(p.xsp) * 3;
    const f = scanAhead(core, p, brake);

    stuck = Math.abs(p.gsp) < 0.6 && !p.hurt ? stuck + 1 : 0;
    if (stuck > 45) {
      stuck = 0;
      const wall = f?.kind === 'wall' && f.k < 24 ? decide(core, p, f) : null;
      if (wall?.move === 'climb') { hold = 0; moves.start('climb'); return moves.step(core); }
      dash = 40;
      inp.right = false;
      return inp;
    }
    if (cool > 0) return inp;

    let act = null;
    if (f?.kind === 'gap' && (f.k <= edge || p.gsp > core.registry.physics.top + 0.5)) {
      const plan = decide(core, p, f);
      // Overspeed jumps overshoot short gaps, so skid to top speed first.
      if (plan.move === 'none') { act = null; return inp; }
      if (plan.move === 'jump' && p.gsp > core.registry.physics.top + 0.5 && f.k > 8) {
        inp.right = false;
        inp.left = true;
        return inp;
      }
      if (f.k <= edge) act = plan;
    } else if (f?.kind === 'wall' && f.k <= reach) {
      act = decide(core, p, f);
    }
    if (!act) {
      for (const o of core.objects.near(p.x + 8, p.x + reach + 24)) {
        if (THREATS.has(o.type) && Math.abs(o.y - p.y) < 40) { act = { move: 'jump' }; break; }
      }
    }
    if (!act && p.pushing && stuck > 8) act = { move: 'jump' }; // blocked by a step we didn't read
    if (!act || act.move === 'none') return inp;
    if (act.move === 'dash') { hold = 0; dash = 40; return dashInput(dash, inp); }
    if (act.move !== 'jump') { hold = 0; moves.start(act.move, act.landX); return moves.step(core); }
    inp.jump = true;
    hold = 28;
    cool = 34;
    return inp;
  };
}

import { Camera } from '../core/camera.js';

// Reference players. The bot reads terrain the way a skilled player reads
// the screen; the runner plays like a person with human reaction time.
// Both know the cart's moveset: with Glide & Climb locked on they glide
// gaps too wide to jump and climb walls too tall to hop.

const CRACKED = 4; // MAT.CRACKED: walls you smash rather than climb
const THREATS = new Set(['crawler', 'spikes', 'buzzer', 'rhinobot', 'bloominator', 'jawz', 'spiker']);

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
    const l = w.liquidAt(x);
    if (l && l.kind === 'lava' && l.y < foot + 140) return { kind: 'gap', k, x, foot }; // lava is a pit
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
    if (w.liquidAt(x0 + k)?.kind === 'lava') continue;
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
    cancel() { seq = null; },
    step(core) {
      if (!seq) return null;
      const p = core.player, g = p.ext;
      const inp = { right: true, left: false, up: false, down: false, jump: false };
      seq.t++;
      if (g.climbing || g.ledge > 0) { seq.climbed = true; inp.right = false; inp.up = true; return inp; }
      if (p.dead || seq.t > 900) { seq = null; return null; }
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

// Techniques the newer hazards ask for, shared by both players. `gate(o)`
// says whether the player has noticed an object (always, for the bot).
function createSkills() {
  let t = 0, lastJump = false;
  const fresh = (inp) => { if (inp.jump && lastJump) inp.jump = false; lastJump = inp.jump; return inp; };
  return {
    // On a vine: pump forward, and let go when the release arc reaches the
    // next handle (or, on the last vine, comes down over ground).
    swing(core, p) {
      const s = p.ext.swing;
      if (!s) { lastJump = false; return null; }
      const inp = { right: true, left: false, up: false, down: false, jump: false };
      const v = s.w * s.L, vx = v * Math.cos(s.a);
      if (s.w > 0.01 && vx > 2) {
        let next = null;
        for (const o of core.objects.near(s.x + 40, s.x + 420)) if (o.type === 'vine' && (!next || o.x < next.x)) next = o;
        let x = p.x, y = p.y - p.hr + 4, vy = -v * Math.sin(s.a) - 3.5;
        for (let k = 0; k < 90 && !inp.jump; k++) {
          x += vx; y += vy; vy += p.P.grv;
          if (next) {
            const hx = next.x + next.L * Math.sin(next.a), hy = next.y + next.L * Math.cos(next.a);
            if (Math.hypot(x - hx, y - hy) < 14) inp.jump = true;
          } else if (vy > 0 && surfaceAt(core.world, Math.floor(x), Math.floor(y + 2 * p.P.standH - 4), p.mask, 12)) {
            inp.jump = true;
          }
        }
      }
      return fresh(inp);
    },

    // A monitor in the running line: roll into it, S3K's way to break one
    // without stopping. Too slow to roll: stop and spindash into it, since
    // a slow hop can land you somewhere worse.
    monitor(core, p) {
      let box = null;
      for (const q of core.objects.near(p.x, p.x + 48 + Math.abs(p.gsp) * 6)) {
        if (q.type === 'monitor' && Math.abs(q.y1 - (p.y + p.hr)) <= 6 && q.x0 - p.x >= p.wr) { box = q; break; }
      }
      if (!box) return null;
      const inp = { right: false, left: false, down: false, jump: false };
      if (p.rolling) return inp;                           // already rolling: let it carry
      if (p.spindash) { inp.down = p.rev < 2; inp.jump = inp.down && ++t % 4 === 0; return inp; }
      if (p.gsp >= 2) { inp.down = true; return inp; }
      if (p.gsp > 0) return inp;                           // coast to a stop
      inp.down = true;
      inp.jump = ++t % 2 === 1;
      return inp;
    },

    // Timed hazards (crushers, spouts, bloominators). Forecast the run past
    // every one ahead at the speed we'd carry; if any window would close on
    // us, stop short, crouch and rev a spindash, and fire it when the
    // forecast says the whole run is clear.
    timed(core, p, gate) {
      const types = core.registry.types;
      // Underneath one already: never stop here, get out.
      for (const q of core.objects.near(p.x - 80, p.x + 80)) {
        if (q.type === 'crusher' && p.x + p.wr > q.x0 - 12 && p.x - p.wr < q.x1 + 4) {
          return { right: true, left: false, down: false, jump: false };
        }
      }
      const P = p.P, sp = Math.abs(p.gsp);
      // How far we'd slide if we started braking now; look at least that far.
      const stop = p.rolling ? sp * sp / (2 * (P.rollDec + P.rollFrc)) : sp * sp / (2 * P.dec) + 4;
      const ahead = [];
      for (const q of core.objects.near(p.x - 8, p.x + Math.max(320, stop + 200))) {
        const T = types.get(q.type);
        if (!T.clearFor || !gate(q) || Math.abs((q.ground ?? q.y) - p.y) > 160) continue;
        const near = (q.x0 ?? q.x - 24) - p.wr - 4;
        if (near - p.x < 8) continue; // already underneath: commit
        ahead.push({ q, T, near, far: (q.x1 ?? q.x + 24) + p.wr + 8 });
      }
      const idle = { right: false, left: false, down: false, jump: false };
      if (!ahead.length) return p.spindash ? idle : null;
      ahead.sort((a, b) => a.near - b.near);

      // Frames to reach x if we go now: spindash release or roll coasts,
      // running accelerates to top speed.
      const rolls = p.spindash || p.rolling;
      let v0 = p.spindash ? P.dashBase + Math.floor(p.rev) / 2 : Math.max(sp, 0.5);
      const reach = (x) => {
        let pos = p.x, v = v0, t = 0;
        while (pos < x && t < 400) {
          v = rolls ? Math.max(0.5, v - P.rollFrc) : Math.min(Math.max(v, P.top), v + P.acc);
          pos += v; t++;
        }
        return t;
      };
      const head = p.y - (rolls ? 14 : 19);
      const open = (h) => {
        const ti = reach(h.near), to = reach(h.far);
        if (h.T.openAt) {
          for (let dt = ti; dt <= to + 2; dt++) if (!h.T.openAt(h.q, dt, head)) return false;
          return true;
        }
        return h.T.clearFor(h.q, core) >= to + 6;
      };
      const bad = ahead.find((h) => !open(h));
      const go = { right: true, left: false, down: false, jump: false };
      // Clear run: a piston still low now will be up when we get there, so
      // don't read it as a wall to jump.
      if (!bad) return p.spindash ? idle : ahead[0].T.openAt && ahead[0].near - p.x < 200 ? go : null;
      // Too late to stop short of it: braking only leaves us underneath.
      if (!p.spindash && p.x + stop > bad.near) return go;
      // Not urgent yet: keep moving until we must brake.
      if (!p.spindash && sp > 0.5 && p.x + stop + 24 < bad.near) return null;
      const inp = { ...idle };
      t++;
      if (p.gsp > 0.5 || (p.rolling && p.gsp > 0)) { inp.left = true; return inp; } // skid, or brake a roll
      if (p.gsp !== 0) return inp;                       // coast to a stop
      if (p.facing < 0) { inp.right = true; return inp; }
      inp.down = true;
      inp.jump = p.spindash ? t % 8 < 2 && p.rev < 6 : t % 2 === 1;
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
  const skills = createSkills();
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
    const sw = skills.swing(core, p);
    if (sw) { moves.cancel(); return sw; }
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
      else if (core.registry.types.get(o.type).clearFor) age(`o${o.id}`);
    }
    for (const o of threats) age(`o${o.id}`);

    if (!p.ground || p.mode !== 0) return inp;
    const wait = skills.timed(core, p, (o) => age(`o${o.id}`) >= REACT);
    if (wait) return wait;
    const box = skills.monitor(core, p);
    if (box) return box;
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
      if (!act && o.x - p.x <= reach + 24 && age(`o${o.id}`) >= REACT) act = o.type === 'spiker' ? { move: Math.abs(p.gsp) >= 3 ? 'roll' : 'dash' } : { move: 'jump' };
    }
    if (!act || act.move === 'none') return inp;
    if (act.move === 'dash') { hold = 0; dash = 40; return dashInput(dash, inp); }
    if (act.move === 'roll') { inp.down = true; inp.right = false; return inp; }
    if (act.move !== 'jump') { hold = 0; moves.start(act.move, act.landX); return moves.step(core); }
    inp.jump = true;
    hold = 28;
    cool = 34;
    return inp;
  };
}

export function createBot() {
  const moves = createMoves();
  const skills = createSkills();
  let hold = 0, cool = 0, stuck = 0, dash = 0;

  return function bot(core) {
    const p = core.player, w = core.world;
    const inp = { right: true, left: false, down: false, jump: false };
    if (!p || p.dead || core.state !== 'play') return inp;
    const sw = skills.swing(core, p);
    if (sw) { moves.cancel(); return sw; }
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
    const wait = skills.timed(core, p, () => true);
    if (wait) return wait;
    const box = skills.monitor(core, p);
    if (box) return box;

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
        if (THREATS.has(o.type) && Math.abs(o.y - p.y) < 40) {
          act = o.type === 'spiker' ? { move: Math.abs(p.gsp) >= 3 ? 'roll' : 'dash' } : { move: 'jump' };
          break;
        }
      }
    }
    if (!act && p.pushing && stuck > 8) act = { move: 'jump' }; // blocked by a step we didn't read
    if (!act || act.move === 'none') return inp;
    if (act.move === 'dash') { hold = 0; dash = 40; return dashInput(dash, inp); }
    if (act.move === 'roll') { inp.down = true; inp.right = false; return inp; }
    if (act.move !== 'jump') { hold = 0; moves.start(act.move, act.landX); return moves.step(core); }
    inp.jump = true;
    hold = 28;
    cool = 34;
    return inp;
  };
}

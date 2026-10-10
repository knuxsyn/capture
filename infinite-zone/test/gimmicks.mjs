// The S3K set pieces behave as the physics promises: water holds you up
// only at speed, air runs out, lava never traps you, a crusher's forecast
// matches what it does, and Super works and drains.
//   node test/gimmicks.mjs
import { createCore } from '../src/core/core.js';
import { base } from '../src/content/base.js';
import { glide } from '../mods/glide.js';
import { circuit } from '../mods/circuit.js';
import { AIR, SKIM } from '../src/core/constants.js';

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

// A fresh circuit core with the first segment of type `id` generated.
function at(id, seed = 1) {
  const core = createCore({ seed, carts: [base, glide, circuit] }).start();
  core.lives = 99;
  let s = null;
  for (let n = 0; n < 800 && !s; n++) {
    s = core.gen.segments.find((q) => q.id === id);
    if (!s) core.gen.next();
  }
  return { core, s, p: core.player };
}
const run = (core, n, inp = {}) => {
  const seen = new Set();
  for (let i = 0; i < n; i++) { core.step(typeof inp === 'function' ? inp(i) : inp); core.events.forEach((e) => seen.add(e)); }
  return seen;
};

// Skim: arrive fast and the surface holds; arrive slow and you sink.
{
  const { core, s, p } = at('lagoon');
  const l = core.world.liquids.find((q) => q.x0 >= s.x0);
  p.reset(l.x0 - 120, l.y - 40);
  p.gsp = p.xsp = SKIM + 3;
  let wet = false;
  for (let i = 0; i < 60 && p.x < l.x0 + 200; i++) { core.step({ right: true }); wet ||= p.wet; }
  check('lagoon: skims at speed', !wet && p.x > l.x0 + 100, `x ${Math.round(p.x - l.x0)} past the edge, wet ${wet}`);

  p.reset(l.x0 + 160, l.y - 30);
  p.xsp = 1;
  run(core, 60, { right: true });
  check('lagoon: sinks when slow', p.wet && p.P.top < core.registry.physics.top, `wet ${p.wet}, top ${p.P.top}`);
}

// Air: the countdown runs and drowning follows; a bubble shield prevents it.
{
  const { core, s, p } = at('lagoon');
  const l = core.world.liquids.find((q) => q.x0 >= s.x0);
  // Keep away from vents so no bubble refills the air.
  for (const o of core.objects.list) if (o.type === 'vent' || o.type === 'bubble') o.alive = false;
  p.reset(l.x0 + 40, l.y + 40);
  const ev = run(core, AIR + 120);
  check('air: countdown then drown', ev.has('aircount') && ev.has('drown'), [...ev].filter((e) => e.startsWith('air') || e === 'drown').join(','));

  const b = at('lagoon');
  const lb = b.core.world.liquids.find((q) => q.x0 >= b.s.x0);
  for (const o of b.core.objects.list) if (o.type === 'vent' || o.type === 'bubble') o.alive = false;
  b.p.reset(lb.x0 + 40, lb.y + 40);
  b.core.shield = 'bubble';
  const evb = run(b.core, AIR + 120);
  check('air: bubble shield breathes', !evb.has('drown') && !evb.has('aircount'));
}

// Lava: fall in with rings, get thrown out, and reach the far bank.
{
  const { core, s, p } = at('lavapit');
  const l = core.world.liquids.find((q) => q.x0 >= s.x0 && q.kind === 'lava');
  core.rings = 10;
  p.reset((l.x0 + l.x1) / 2, l.y - 10);
  let out = false;
  for (let i = 0; i < 600 && !out; i++) { core.step({ right: true }); out = p.ground && p.x > l.x1; }
  check('lava: throws you out, never traps you', out && !p.dead, `x ${Math.round(p.x - l.x1)} past the bank, rings ${core.rings}`);
}

// Crusher: the forecast the test players plan with matches the piston.
{
  const { core, s } = at('crushers');
  const T = core.registry.types.get('crusher');
  const c = core.objects.list.find((o) => o.type === 'crusher' && o.x0 >= s.x0);
  const head = c.ground - 38, H = 160;
  const said = Array.from({ length: H }, (_, dt) => T.openAt(c, dt, head));
  core.player.reset(c.x0 - 200, c.ground - 20); // keep it simulated
  const saw = [true];
  for (let i = 1; i < H; i++) {
    core.player.x = c.x0 - 200; core.player.xsp = core.player.gsp = 0;
    core.step({});
    saw.push(c.cy + c.h < head - 2 && c.state !== 'slam');
  }
  const miss = said.findIndex((v, i) => v !== saw[i]);
  check('crusher: forecast matches the cycle', miss < 0, miss < 0 ? `${H} frames` : `differs at +${miss}`);
}

// Super: 50 rings, jump, then up + jump. Freezes to transform, then drains.
{
  const { core, p } = at('loop');
  core.rings = 50;
  run(core, 5);
  run(core, 6, { jump: true });
  run(core, 1, {});
  const ev = run(core, 1, { up: true, jump: true });
  check('super: transforms in the air', core.power.super && ev.has('super') && p.morph > 0);
  for (const o of core.objects.list) if (o.type === 'ring') o.alive = false;
  const r0 = core.rings;
  run(core, 180);
  check('super: drains a ring a second', core.rings <= r0 - 2 && core.rings >= r0 - 4, `${r0} -> ${core.rings}`);
  check('super: faster top speed', p.P.top > core.registry.physics.top, `${p.P.top}`);
}

process.exit(failed ? 1 : 0);

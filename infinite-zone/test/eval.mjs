// Headless checks. Physics invariants first, then traversability: the
// reference bot plays many seeds and we report where the grammar breaks.
//   node test/eval.mjs [seeds=40] [segments=40]
import { createCore } from '../src/core/core.js';
import { base } from '../src/content/base.js';
import { createBot } from '../src/content/bot.js';

const SEEDS = Number(process.argv[2] ?? 40);
const SEGS = Number(process.argv[3] ?? 40);
let failed = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
}

// A cart whose grammar is fixed, so physics tests see known terrain.
function fixture(build) {
  return {
    id: 'fixture',
    segments: [
      { id: 'start', build },
      { id: 'checkpoint', weight: 0, build: (b) => b.flat(4096) },
      { id: 'flat', weight: 1, build: (b) => b.flat(4096) },
    ],
  };
}

function settle(core) {
  for (let i = 0; i < 30; i++) core.step({});
}

// 1. Acceleration to top speed on flat ground.
{
  const core = createCore({ seed: 1, carts: [base, fixture((b) => b.flat(4096))] }).start();
  settle(core);
  let frames = 0;
  while (core.player.gsp < 6 && frames < 400) { core.step({ right: true }); frames++; }
  check('flat: reaches top speed 6', core.player.gsp === 6, `${frames} frames, expected 128`);
}

// 2. Jump apex.
{
  const core = createCore({ seed: 1, carts: [base, fixture((b) => b.flat(4096))] }).start();
  settle(core);
  const y0 = core.player.y;
  let minY = y0;
  for (let i = 0; i < 90; i++) {
    core.step({ jump: true });
    minY = Math.min(minY, core.player.y);
  }
  const h = y0 - minY + 5; // +5: curling lowers the center
  check('jump: apex near 96px', h > 90 && h < 102, `${h.toFixed(1)}px`);
  check('jump: lands again', core.player.ground);
}

// 3. Loop traversal at speed: must pass the crown and exit on layer A.
{
  const core = createCore({ seed: 1, carts: [base, fixture((b) => { b.flat(800); b.loop(96); b.flat(4096); })] }).start();
  settle(core);
  let maxAngle = 0, crossedCrown = false;
  for (let i = 0; i < 600; i++) {
    core.step({ right: true });
    const p = core.player;
    const deg = (p.angle * 180) / Math.PI;
    if (p.ground && deg > 150 && deg < 210) crossedCrown = true;
    maxAngle = Math.max(maxAngle, deg);
  }
  const p = core.player;
  check('loop: runs the ceiling', crossedCrown, `max angle ${maxAngle.toFixed(0)}°`);
  check('loop: exits right on layer A', p.x > 800 + 64 + 2 * 112 + 64 && p.layer === 0 && p.ground, `x=${p.x.toFixed(0)} layer=${p.layer}`);
}

// 3b. Over the top: drop onto a loop's crown, run off the far side. The
// convex outside must never carry the player into the floor.
{
  const core = createCore({ seed: 1, carts: [base, fixture((b) => { b.flat(400); b.loop(96); b.flat(4096); })] }).start();
  core.player.x = 400 + 64 + 112 - 40;
  core.player.y = 1024 - 2 * 96 - 16 - 60;
  let worst = 0;
  for (let i = 0; i < 400; i++) {
    core.step({ right: true });
    const p = core.player;
    if (core.world.get(Math.floor(p.x), Math.floor(p.y)) & (p.layer ? 2 : 1)) worst++;
  }
  const p = core.player;
  check('loop crown: runs off the outside cleanly', worst === 0 && p.ground && p.y < 1024 && p.x > 800, `x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} embedded=${worst}`);
}

// 4. Spindash from a standstill.
{
  const core = createCore({ seed: 1, carts: [base, fixture((b) => b.flat(4096))] }).start();
  settle(core);
  core.step({ down: true });
  for (let i = 0; i < 3; i++) { core.step({ down: true, jump: true }); core.step({ down: true }); }
  core.step({});
  check('spindash: launches at 8+', core.player.gsp >= 8 && core.player.rolling, `gsp=${core.player.gsp.toFixed(2)}`);
}

// 5. Determinism: same seed, same inputs, same world.
{
  const run = () => {
    const core = createCore({ seed: 'determinism', carts: [base] }).start();
    const bot = createBot();
    for (let i = 0; i < 3000; i++) core.step(bot(core));
    return JSON.stringify([core.player.x, core.player.y, core.gen.segments.map((s) => s.id)]);
  };
  check('determinism: identical runs', run() === run());
}

// 6. Traversability across seeds.
const perSeg = new Map();
const note = (id, k) => {
  const r = perSeg.get(id) ?? { seen: 0, deaths: 0, stalls: 0 };
  r[k]++;
  perSeg.set(id, r);
};
let cleared = 0, totalDeaths = 0, totalFrames = 0;
const t0 = Date.now();
for (let s = 1; s <= SEEDS; s++) {
  const core = createCore({ seed: s, carts: [base] }).start();
  const bot = createBot();
  let best = 0, since = 0, deaths = 0, seen = -1;
  for (let f = 0; f < 60 * 60 * 6; f++) {
    core.step(bot(core));
    const p = core.player;
    const seg = core.gen.at(p.x);
    if (seg.i > seen) { seen = seg.i; note(seg.id, 'seen'); }
    if (core.events.includes('die')) { deaths++; note(seg.id, 'deaths'); }
    if (core.events.includes('respawn')) best = p.x;
    if (p.x > best + 1) { best = p.x; since = 0; }
    else if (++since === 60 * 20) { note(seg.id, 'stalls'); break; }
    if (core.state === 'over' || seg.i >= SEGS) break;
    totalFrames++;
  }
  const seg = core.gen.at(core.player.x);
  if (seg.i >= SEGS) cleared++;
  totalDeaths += deaths;
  if (seg.i < SEGS) console.log(`  seed ${s}: stopped in #${seg.i} ${seg.id} (${core.state}, ${deaths} deaths)`);
}
const rate = cleared / SEEDS;
console.log(`\ntraversal: ${cleared}/${SEEDS} seeds cleared ${SEGS} segments, ${totalDeaths} deaths, ${(totalFrames / 60 / 60).toFixed(1)} min simulated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('segment     seen  deaths  stalls');
for (const [id, r] of [...perSeg].sort((a, b) => b[1].deaths + b[1].stalls - a[1].deaths - a[1].stalls)) {
  console.log(`${id.padEnd(12)}${String(r.seen).padStart(4)}${String(r.deaths).padStart(8)}${String(r.stalls).padStart(8)}`);
}
check('traversal: bot clears >= 95% of seeds', rate >= 0.95, `${(rate * 100).toFixed(0)}%`);
process.exit(failed ? 1 : 0);

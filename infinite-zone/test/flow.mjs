// Fairness at speed. A casual runner holds right and only reacts after a
// wall stops it. Deaths and hits on this runner are traps: hazards placed
// where a person moving forward has no time to respond.
//   node test/flow.mjs [seeds=60] [segments=48]
import { createCore } from '../src/core/core.js';
import { base } from '../src/content/base.js';
import { createRunner } from '../src/content/bot.js';
import { ACT_LEN } from '../src/core/constants.js';

const SEEDS = Number(process.argv[2] ?? 60);
const SEGS = Number(process.argv[3] ?? 48);
const rows = new Map();
const row = (id) => rows.get(id) ?? rows.set(id, { seen: 0, deaths: 0, hits: 0, slams: 0 }).get(id);
const zoneDeaths = [0, 0, 0];
let deaths = 0, hits = 0, slams = 0, segs = 0;

for (let s = 1; s <= SEEDS; s++) {
  const core = createCore({ seed: s, carts: [base] }).start();
  const run = createRunner();
  let seen = -1, prevGsp = 0;
  for (let f = 0; f < 60 * 60 * 8; f++) {
    core.step(run(core));
    const p = core.player, seg = core.gen.at(p.x);
    if (seg.i > seen) { seen = seg.i; row(seg.id).seen++; segs++; }
    if (core.events.includes('die')) { deaths++; row(seg.id).deaths++; zoneDeaths[Math.min(2, Math.floor(seg.i / ACT_LEN))]++; }
    if (core.events.includes('hurt')) { hits++; row(seg.id).hits++; }
    if (p.ground && p.pushing && prevGsp >= 5) { slams++; row(seg.id).slams++; }
    prevGsp = Math.abs(p.gsp);
    if (core.state === 'over' || seg.i >= SEGS) break;
  }
}

const per100 = (n) => ((n / segs) * 100).toFixed(1);
console.log(`casual runner, ${SEEDS} seeds x ${SEGS} segments (${segs} segments entered)`);
console.log(`per 100 segments: ${per100(deaths)} deaths, ${per100(hits)} hits, ${per100(slams)} wall slams at speed`);
console.log(`deaths by act: act 1 ${zoneDeaths[0]}, act 2 ${zoneDeaths[1]}, later ${zoneDeaths[2]}`);
console.log('\nsegment      seen  deaths   hits  slams');
for (const [id, r] of [...rows].sort((a, b) => (b[1].deaths * 4 + b[1].hits + b[1].slams) / b[1].seen - (a[1].deaths * 4 + a[1].hits + a[1].slams) / a[1].seen)) {
  console.log(`${id.padEnd(12)}${String(r.seen).padStart(5)}${String(r.deaths).padStart(8)}${String(r.hits).padStart(7)}${String(r.slams).padStart(7)}`);
}

// Budgets. The first zone (acts 1-2) forgives everything; later acts may kill through
// deliberate bottomless gaps, never through hazards sprung at speed.
let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}  (${detail})`);
  if (!ok) failed++;
};
check('flow: no deaths in the first zone (acts 1-2)', zoneDeaths[0] + zoneDeaths[1] === 0, `${zoneDeaths[0] + zoneDeaths[1]}`);
check('flow: deaths <= 1 per 100 segments', deaths / segs <= 0.01, per100(deaths));
check('flow: hits <= 1 per 100 segments', hits / segs <= 0.01, per100(hits));
check('flow: wall slams <= 0.5 per 100 segments', slams / segs <= 0.005, per100(slams));
process.exit(failed ? 1 : 0);

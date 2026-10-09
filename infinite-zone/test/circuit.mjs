// Echidna Circuit: three zones, endless laps. The expert bot must clear
// a full lap and into the next; the reaction-time runner must survive the
// first zone untouched and stay inside the death budget overall. Counters
// show the moveset is actually needed: glides, climbs, smashed walls.
//   node test/circuit.mjs [seeds=30] [segments=100]
import { createCore } from '../src/core/core.js';
import { base } from '../src/content/base.js';
import { createBot, createRunner } from '../src/content/bot.js';
import { glide } from '../mods/glide.js';
import { circuit } from '../mods/circuit.js';
import { moon } from '../mods/moon.js';
import { ACT_LEN, ACTS } from '../src/core/constants.js';

const SEEDS = Number(process.argv[2] ?? 30);
const SEGS = Number(process.argv[3] ?? 100);
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

function play(carts, make, label) {
  const rows = new Map();
  const row = (id) => rows.get(id) ?? rows.set(id, { seen: 0, deaths: 0, hits: 0, stalls: 0 }).get(id);
  const tally = { cleared: 0, deaths: 0, hits: 0, segs: 0, glides: 0, climbs: 0, smashed: 0, firstZoneDeaths: 0 };
  for (let s = 1; s <= SEEDS; s++) {
    const core = createCore({ seed: s, carts }).start();
    const ctl = make();
    let seen = -1, best = 0, since = 0, gl = false, cl = false;
    for (let f = 0; f < 60 * 60 * 12; f++) {
      core.step(ctl(core));
      const p = core.player, seg = core.gen.at(p.x);
      if (seg.i > seen) { seen = seg.i; row(seg.id).seen++; tally.segs++; }
      if (p.ext.gliding && !gl) tally.glides++;
      if (p.ext.climbing && !cl) tally.climbs++;
      gl = !!p.ext.gliding; cl = !!p.ext.climbing;
      if (core.events.includes('pop') && seg.id === 'rockwall') tally.smashed++;
      if (core.events.includes('die')) {
        tally.deaths++; row(seg.id).deaths++;
        if (seg.i < ACT_LEN * ACTS) tally.firstZoneDeaths++;
      }
      if (core.events.includes('hurt')) { tally.hits++; row(seg.id).hits++; }
      if (core.events.includes('respawn')) best = p.x;
      if (p.x > best + 1) { best = p.x; since = 0; } else if (++since > 60 * 25) { row(seg.id).stalls++; break; }
      if (core.state === 'over' || seg.i >= SEGS) break;
    }
    if (core.gen.at(core.player.x).i >= SEGS) tally.cleared++;
  }
  console.log(`\n${label}: ${tally.cleared}/${SEEDS} cleared ${SEGS} segments; per 100 segments ${(tally.deaths / tally.segs * 100).toFixed(1)} deaths, ${(tally.hits / tally.segs * 100).toFixed(1)} hits; ${tally.glides} glides, ${tally.climbs} climbs, ${tally.smashed} walls smashed`);
  const bad = [...rows].filter(([, r]) => r.deaths + r.hits + r.stalls).sort((a, b) => b[1].deaths + b[1].stalls - a[1].deaths - a[1].stalls);
  for (const [id, r] of bad) console.log(`  ${id.padEnd(12)} seen ${String(r.seen).padStart(4)}  deaths ${r.deaths}  hits ${r.hits}  stalls ${r.stalls}`);
  return tally;
}

const carts = [base, glide, circuit];
const bot = play(carts, createBot, 'expert bot');
check('circuit: expert clears >= 95% of seeds', bot.cleared / SEEDS >= 0.95, `${bot.cleared}/${SEEDS}`);
check('circuit: glides, climbs and smashes all happen', bot.glides > SEEDS && bot.climbs > SEEDS && bot.smashed > 0, `${bot.glides} / ${bot.climbs} / ${bot.smashed}`);

const run = play(carts, createRunner, 'reaction-time runner');
check('circuit: runner never dies in Coral Drift lap 1', run.firstZoneDeaths === 0, `${run.firstZoneDeaths}`);
check('circuit: runner deaths <= 2 per 100 segments', run.deaths / run.segs <= 0.02, `${(run.deaths / run.segs * 100).toFixed(1)}`);

const low = play([base, glide, circuit, moon], createBot, 'expert bot + moon physics');
check('circuit + moon: expert clears >= 90% of seeds', low.cleared / SEEDS >= 0.9, `${low.cleared}/${SEEDS}`);

// Endurance: three full laps with unlimited lives. Difficulty must rise
// (deaths are allowed from lap 3) without ever walling the player in.
{
  const reach = 300;
  let ok = 0;
  const deaths = [0, 0, 0, 0], segs = [0, 0, 0, 0];
  for (let s = 1; s <= 10; s++) {
    const core = createCore({ seed: s, carts }).start();
    core.lives = 99;
    const ctl = createBot();
    let seen = -1, best = 0, since = 0;
    for (let f = 0; f < 60 * 60 * 40; f++) {
      core.step(ctl(core));
      const p = core.player, seg = core.gen.at(p.x), lap = Math.min(3, Math.floor(seg.zone / 3));
      if (seg.i > seen) { seen = seg.i; segs[lap]++; }
      if (core.events.includes('die')) deaths[lap]++;
      if (core.events.includes('respawn')) best = p.x;
      if (p.x > best + 1) { best = p.x; since = 0; } else if (++since > 1500) break;
      if (seg.i >= reach) { ok++; break; }
    }
  }
  console.log('\nendurance: ' + deaths.map((d, i) => segs[i] ? `lap ${i + 1}${i === 3 ? '+' : ''} ${(d / segs[i] * 100).toFixed(1)}` : '').filter(Boolean).join(', ') + ' deaths per 100 segments');
  check('circuit: three laps never wall the player in', ok === 10, `${ok}/10 reached segment ${reach}`);
}

process.exit(failed ? 1 : 0);

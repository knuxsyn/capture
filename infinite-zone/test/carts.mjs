// Every shipped cartridge must keep the bot traversal rate. Also checks
// that skyway bridges are actually reachable and glide changes airtime.
//   node test/carts.mjs [seeds=30] [segments=40]
import { createCore } from '../src/core/core.js';
import { base } from '../src/content/base.js';
import { createBot } from '../src/content/bot.js';
import { moon } from '../mods/moon.js';
import { skyways } from '../mods/skyways.js';
import { glide } from '../mods/glide.js';

const SEEDS = Number(process.argv[2] ?? 30);
const SEGS = Number(process.argv[3] ?? 40);
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

function traverse(carts) {
  let cleared = 0, deaths = 0, bridges = 0, skyways = 0;
  const where = new Map();
  for (let s = 1; s <= SEEDS; s++) {
    const core = createCore({ seed: s, carts }).start();
    const bot = createBot();
    let best = 0, since = 0, onBridge = -1;
    for (let f = 0; f < 60 * 60 * 6; f++) {
      core.step(bot(core));
      const p = core.player, seg = core.gen.at(p.x);
      if (core.events.includes('die')) { deaths++; where.set(seg.id, (where.get(seg.id) ?? 0) + 1); }
      if (seg.id === 'skyway' && p.ground && p.y < seg.y0 - 150 && onBridge !== seg.i) { onBridge = seg.i; bridges++; }
      if (core.events.includes('respawn')) best = p.x;
      if (p.x > best + 1) { best = p.x; since = 0; } else if (++since > 1200) break;
      if (core.state === 'over' || seg.i >= SEGS) break;
    }
    skyways += core.gen.segments.filter((g) => g.id === 'skyway').length;
    if (core.gen.at(core.player.x).i >= SEGS) cleared++;
  }
  return { rate: cleared / SEEDS, deaths, bridges, skyways, where: [...where].map(([k, v]) => `${k}:${v}`).join(' ') };
}

for (const [name, carts] of [['moon', [base, moon]], ['skyways', [base, skyways]], ['glide', [base, glide]], ['moon+skyways', [base, moon, skyways]], ['all', [base, moon, skyways, glide]]]) {
  const r = traverse(carts);
  check(`${name}: bot clears >= 95% of seeds`, r.rate >= 0.95, `${(r.rate * 100).toFixed(0)}%, ${r.deaths} deaths ${r.where}`);
  if (name === 'skyways') check('skyways: bridge route is reachable', r.bridges > 0, `${r.bridges} bridge landings`);
}

// Glide: a second jump press mid-air extends the airtime.
{
  const airtime = (carts, regrab) => {
    const core = createCore({ seed: 1, carts: [base, ...carts, { id: 'fixture', segments: [{ id: 'start', build: (b) => b.flat(6000) }] }] }).start();
    for (let i = 0; i < 30; i++) core.step({});
    let t = 0;
    core.step({ jump: true, right: true });
    for (; t < 600 && !core.player.ground; t++) {
      const press = regrab && t > 20;
      core.step({ jump: t < 18 || press, right: true });
      if (t === 19) core.step({ jump: false, right: true });
    }
    return t;
  };
  const plain = airtime([], false), gliding = airtime([glide], true);
  check('glide: extends airtime', gliding > plain * 1.5, `${plain} -> ${gliding} frames`);
}

// Climb: glide into a 160 px wall, grab it, climb, pull up onto the top.
{
  const wallX = 600;
  const core = createCore({ seed: 1, carts: [base, glide, { id: 'fixture', segments: [
    { id: 'start', build: (b) => { b.flat(wallX); b.step(-160); b.flat(4000); } },
  ] }] }).start();
  for (let i = 0; i < 20; i++) core.step({});
  const top = core.gen.segments[0].y0 - 160;
  let grabbed = false, ledged = false, t = 0;
  core.step({ right: true, jump: true });
  for (; t < 30; t++) core.step({ right: true, jump: t < 14 });
  core.step({ right: true, jump: true });               // second press: glide
  for (; t < 400 && !(core.player.ground && core.player.y < top); t++) {
    const g = core.player.ext;
    grabbed ||= !!g.climbing;
    ledged ||= g.ledge > 0;
    core.step({ right: !g.climbing, up: !!g.climbing, jump: !g.climbing });
  }
  const p = core.player;
  check('climb: glide grabs the wall', grabbed);
  check('climb: pulls up onto the ledge', ledged && p.ground && p.y < top && p.x > wallX, `x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} top=${top}`);
}

// Glide landing: belly-slide, then get up.
{
  const core = createCore({ seed: 1, carts: [base, glide, { id: 'fixture', segments: [{ id: 'start', build: (b) => b.flat(6000) }] }] }).start();
  for (let i = 0; i < 20; i++) core.step({});
  core.step({ right: true, jump: true });
  let t = 0, slid = false, gotUp = false;
  for (; t < 30; t++) core.step({ right: true, jump: t < 14 });
  core.step({ right: true, jump: true });
  for (; t < 600; t++) {
    core.step({ right: true, jump: true });
    slid ||= !!core.player.ext.slide;
    gotUp ||= core.player.ext.getUp > 0;
  }
  check('glide: landing slides, then gets up', slid && gotUp);
}

process.exit(failed ? 1 : 0);

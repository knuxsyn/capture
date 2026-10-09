// The core: a headless, deterministic simulation. No DOM. One call to
// step(input) advances one 60 Hz frame. Content arrives through lockOn().
import { PHYSICS, WORLD } from './constants.js';
import { hashSeed } from './rng.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Objects, swapType } from './objects.js';
import { Generator } from './generator.js';

export const HOOKS = ['beforeAir', 'onLand', 'onStep', 'onSegment', 'drawPlayer'];

export function createCore({ seed = 'zone', carts = [] } = {}) {
  const registry = {
    segments: new Map(),
    types: new Map([['swap', swapType]]),
    zones: [],
    physics: { ...PHYSICS },
    hooks: Object.fromEntries(HOOKS.map((h) => [h, []])),
    carts: [],
  };

  let gen = null;
  let prevJump = false;

  const core = {
    seed: typeof seed === 'number' ? seed >>> 0 : hashSeed(seed),
    seedLabel: String(seed),
    registry,
    frame: 0,
    time: 0,
    rings: 0,
    score: 0,
    lives: 3,
    distance: 0,
    zoneIndex: 0,
    state: 'boot',
    events: [],
    checkpoint: null,
    deadT: 0,
    world: null,
    objects: null,
    player: null,
    gen: null,

    // A cartridge is a plain object; every field is optional.
    //   { id, name, physics, segments, objects, zones, hooks, install(core) }
    // Segments with an existing id replace it, so carts can override base content.
    lockOn(cart) {
      if (registry.carts.some((c) => c.id === cart.id)) return core;
      registry.carts.push(cart);
      if (cart.physics) Object.assign(registry.physics, cart.physics);
      for (const s of cart.segments ?? []) registry.segments.set(s.id, s);
      for (const [k, t] of Object.entries(cart.objects ?? {})) registry.types.set(k, t);
      if (cart.zones) registry.zones.push(...cart.zones);
      for (const h of HOOKS) if (cart.hooks?.[h]) registry.hooks[h].push(cart.hooks[h]);
      cart.install?.(core);
      return core;
    },

    start() {
      core.world = new World();
      core.objects = new Objects(registry.types);
      core.player = new Player(registry.physics, registry.hooks);
      core.gen = gen = new Generator(core);
      gen.ensure(2400);
      const s0 = gen.segments[0];
      const x = 96, y = s0.y0 - registry.physics.standH - 1;
      core.checkpoint = { x, y };
      core.player.reset(x, y);
      core.state = 'play';
      return core;
    },

    step(input = {}) {
      const ev = core.events;
      ev.length = 0;
      const jump = !!input.jump;
      const inp = {
        left: !!input.left, right: !!input.right, up: !!input.up, down: !!input.down,
        jump, jumpPressed: jump && !prevJump,
      };
      prevJump = jump;
      core.frame++;
      if (core.state !== 'play') return core;

      const p = core.player;
      gen.ensure(p.x + 1600);
      p.px = p.x;
      p.py = p.y;
      p.update(inp, core.world, ev);
      core.objects.update(core);
      for (const f of registry.hooks.onStep) f(core, inp);

      if (!p.dead) {
        core.time++;
        const seg = gen.at(p.x);
        if (p.y > seg.yLow + WORLD.PIT || p.y > WORLD.H) core.kill(true);
        if (p.x > core.distance) core.distance = p.x;
        if (seg.zone !== core.zoneIndex) {
          core.zoneIndex = seg.zone;
          ev.push('zone');
        }
      } else if (++core.deadT > 90) {
        respawn();
      }

      if (core.frame % 120 === 0) {
        const xMin = Math.min(core.checkpoint.x, p.x) - 1024;
        core.world.prune(xMin);
        core.objects.prune(xMin);
        gen.prune(xMin);
      }
      return core;
    },

    addRings(n) {
      const before = core.rings;
      core.rings += n;
      if (Math.floor(core.rings / 100) > Math.floor(before / 100)) {
        core.lives++;
        core.events.push('life');
      }
    },

    // Damage from a source at x. Rings shield you; no rings, no shield.
    hurt(srcX) {
      const p = core.player, P = registry.physics;
      if (p.dead || p.hurt || p.invuln > 0) return false;
      if (core.rings === 0) {
        core.kill(false);
        return true;
      }
      scatter(Math.min(core.rings, 32));
      core.rings = 0;
      p.ground = false;
      p.rolling = false;
      p.spindash = false;
      p.jumping = false;
      p.lock = 0;
      p.uncurl();
      p.hurt = true;
      p.invuln = P.invuln;
      p.xsp = (p.x >= srcX ? 1 : -1) * P.hurtX;
      p.ysp = P.hurtY;
      core.events.push('hurt');
      return true;
    },

    kill(pit) {
      const p = core.player;
      if (p.dead) return;
      p.dead = true;
      p.ground = false;
      p.xsp = 0;
      p.ysp = pit ? 0 : -7;
      core.deadT = pit ? 30 : 0;
      core.events.push('die');
    },

    zone() {
      const z = registry.zones;
      return z.length ? z[core.zoneIndex % z.length] : null;
    },

    act() {
      return Math.floor(core.zoneIndex / Math.max(1, registry.zones.length)) + 1;
    },

    zoneAt(x) {
      const z = registry.zones;
      return z.length ? z[gen.at(x).zone % z.length] : null;
    },
  };

  function scatter(n) {
    if (!registry.types.has('lostRing')) return;
    const p = core.player;
    for (let i = 0; i < n; i++) {
      const sp = i < 16 ? 4 : 2;
      const a = (((i % 16) >> 1) + 0.5) / 8 * (Math.PI / 2);
      const side = i % 2 ? -1 : 1;
      core.objects.spawn('lostRing', p.x, p.y, {
        xsp: Math.cos(a) * sp * side, ysp: -Math.sin(a) * sp, life: 256,
      });
    }
  }

  function respawn() {
    core.lives--;
    if (core.lives <= 0) {
      core.state = 'over';
      core.events.push('over');
      return;
    }
    const c = core.checkpoint;
    core.player.reset(c.x, c.y);
    core.rings = 0;
    core.deadT = 0;
    core.events.push('respawn');
  }

  for (const c of carts) core.lockOn(c);
  return core;
}

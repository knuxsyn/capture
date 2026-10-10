// The core: a headless, deterministic simulation. No DOM. One call to
// step(input) advances one 60 Hz frame. Content arrives through lockOn().
import { PHYSICS, WORLD, ACTS, POWERS, AIR, SKIM, POWER_TIME, SUPER_RINGS } from './constants.js';
import { hashSeed, createRng, mix } from './rng.js';
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
    zoneGen: null,
    physics: { ...PHYSICS },
    hooks: Object.fromEntries(HOOKS.map((h) => [h, []])),
    carts: [],
  };

  let gen = null;
  let prevJump = false;
  const zoneCache = new Map();
  const physicsCache = new Map();

  // The physics table in effect: cart physics, then super or shoes, then
  // water on top. Plain running returns the registry table itself.
  function physicsFor(wet, shoes, sup) {
    const key = (wet ? 1 : 0) | (shoes ? 2 : 0) | (sup ? 4 : 0);
    if (!key) return registry.physics;
    if (!physicsCache.has(key)) {
      const P = { ...registry.physics };
      const apply = (m) => {
        for (const [k, v] of Object.entries(m.mul ?? {})) P[k] *= v;
        for (const [k, v] of Object.entries(m.add ?? {})) P[k] += v;
        Object.assign(P, m.set ?? {});
      };
      if (sup) apply(POWERS.super);
      else if (shoes) apply(POWERS.shoes);
      if (wet) apply(POWERS.water);
      physicsCache.set(key, Object.freeze(P));
    }
    return physicsCache.get(key);
  }

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
    actIndex: 0,
    state: 'boot',
    events: [],
    shield: null, // null | 'basic' | 'fire' | 'lightning' | 'bubble'
    power: { invinc: 0, shoes: 0, super: false },
    checkpoint: null,
    deadT: 0,
    world: null,
    objects: null,
    player: null,
    gen: null,

    // A cartridge is a plain object; every field is optional.
    //   { id, name, physics, segments, objects, zones, zoneGen, hooks, install(core) }
    // Segments with an existing id replace it, so carts can override base content.
    lockOn(cart) {
      if (registry.carts.some((c) => c.id === cart.id)) return core;
      registry.carts.push(cart);
      if (cart.physics) Object.assign(registry.physics, cart.physics);
      for (const s of cart.segments ?? []) registry.segments.set(s.id, s);
      for (const [k, t] of Object.entries(cart.objects ?? {})) registry.types.set(k, t);
      if (cart.zones) registry.zones.push(...cart.zones);
      if (cart.zoneGen) registry.zoneGen = cart.zoneGen;
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

      const p = core.player, world = core.world, pw = core.power;
      gen.ensure(p.x + 1600);
      p.px = p.x;
      p.py = p.y;

      // Super: 50 rings, then up + jump in mid-air. The press is consumed.
      if (!p.dead && !p.ground && inp.up && inp.jumpPressed && !pw.super && core.rings >= SUPER_RINGS) {
        pw.super = true;
        inp.jumpPressed = false;
        ev.push('super');
      }
      world.skim = !p.dead && !p.wet && Math.abs(p.xsp) >= SKIM;
      p.P = physicsFor(p.wet, pw.shoes > 0, pw.super);
      p.update(inp, world, ev);
      if (!p.dead) liquids(p, ev);
      if (pw.invinc > 0) pw.invinc--;
      if (pw.shoes > 0) pw.shoes--;
      if (pw.super && core.frame % 60 === 0 && --core.rings <= 0) {
        core.rings = 0;
        pw.super = false;
        ev.push('unsuper');
      }
      core.objects.update(core);
      for (const f of registry.hooks.onStep) f(core, inp);

      if (!p.dead) {
        core.time++;
        const seg = gen.at(p.x);
        if (p.y > seg.yLow + WORLD.PIT || p.y > WORLD.H) core.kill(true);
        if (p.x > core.distance) core.distance = p.x;
        if (seg.act !== core.actIndex) {
          core.actIndex = seg.act;
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

    // Invincible or super: nothing hurts, and touching an enemy destroys it.
    mighty() {
      return core.power.invinc > 0 || core.power.super;
    },

    // An item from a monitor.
    giveItem(kind) {
      if (kind === 'rings') core.addRings(10);
      else if (kind === 'life') { core.lives++; core.events.push('life'); }
      else if (kind === 'invincible') core.power.invinc = POWER_TIME;
      else if (kind === 'shoes') core.power.shoes = POWER_TIME;
      else core.shield = kind;
      core.events.push('item');
    },

    // Damage from a source at x. A shield takes the hit (fire shrugs off
    // fire); otherwise rings scatter; with no rings, you die.
    hurt(srcX, kind) {
      const p = core.player, P = registry.physics;
      if (p.dead || p.hurt || p.invuln > 0 || core.mighty()) return false;
      if (kind === 'fire' && core.shield === 'fire') return false;
      if (core.shield) {
        core.shield = null;
      } else if (core.rings === 0) {
        core.kill(false);
        return true;
      } else {
        scatter(Math.min(core.rings, 32));
        core.rings = 0;
      }
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

    // pit: true for a fall, 'drown' for running out of air.
    kill(pit) {
      const p = core.player;
      if (p.dead) return;
      p.dead = true;
      p.ground = false;
      p.xsp = 0;
      p.ysp = pit ? 0 : -7;
      core.deadT = pit === true ? 30 : 0;
      core.shield = null;
      core.power.super = false;
      core.events.push('die');
      if (pit === 'drown') core.events.push('drown');
    },

    // Zone z's identity: palette, patterns, production mix. Generated from
    // (seed, z) by the cart's zoneGen, or cycled from fixed `zones`.
    zoneInfo(z) {
      if (!zoneCache.has(z)) {
        const fixed = registry.zones;
        const info = registry.zoneGen
          ? registry.zoneGen(createRng(mix(core.seed ^ 0x2f6e, z)), z, { fixed, ids: [...registry.segments.keys()] })
          : fixed.length ? fixed[z % fixed.length] : null;
        zoneCache.set(z, info);
      }
      return zoneCache.get(z);
    },

    zone() {
      return core.zoneInfo(Math.floor(core.actIndex / ACTS));
    },

    act() {
      return (core.actIndex % ACTS) + 1;
    },

    zoneAt(x) {
      return core.zoneInfo(gen.at(x).zone);
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

  // Water: entering halves speed, leaving doubles the climb out, and air
  // runs down unless you surface, grab a bubble, or wear the bubble shield.
  // Lava burns (unless fire shield or invincible) and throws you upward.
  function liquids(p, ev) {
    const l = core.world.liquidAt(p.x);
    const wet = !!l && l.kind === 'water' && p.y > l.y;
    if (wet && !p.wet) {
      p.xsp *= 0.5;
      p.ysp *= 0.25;
      if (p.ground) p.gsp *= 0.5;
      ev.push('splash');
    } else if (!wet && p.wet) {
      if (p.ysp < 0 && p.ysp > -4) p.ysp *= 2; // a jump out of the water carries; a spring is already fast
      ev.push('splash');
    }
    p.wet = wet;
    if (wet && core.shield !== 'bubble' && !core.power.super) {
      p.air--;
      if (p.air === 1500 || p.air === 1200 || p.air === 900) ev.push('airwarn');
      if (p.air <= 720 && p.air % 120 === 0) ev.push('aircount');
      if (p.air <= 0) core.kill('drown');
    } else {
      p.air = AIR;
    }
    if (l && l.kind === 'lava' && p.y + p.hr > l.y + 4) {
      // Knocked forward, not back into the bank. A bounce that doesn't hurt
      // (still flashing) hands control back, or you could bob here forever.
      if (core.shield === 'fire' || core.mighty() || !core.hurt(p.x - p.facing, 'fire')) p.hurt = false;
      p.ground = false;
      p.rolling = false;
      p.ysp = -7;
      ev.push('sizzle');
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
    core.player.P = registry.physics;
    core.rings = 0;
    core.shield = null;
    core.power = { invinc: 0, shoes: 0, super: false };
    core.deadT = 0;
    core.events.push('respawn');
  }

  for (const c of carts) core.lockOn(c);
  return core;
}

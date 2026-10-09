# Infinite Zone

An endless side-scroller on S3K-style physics: loops, slopes, spindash, rings, springs. Every act is generated from a seed and streamed forever. The engine is a headless core that content "locks on" to, like the Sonic & Knuckles cartridge. The base game is itself a cartridge, so mods use the same API the game uses.

Zero dependencies. No build step to develop; one script to bundle a single offline file.

```bash
npm run serve   # http://localhost:8080 (ES modules need a server, not file://)
npm test        # physics invariants + bot traversal across 100 seeds and every cart
npm run build   # dist/index.html: one self-contained file
```

## Layers

| Layer | Files | Role |
|---|---|---|
| Core | `src/core/` | Deterministic sim. No DOM. `step(input)` = one 60 Hz frame. |
| Base cart | `src/content/base.js` | 14 segment productions, 7 object types, 4 zone palettes |
| Bot | `src/content/bot.js` | Reference player for attract mode and the traversal eval |
| Shell | `src/shell/` | Canvas renderer, input, synth SFX, page loop |
| Mods | `mods/` | Example carts: physics (`moon`), content (`skyways`), ability (`glide`) |

## Writing a cartridge

A cart is a plain object. Every field is optional.

```js
export const myCart = {
  id: 'my-cart',
  name: 'My Cart',
  physics: { top: 7 },                 // override any constant in src/core/constants.js
  segments: [{                          // add productions to the grammar (same id replaces)
    id: 'double-loop', weight: 0.5, minD: 0.3,
    build(b) { b.flat(128); b.loop(96); b.flat(64); b.loop(80); b.flat(128); },
  }],
  objects: {                            // new object types
    bumper: { w: 12, h: 12, touch(o, p, core) { p.ysp = -7; }, draw(ctx, o, f) { /* canvas */ } },
  },
  zones: [{ name: 'Night Shift', sky: ['#000', '#123'], /* see base.js for keys */ }],
  hooks: {                              // beforeAir, onLand, onStep, onSegment, drawPlayer
    onStep(core, input) {},
  },
};

createCore({ seed: 'ridge-4821', carts: [base, myCart] }).start();
```

The builder `b` is the grammar's vocabulary: `flat`, `slope`, `hills`, `dip`, `gap`, `step`, `loop`, `platform`, `block`, `spawn`, `ring`, `ringLine`, `ringArc`, `groundAt`, plus `jumpRange()`, `jumpHeight()`, `springHeight(power)`. Those last three read the physics table, so a production spaced with them stays fair under any physics cart.

## The contract

1. **Determinism.** A level is a pure function of seed and carts. Segment *i* draws from `rng(mix(seed, i))`.
2. **Traversability.** `npm test` runs the bot through 100 seeds × 60 segments, plus each cart combination. A production the bot can't clear fails the build. That's the eval loop for anyone adding content.
3. **Walkability.** Uphill grades stay at or under ~20°, so a stopped player can always walk out. Pits get at least 288 px of runway. Platform spacing follows the full-speed jump arc.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the model behind each layer.

## Controls

Arrows or WASD to run, Z/X/Space to jump, ↓ to roll, ↓ + jump to rev a spindash. P pauses, G shows sensors, layers and segment boundaries, R restarts the seed, M mutes.

## Not affiliated

Original art and code. Physics constants follow the community-documented Sonic Physics Guide. No Sega assets are used or needed.

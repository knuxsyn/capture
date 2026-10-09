# Infinite Zone

An endless side-scroller on S3K-style physics: loops, slopes, spindash, rings, springs. Every act is generated from a seed and streamed forever. The engine is a headless core that content "locks on" to, like the Sonic & Knuckles cartridge. The base game is itself a cartridge, so mods use the same API the game uses.

Zero dependencies. No build step to develop; one script to bundle a single offline file.

```bash
npm run serve   # http://localhost:8080 (ES modules need a server, not file://)
npm test        # physics invariants, bot traversal, fair-player trap budget, every cart
npm run build   # dist/index.html: one self-contained file
```

## Layers

| Layer | Files | Role |
|---|---|---|
| Core | `src/core/` | Deterministic sim. No DOM. `step(input)` = one 60 Hz frame. |
| Base cart | `src/content/base.js` | 15 segment productions, 7 object types, a biome generator, 4 hand-made palettes |
| Players | `src/content/bot.js` | Expert bot (attract mode, traversal) and a reaction-time runner (fairness) |
| Shell | `src/shell/` | Canvas renderer, sprite skins, input, synth SFX, page loop |
| Mods | `mods/` | `circuit` (the default campaign), physics (`moon`), content (`skyways`), moveset (`glide`: glide, wall climb, ledge pull-up, belly-slide) |

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
2. **Traversability.** The expert bot plays 100 seeds × 60 segments, plus each cart combination. A production it can't clear fails the build.
3. **Fairness.** A reaction-time runner holds right, sees only what the camera shows, and reacts to a hazard only after it has been on screen for 0.5 s. Budget: no deaths in zones 1–2, at most 1 death, 1 hit and 0.5 wall slams per 100 segments. The generator keeps it by:
   - **Speed budget.** The builder integrates the speed a player holding right will carry. Hazard productions declare `maxSpeed`; arriving faster, the generator inserts a `brake` climb first.
   - **Catch floors.** Falling into a gap drops you to a lower route with a spring back up. Bottomless pits only appear in single-jump gaps, from difficulty 0.55.
   - **Ramps, not walls.** Rises in the running line are ramps; drops are ledges.
   - **Camera look-ahead** scales with speed, so hazards stay on screen longer at speed.
4. **Walkability.** Uphill grades stay at or under ~20°, so a stopped player can always walk out, and a stopped player can stand, crouch and spindash on a slope.

`node test/flow.mjs` prints deaths, hits and slams per production, which is where to look when a new production feels unfair.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the model behind each layer.

## Echidna Circuit (default)

Three designed zones that loop forever, two acts each, harder every lap. Each one is built around what Knuckles' moveset and the physics allow:

| Zone | Look | Asks you to |
|---|---|---|
| Coral Drift | sunny seascape, sand, palms, islands | glide chasms wider than any jump (sized from the glide arc), hop sea stacks, ride big dunes and loops |
| Ember Canyon | red rock at dusk, strata, mesas, hoodoos | climb cliffs taller than any spring (rings run up the face), smash cracked rock by rolling, spindashing or gliding into it |
| Static Ruins | neon night, bricks, colonnades | climb towers and glide between them, sprint crumbling bridges, jump or roll past flyers |

Tier rises a third of a step per zone: wider chasms, taller cliffs, faster crumbling, more flyers. Lap 2 changes the time of day, later laps rotate the hue, and from lap 3 some chasms and bridges are true pits. Falls before that land on catch floors; crumbled bridges rebuild when you respawn.

`node test/circuit.mjs`: the expert bot and the reaction-time runner both play the circuit with the full moveset (they glide, climb, smash and spindash), plus an endurance run of three laps on 10 seeds.

## Seeds and biomes

A seed fixes the start altitude and every zone. Each zone (two acts of 16 segments) is generated by the cart's `zoneGen` from (seed, zone index):

- **Identity:** a name, a time of day (day, dawn, dusk, night with stars, haze), an HSL-derived palette, a ground pattern (strata, bricks, pebbles, diagonal, columns, waves) and a skyline (peaks, spires, mesas, rolling, canopy).
- **Structure:** a production mix (every weight jittered, one or two signature sections boosted), a height scale for hills/slopes/drops/halfpipes, a length scale for runways and hills, and a loop-size bias.

The fairness rules sit underneath, so every biome keeps the same budgets. A cart can supply its own `zoneGen` or add hand-made palettes through `zones`.

## Character skins

The built-in runner is drawn in code. Any sprite sheet can replace it:

1. `python3 tools/slice.py sheet.png` finds every sprite on a rip and writes `sheet.frames.json` plus `sheet.preview.png` with each frame numbered.
2. Write an atlas mapping animations to frame numbers: `idle walk run dash roll spindash skid push crouch spring fall hurt die` (see `src/shell/skin.js`; missing ones fall back sensibly).
3. In the page, **Load sheet** with the image and the atlas. It stays in that browser. For local development, put `sheet.png` and `skin.json` in `skins/local/` (git-ignored) and `npm run serve`.

Third-party art never goes in the repo or the bundle. Known sheet layouts live in `src/shell/presets.js` (matched by image size, coordinates only), so the image alone is enough. The S3K Knuckles sheet from The Spriters Resource (ripped by Triangly & Paraemon, 1131×1862) is mapped: idle, bored, look up, ledge balance, walk, run, roll, spindash, skid, push, crouch, spring, hurt, death, plus glide, glide turn, drop, belly-slide, get up, climb and ledge pull-up. Pair it with the Glide & Climb cartridge.

`tools/bundle.mjs --skin sheet.png` also writes `dist/personal.html` with the sheet embedded, for your own offline play (never publish or commit it).

## Controls

Arrows or WASD to run, Z/X/Space to jump, ↓ to roll, ↓ + jump to rev a spindash. ↑ looks up. With Glide & Climb: jump again mid-air to glide, glide into a wall to grab it, ↑/↓ to climb, jump to kick off. P pauses, G shows sensors, layers and segment boundaries, R restarts the seed, M mutes.

## Not affiliated

Original code, terrain and built-in character. Physics constants follow the community-documented Sonic Physics Guide. No Sega assets are in this repo or its bundle; skins load from the player's own files, and presets store only frame coordinates. Character sprites from a loaded sheet belong to Sonic Team and SEGA.

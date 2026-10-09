// Object system. Types are plain records registered by cartridges:
//   { w, h, init(o, core), update(o, core), touch(o, player, core), draw(ctx, o, frame) }
// w/h are hitbox half-extents. Only objects near the player are simulated.

export class Objects {
  constructor(types) {
    this.types = types;
    this.list = [];
    this.nextId = 1;
  }

  spawn(type, x, y, props = {}) {
    const T = this.types.get(type);
    if (!T) throw new Error(`Unknown object type "${type}"`);
    const o = { id: this.nextId++, type, x, y, x0: x, y0: y, alive: true, t: 0, w: T.w ?? 8, h: T.h ?? 8, ...props };
    T.init?.(o);
    this.list.push(o);
    return o;
  }

  update(core) {
    const p = core.player, lo = p.x - 640, hi = p.x + 800;
    // Index loop: objects spawned this frame (lost rings) join immediately.
    for (let i = 0; i < this.list.length; i++) {
      const o = this.list[i];
      if (!o.alive || o.x < lo || o.x > hi) continue;
      const T = this.types.get(o.type);
      o.t++;
      T.update?.(o, core);
      if (o.alive && T.touch && !p.dead &&
          Math.abs(o.x - p.x) < o.w + 8 &&
          Math.abs(o.y - p.y) < o.h + p.hr - 3) {
        T.touch(o, p, core);
      }
    }
    if (core.frame % 60 === 0) this.list = this.list.filter((o) => o.alive);
  }

  prune(xMin) {
    this.list = this.list.filter((o) => o.alive && o.x >= xMin);
  }

  *near(x0, x1) {
    for (const o of this.list) if (o.alive && o.x >= x0 && o.x <= x1) yield o;
  }
}

// Engine-level object: path swapper. Crossing its x line inside [ya, yb]
// moves the player to `right` or `left` collision layer by direction.
export const swapType = {
  w: 0, h: 0,
  update(o, core) {
    const p = core.player;
    if (p.dead || p.y < o.ya || p.y > o.yb) return;
    if (p.px < o.x && p.x >= o.x) p.layer = o.right;
    else if (p.px >= o.x && p.x < o.x) p.layer = o.left;
  },
};

// The camera lives in the core (no DOM) so tests can ask what a player
// would actually see: the reaction-time runner reads `ahead()`.
export const VIEW_W = 400;
export const VIEW_H = 224;
const LOOK_MAX = 136; // look-ahead at speed, px: keeps hazards on screen longer

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.look = 0;
  }

  snap(p) {
    this.x = Math.max(0, p.x - VIEW_W / 2);
    this.y = p.y - VIEW_H / 2 + 8;
    this.look = 0;
  }

  follow(core) {
    const p = core.player;
    if (core.events.includes('respawn')) this.snap(p);
    const target = Math.max(-48, Math.min(LOOK_MAX, p.xsp * 16));
    this.look += (target - this.look) * 0.06;
    const tx = p.x - VIEW_W / 2 + this.look;
    this.x = Math.max(0, this.x + Math.max(-24, Math.min(24, tx - this.x)));
    if (p.dead) return;
    let ty = p.y - VIEW_H / 2 + 8;
    if (!p.ground) {
      const dy = ty - this.y;
      ty = Math.abs(dy) < 32 ? this.y : this.y + dy - Math.sign(dy) * 32;
    }
    const v = !p.ground || Math.abs(p.gsp) > 8 ? 16 : 6;
    this.y += Math.max(-v, Math.min(v, ty - this.y));
    this.y = Math.min(this.y, core.gen.at(p.x).yLow + 150 - VIEW_H);
  }

  // Pixels of level visible ahead of the player right now.
  ahead(p) {
    return this.x + VIEW_W - p.x;
  }
}

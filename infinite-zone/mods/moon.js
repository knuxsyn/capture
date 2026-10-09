// Physics-only cartridge. Base productions read the physics table
// (b.jumpRange(), b.jumpHeight()), so levels re-space themselves.
export const moon = {
  id: 'moon',
  name: 'Moon Physics',
  blurb: 'Gravity at 60%. Floatier arcs; gaps and platforms re-space to match.',
  physics: { grv: 0.13125, jmp: 5, jmpCut: 3 },
};

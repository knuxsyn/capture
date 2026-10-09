// Atlases for known sprite sheets, matched by image size, so loading the
// sheet alone is enough. Coordinates only: the art itself never ships.
// Frames are anchored to the sheet's 48 px cells (bottom-center), which keep
// the original's per-frame origins; rolls use tight boxes, centered.

export const PRESETS = {
  // Knuckles the Echidna, Sonic 3 & Knuckles. The Spriters Resource sheet
  // ripped by Triangly & Paraemon (1131 x 1862).
  '1131x1862': {
    name: 'Knuckles (Sonic Team / SEGA sprites)',
    key: ['#107084', '#41a9b8', '#99d9ea'],
    anims: {
      idle: { frames: [[24, 277, 48, 48]], pivot: "feet" },
      walk: { frames: [[664, 350, 48, 48], [716, 350, 48, 48], [768, 350, 48, 48], [820, 350, 48, 48], [872, 350, 48, 48], [924, 350, 48, 48], [976, 350, 48, 48], [1028, 350, 48, 48]], pivot: "feet" },
      run: { frames: [[24, 423, 48, 48], [76, 423, 48, 48], [128, 423, 48, 48], [180, 423, 48, 48]], pivot: "feet" },
      roll: { frames: [[257, 437, 30, 31], [465, 437, 30, 30], [308, 437, 31, 30], [465, 437, 30, 30], [361, 436, 30, 31], [465, 437, 30, 30], [413, 437, 31, 30], [465, 437, 30, 30]], pivot: "center" },
      spindash: { frames: [[24, 508, 48, 48], [76, 508, 48, 48], [128, 508, 48, 48], [180, 508, 48, 48], [232, 508, 48, 48], [284, 508, 48, 48]], pivot: "feet" },
      skid: { frames: [[412, 633, 48, 48], [464, 633, 48, 48], [516, 633, 48, 48], [568, 633, 49, 48]], pivot: "feet", fps: 12, loop: false },
      push: { frames: [[736, 779, 48, 48], [788, 779, 48, 48], [840, 779, 48, 48], [892, 779, 48, 48]], pivot: "feet", fps: 5 },
      crouch: { frames: [[793, 277, 48, 48], [845, 277, 48, 48]], pivot: "feet", fps: 12, loop: false },
      spring: { frames: [[636, 633, 48, 52]], pivot: "feet" },
      hurt: { frames: [[960, 556, 48, 48]], pivot: "feet" },
      die: { frames: [[728, 884, 48, 50]], pivot: "feet" },
      glide: { frames: [[24, 1025, 48, 24]], pivot: "center" },
    },
  },
};

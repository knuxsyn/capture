// Atlases for known sprite sheets, matched by image size, so loading the
// sheet alone is enough. Coordinates only: the art itself never ships.
// Frames are anchored to the sheet's 48 px cells (bottom-center), which keep
// the original's per-frame origins; rolls and glides use tight boxes,
// centered; climbing frames put the hands on the wall (ox = width - 11).

export const PRESETS = {
  // Knuckles the Echidna, Sonic 3 & Knuckles. The Spriters Resource sheet
  // ripped by Triangly & Paraemon (1131 x 1862).
  '1131x1862': {
    name: 'Knuckles (Sonic Team / SEGA sprites)',
    key: ['#107084', '#41a9b8', '#99d9ea'],
    carts: ['glide'],
    anims: {
      idle: { frames: [[24, 277, 48, 48]], pivot: "feet" },
      bored: { frames: [[76, 277, 48, 48], [128, 277, 48, 48], [180, 277, 48, 48], [232, 277, 48, 48], [285, 277, 48, 48], [337, 277, 48, 48], [389, 277, 48, 48], [441, 277, 48, 48], [493, 277, 48, 48], [545, 277, 50, 48]], pivot: "feet", fps: 6 },
      lookup: { frames: [[672, 277, 48, 48], [725, 277, 48, 48]], pivot: "feet", fps: 12, loop: false },
      balance: { frames: [[740, 524, 48, 48], [792, 524, 49, 48], [845, 524, 54, 48]], pivot: "feet", fps: 8 },
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
      glideTurn: { frames: [[76, 1020, 44, 40]], pivot: "center" },
      drop: { frames: [[129, 1013, 39, 47]], pivot: "center" },
      glideSlide: { frames: [[180, 1029, 54, 19]], pivot: "feet" },
      getUp: { frames: [[238, 1028, 40, 29]], pivot: "feet" },
      climb: { frames: [[28, 1095, 31, 37, 20, 18], [79, 1097, 32, 32, 21, 16], [132, 1093, 31, 40, 20, 20], [184, 1097, 31, 35, 20, 17], [235, 1097, 32, 29, 21, 14], [289, 1096, 30, 32, 19, 16]], pivot: "center" },
      climbUp: { frames: [[32, 1145, 32, 34, 21, 17], [85, 1145, 29, 40, 18, 20], [137, 1151, 35, 34, 24, 17]], pivot: "center", fps: 10, loop: false },
    },
  },
};

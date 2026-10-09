// Physics constants in pixels per frame at 60 fps. Values follow the
// Sonic Physics Guide (S3K column). Mods override these via `physics`.
export const PHYSICS = Object.freeze({
  acc: 0.046875,        // ground acceleration
  dec: 0.5,             // ground deceleration when pressing against motion
  frc: 0.046875,        // ground friction
  top: 6,               // top running speed (input-limited, slopes can exceed)
  slp: 0.125,           // slope factor while running
  slpRollUp: 0.078125,  // slope factor rolling uphill
  slpRollDown: 0.3125,  // slope factor rolling downhill
  rollFrc: 0.0234375,
  rollDec: 0.125,
  rollMin: 1.03125,     // minimum |gsp| to start a roll
  unroll: 0.5,          // below this |gsp| a roll ends
  air: 0.09375,         // air acceleration
  grv: 0.21875,         // gravity
  jmp: 6.5,             // jump impulse along the surface normal
  jmpCut: 4,            // releasing jump caps upward speed to this
  maxFall: 16,
  maxGsp: 16,
  slipSpeed: 2.5,       // below this on steep ground you slip or fall off
  lockFrames: 30,       // control lock after slipping
  dashBase: 8,          // spindash release speed
  dashRevAdd: 2,
  dashRevMax: 8,
  standW: 9, standH: 19, // collision radii standing
  rollW: 7, rollH: 14,   // collision radii curled
  pushR: 10,             // wall sensor reach
  hurtX: 2, hurtY: -4, hurtGrv: 0.1875,
  invuln: 120,
});

export const WORLD = Object.freeze({
  CHUNK: 128,   // chunk edge in px (S3K chunks are 128x128)
  BLOCK: 16,    // block edge in px (S3K blocks are 16x16)
  H: 2048,      // world height in px; width is unbounded
  Y_TOP: 448,   // generator keeps ground surface between Y_TOP and Y_BOT
  Y_BOT: 1536,
  DEPTH: 640,   // how far below the surface ground is filled
  PIT: 360,     // falling this far below a segment's lowest surface kills
});

export const ZONE_LEN = 16; // segments per zone before the palette rotates

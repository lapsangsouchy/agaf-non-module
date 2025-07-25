/* Getting‑Over‑It prototype — v5 */

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

/* ---------- Fail-State progression --------------------------------- */
/* Each object = one upgrade in story order. */
const FAIL_STATES = [
  {
    // Fail-State 1 - The First Hurdle
    name: 'longArm',
    checkpointY: 0, // stand here first…
    topBoundY: -192, // …then climb above this OR
    bottomBoundY: 256, //    fall below this to trigger
    targetLen: 174, // final length
    stepLen: (174 - 120) / 3, // arm pixel increase every fall
    unlock: (player) => player.unlockLongArm(174),
    toastStep: 'ARM_STEP',
    toastUnlock: 'ARM_UNLOCK',
    toastHints: ['FAIL_HINT_1', 'FAIL_HINT_2', 'FAIL_HINT_3'],
  },
  {
    // Fail-State 2 - Rope Swing
    name: 'swingWall',
    checkpointY: -768,
    topBoundY: -1088,
    bottomBoundY: -512,
    targetLen: 216,
    stepLen: (216 - 174) / 3,
    unlock: (player) => {
      player.unlockLongArm(216);
    },
    toastStep: 'ARM_STEP',
    toastUnlock: 'ARM_UNLOCK',
    toastHints: ['FAIL_HINT_4', 'FAIL_HINT_5', 'FAIL_HINT_6'],
  },
  {
    // Fail-State 3 - Push Up the Wall
    name: 'wallPush',
    checkpointY: -2048,
    topBoundY: -2264,
    bottomBoundY: -1856,
    targetLen: 300,
    stepLen: (300 - 216) / 3,
    unlock: (player) => {
      player.unlockLongArm(300);
    },
    toastStep: 'ARM_STEP',
    toastUnlock: 'ARM_UNLOCK',
    toastHints: ['FAIL_HINT_7', 'FAIL_HINT_8', 'FAIL_HINT_9'],
  },
  {
    name: 'finalChallenge',
    checkpointY: -2752,
    topBoundY: -3168,
    bottomBoundY: -2560,
    targetLen: 300,
    stepLen: 0,
    unlock: (player) => {
      player.unlockLongArm(300);
    },
    toastStep: 'ARM_STEP',
    toastUnlock: 'ARM_UNLOCK',
    toastHints: ['FAIL_HINT_10', 'FAIL_HINT_11', 'FAIL_HINT_12'],
  },
];

const MSG_TIME_FRAMES = 300; // 4-second toast

const TILE_SIZE = 16; // world pixels per tile
const SCALE = 4; // world pixels per screen pixel
const CLIFF_W = 160; // width of the right cliff
const GRID_UNIT = 64; // grid size for snapping
const GRAVITY = 0.4; // gravity strength
const FRICTION = 0.98; // friction strength
const LIFT_SPEED = 0.05; // speed of lifting the player
const DROP_SPEED = 0.2; // speed of dropping the player
const SCREEN_GAP = 0.5; // gap between screens in world units
const EDGE_TOL = 2;
const MIN_LEN = 0; // minimum rope length
const MAX_LEN = 120; // maximum rope length
const GROUND_Y = 400; // y-coordinate of the ground
const HIT_GROUND = 100; // height of the ground hitbox
const GUIDE_FADE_FRAMES = 300; // Fade of tutorial gifs

/* ------------- Viewport Variables ---------*/
const WORLD = { w: 800, h: 450 };

let scaleFactor = 1; // scale factor
let letterBoxOffset = { x: 0, y: 0 }; // letter-box offsets

const TILES = {
  tinyGrass: {
    cap: { x: 0, y: 296, w: 8, h: 8 }, // left-cap tile
    mid: { x: 8, y: 296, w: 8, h: 8 }, // middle tile
    scale: 4,
    method: 'caps',
    art: 32,
  },
  grass16: {
    tile: { x: 0, y: 296, w: 16, h: 16 }, // one tile only
    scale: 4,
    method: 'repeat',
  },
  groundFill: {
    tile: { x: 0, y: 296, w: 16, h: 16 },
    scale: 4,
    method: 'tileY',
  },

  /* ------------ stone cliff (right-side wall) ------------ */
  cliffStone: {
    stone: { x: 0, y: 328, w: 16, h: 16 }, // 16×16 repeating block
    taper: { x: 96, y: 328, w: 8, h: 16 }, // 8×16 semi-transparent edge
    scale: 4,
    method: 'cliff', // <-- new method tag
    noLatch: true, // no latching on this surface
  },

  /* ---------- NEW NON-LATCHABLE STONE BLOCK ---------- */
  stoneBlock: {
    // 64 × 64 in world-space
    tile: { x: 0, y: 328, w: 16, h: 16 }, // same pixels as cliff face
    scale: 4,
    method: 'single',
    hit: 64,
    noLatch: true,
  },

  /* ---------- NEW LATCHABLE GRASSY STRIP ---------- */
  grassySurfaceL: {
    // 64 × 16 in world-space
    tile: { x: 32, y: 288, w: 4, h: 8 }, // tweak w/h if your atlas differs
    scale: 4,
    method: 'single',
    hit: 32, // same top-surface depth as other platforms
    snapW: false,
    art: 32,
  },

  grassySurfaceR: {
    tile: { x: 32, y: 288, w: 4, h: 8 },
    scale: 4,
    method: 'single',
    flipX: true,
    snapW: false,
    hit: 32,
    art: 32,
    align: 'right',
  },

  /* ---------- 32 × 16 grassy ledges (horizontal) ---------- */
  grassySurfaceT: {
    // top-left half-cell
    tile: { x: 32, y: 288, w: 4, h: 8 },
    scale: 4,
    method: 'single',
    rot90: true, // rotate 90° clockwise (so width → 32 px)
    hit: 16, // collision depth matches sprite height
    art: 16,
    snapW: false,
  },
  grassySurfaceTR: {
    // top-right
    tile: { x: 32, y: 288, w: 4, h: 8 },
    scale: 4,
    method: 'single',
    rot90: true,
    flipX: true, // mirror so grass blades face left
    hit: 16,
    art: 16,
    snapW: false,
    align: 'right', // shove into right-hand 32 px of the cell
  },
  grassySurfaceB: {
    // bottom-left
    tile: { x: 32, y: 288, w: 4, h: 8 },
    scale: 4,
    method: 'single',
    rot90: true,
    flipY: true, // blades point down
    hit: 16,
    art: 16,
    snapW: false,
  },
  grassySurfaceBR: {
    // bottom-right  ← the error case
    tile: { x: 32, y: 288, w: 4, h: 8 },
    scale: 4,
    method: 'single',
    rot90: true,
    flipX: true,
    flipY: true,
    hit: 16,
    art: 16,
    snapW: false,
    align: 'right',
  },

  /* add more here ↓ */
  // stone:     { x: 32,  y: 296, w:16, h:16, scale: 4, method: 'repeat' },
};

/* Cliff.js — stone-wall variant */

function buildCliffStone(
  rightGutter, // width of the gutter in world pixels
  stoneImg,
  taperImg, // 16×16 and 8×16 tiles, already in memory
  scale = 4,
  bg = '#130022' // very dark purple
) {
  const stoneW = stoneImg.width * scale; // 16→64
  const stoneH = stoneImg.height * scale;
  const taperW = taperImg.width * scale; //  8→32
  const taperH = taperImg.height * scale;

  const cliffH = 3136; // tall enough for any climb
  const g = createGraphics(rightGutter, cliffH);
  g.noSmooth();
  g.background(bg); // shows through taper’s alpha

  /* 1 ▸ fill with stone except the taper column */
  const fillW = rightGutter - taperW;
  for (let y = 0; y < cliffH; y += stoneH) {
    for (let x = 0; x < fillW; x += stoneW) {
      g.image(stoneImg, x, y, stoneW, stoneH);
    }
  }

  /* 2 ▸ vertical taper strip */
  for (let y = 0; y < cliffH; y += taperH) {
    g.image(taperImg, fillW, y, taperW, taperH);
  }

  return g;
}

const Debug = {
  active: false, // master flag
  showGrid: false, // draw coordinate grid
  freeMove: false, // arrow‑key teleport
  gridSize: GRID_UNIT, // px between grid lines
  physics: {
    gravity: true,
    friction: true,
  },
  world: {
    bounds: false, // draw world bounds
    lanes: true, // draw lane bounds
  },
  brush: false,
  snap: GRID_UNIT, // snap to grid size
  longArm: false,
  showBoxes: false,
};

/**
 * Raycast a moving circle (a→b) against an AABB expanded by radius r.
 * @param {p5.Vector} a      Start point
 * @param {p5.Vector} b      End point
 * @param {object}    rect   { x, y, w, hHit }
 * @param {number}    r      Circle radius
 * @returns {number|null}    t in [0,1] of first impact, or null if none
 */
function segmentRectTOI(a, b, rect, r) {
  // 1) expanded bounds
  const minX = rect.x - r;
  const maxX = rect.x + rect.w + r;
  const minY = rect.y - r;
  const maxY = rect.y + rect.hHit + r;

  // 2) movement vector
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  let tEnter = 0;
  let tExit = 1;

  // X‐slab
  if (dx === 0) {
    if (a.x < minX || a.x > maxX) return null;
  } else {
    const tx1 = (minX - a.x) / dx;
    const tx2 = (maxX - a.x) / dx;
    const txMin = Math.min(tx1, tx2);
    const txMax = Math.max(tx1, tx2);
    tEnter = Math.max(tEnter, txMin);
    tExit = Math.min(tExit, txMax);
    if (tEnter > tExit) return null;
  }

  // Y‐slab
  if (dy === 0) {
    if (a.y < minY || a.y > maxY) return null;
  } else {
    const ty1 = (minY - a.y) / dy;
    const ty2 = (maxY - a.y) / dy;
    const tyMin = Math.min(ty1, ty2);
    const tyMax = Math.max(ty1, ty2);
    tEnter = Math.max(tEnter, tyMin);
    tExit = Math.min(tExit, tyMax);
    if (tEnter > tExit) return null;
  }

  // if the entry time is within [0,1], we hit
  return tEnter >= 0 && tEnter <= 1 ? tEnter : null;
}

/* ---------- Start of p5.js Implementation --------------------------- */

// ── fullscreen toggle globals ────────────────────────
let fsBtn, fsTooltip;
const FS_BTN_SIZE = 32;
const FS_ICON = '⛶'; // enter fullscreen
const EXIT_FS_ICON = '🗗'; // exit fullscreen

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function updateFullscreenButton() {
  // swap icon
  fsBtn.html(document.fullscreenElement ? EXIT_FS_ICON : FS_ICON);
}
/* ---------- States ------------------- */
const STATE_INTRO = 'intro'; // selfie?
const STATE_CAM = 'webcam'; // live preview & capture
const STATE_REVIEW = 'review'; // show round selfie Yes / Retake
const STATE_NAME = 'name'; // enter your name
const STATE_PLAY = 'playing'; // normal gameplay

let gameState = STATE_INTRO;

/* ---------- User Interface Screens ------------------ */
let ui = {
  introYes: null,
  introSkip: null,
  camCapture: null,
  reviewTxt: null,
  reviewYes: null,
  reviewRetry: null,
  namePrompt: null,
  nameInput: null,
  nameStart: null,
};

const COPY = {
  // tutorial steps  (was TUTORIAL_STEPS in sketch.js)
  TUT: [
    (n) =>
      `${n} saw the mountain and used\n` +
      'their mouse / trackpad to reach and click + hold a surface.',
    (n) =>
      `While holding, ${n} found that\n` +
      `by dragging their mouse/trackpad they could move.`,
    (n) => `${n} started climbing!`,
  ],

  // scripted story markers  (was STORY_MARKERS)
  MARKERS: [
    { y: 192, key: 'M_START' },
    { y: -24, key: 'M_CANT' },
    { y: -512, key: 'M_PUSH' },
    { y: -1024, key: 'M_PEAK' },
  ],
  M: {
    M_START: (n) => `${n} began to get the hang of things…`,
    M_CANT: (n) => `Until there was a place ${n} couldn't reach…`,
    M_PUSH: (n) => `${n} kept climbing.`,
    M_PEAK: (n) =>
      `${n} was growing each time they failed,\n yet the summit still loomed.`,
    END_ONE: (n) => `And after many trials,\n` + `${n} reached for the stars!`,
    END_TWO: (n) => `Even though the climb was difficult...`,
    END_THREE: (n) => `Every fall and every failure`,
    END_FOUR: (n) => `Allowed ${n} to grow\n` + 'and reach even further.',
  },

  // fail-state / power-up blurbs
  TOASTS: {
    ARM_STEP: (n) => `${n} stretched a little further…`,
    FAIL_HINT_1: (n) => `${n} went back up yet again`,
    FAIL_HINT_2: (n) => `${n} wondered if they\n could reach the platform`,
    FAIL_HINT_3: (n) => `${n} envisioned a plan...`,
    FAIL_HINT_4: (n) => `${n} saw they couldn't swing over`,
    FAIL_HINT_5: (n) =>
      `Maybe ${n} could place themselves\n on the other side...`,
    FAIL_HINT_6: (n) => `${n} envisioned a plan...`,
    FAIL_HINT_7: (n) => `This challenge was really tough`,
    FAIL_HINT_8: (n) =>
      `Perhaps there was a better spot\n to grab with their new arm...`,
    FAIL_HINT_9: (n) => `${n} envisioned a plan...`,
    FAIL_HINT_10: (n) => `${n} failed once more\n and tried again!`,
    FAIL_HINT_11: (n) => `This challenge was hard for\n ${n} to *grasp* onto`,
    FAIL_HINT_12: (n) => `${n} envisioned a plan...`,
    ARM_UNLOCK: (n) =>
      `${n} realized they could reach\n` + 'even further than before!',
  },
};

/* ---------- One-time tutorial ------------------------------------ */
const TUT_KEY = 'advTutSeen'; // localStorage flag
const TUTORIAL_STEPS = COPY.TUT;
let tutorial = { active: false, step: 0, alpha: 255, text: '' }; // tutorial state

/* ---------- Story Layer ----------------------------------------- */
let story;
let STORY_MARKERS;
let storySeen = new Set(); // remembers which markers are done

// transient pop-ups (fail-states, upgrades, etc.)
let storyPopup = { txt: '', alpha: 0 }; // alpha==0 → idle

/* game objects */
let player, camera, level;

let playerName = 'The Adventurer'; // default player name

/* level layout variables */
let playW;
let rightGutter;
let cliffG;

/* ---------- webcam globals ---------- */
let cam,
  camReady = false;
let faceSnap = null; // p5.Image of final masked selfie

/* ---------- fail globals ---------- */
let failIndex = 0; // index in FAIL_STATES
let checkpointHit = false; // reached that state's platform?
let fails = 0;
let toastHintIndex = 0;
let totalGameFails = 0;
let hasCountedThisFall = false;

// Fail Tutorials
let failTut1, failTut2, failTut3, failTut4;
let failTutorials = [];

/* ---------- brush globals ---------- */
let brushStart = null; // {x,y} when you press
const BRUSH_W = 64; // standard width
const HIT = 32; // hHit
const ART = 64; // hArt (64)
let brushHalf = 0;
let brushKinds = [];
let brushIndex = 0; // selection index in BRUSH_KINDS
const getBrushKind = () => brushKinds[brushIndex];
let atlas;

/* ---------- Cookie reset helpers ---------------------------------------- */
let btnResetCookies = null; // DOM button handle
const SAVE_KEYS = ['advName', 'advFace', 'advTutSeen']; // add more later

/* --------- Background Image Assets ----------- */
let teraSprites;
let saggiSprites;
let bg;
const WORLD_H = 4000; // however tall your climb is (px)

/* ----------- Music ------------------ */
let bgMusic;
let endMusic;
/* ----------- SFX -------------------- */
let sfx = {
  grassGrabSnd: null,
  stoneGrabSnd: null,
  grassLandSnd: null,
  stoneLandSnd: null,
  armGrowSnd: null,
  armGrowSpecialSnd: null,
};
// let grassGrabSnd, stoneGrabSnd, grassLandSnd, stoneLandSnd;
let volCtrl;

/* --------- Ending Item ---------- */
let itemSprite;
let sparkles = [];

// ── Cutscene state & config ─────────────────────
let endingTriggered = false;
let cutsceneX = 576;
let cutsceneY = -3200; // starting Y of the item
let cutsceneTimer = 0;
let cutsceneStartMs = 0;
let cutsceneM1,
  cutsceneM2,
  cutsceneM3,
  cutsceneM4 = false; // cutscene messages

/* ---------- Title Font ------------ */
let titleFont;

function preload() {
  // Check if in prod or dev mode via localhost
  if (!window.location.hostname.includes('localhost')) {
    console.log('prod');
    atlas = loadImage('assets/tilemap.png');
    bgMusic = loadSound('assets/OverTheClover.m4a');
    endMusic = loadSound('assets/MapleSyrupFactory.mp3');

    // SFX
    sfx.grassGrabSnd = loadSound('assets/sfx/grassLand.ogg');
    sfx.stoneGrabSnd = loadSound('assets/sfx/stonesHit1.ogg');
    sfx.grassLandSnd = loadSound('assets/sfx/grassLand.ogg');
    sfx.stoneLandSnd = loadSound('assets/sfx/stoneHit5.ogg');
    sfx.armGrowSnd = loadSound('assets/sfx/powerUp7.ogg');
    sfx.armGrowSpecialSnd = loadSound('assets/sfx/powerUp9.ogg');

    itemSprite = loadImage('assets/asc-logo.png');
    teraSprites = loadImage('assets/tera.png');
    saggiSprites = loadImage('assets/saggi.png');

    titleFont = loadFont('assets/PressStart2P-Regular.ttf');

    // Fail Tutorial GIFs
    failTut1 = loadImage('assets/fail-tuts/FailState1Tut.gif');
    failTut2 = loadImage('assets/fail-tuts/FailState2Tut.gif');
    failTut3 = loadImage('assets/fail-tuts/FailState3Tut.gif');
    failTut4 = loadImage('assets/fail-tuts/FailState4Tut.gif');
    failTutorials.push(failTut1, failTut2, failTut3, failTut4);
  } else {
    console.log('local');
    atlas = loadImage('assets/tilemap.png');
    bgMusic = loadSound('assets/OverTheClover.m4a');
    endMusic = loadSound('assets/MapleSyrupFactory.mp3');

    // SFX
    sfx.grassGrabSnd = loadSound('assets/sfx/grassLand.ogg');
    sfx.stoneGrabSnd = loadSound('assets/sfx/stonesHit1.ogg');
    sfx.grassLandSnd = loadSound('assets/sfx/grassLand.ogg');
    sfx.stoneLandSnd = loadSound('assets/sfx/stoneHit5.ogg');
    sfx.armGrowSnd = loadSound('assets/sfx/powerUp7.ogg');
    sfx.armGrowSpecialSnd = loadSound('assets/sfx/powerUp9.ogg');

    itemSprite = loadImage('assets/asc-logo.png');
    teraSprites = loadImage('assets/tera.png');
    saggiSprites = loadImage('assets/saggi.png');

    titleFont = loadFont('assets/PressStart2P-Regular.ttf');

    // Fail Tutorial GIFs
    failTut1 = loadImage('assets/fail-tuts/FailState1Tut.gif');
    failTut2 = loadImage('assets/fail-tuts/FailState2Tut.gif');
    failTut3 = loadImage('assets/fail-tuts/FailState3Tut.gif');
    failTut4 = loadImage('assets/fail-tuts/FailState4Tut.gif');
    failTutorials.push(failTut1, failTut2, failTut3, failTut4);
  }
}

/* ---------- p5.js setup ---------- */
function setup() {
  pixelDensity(1); // if you want 1:1 pixels on Hi-DPI
  imageSmoothingEnabled = false; // crisp pixel-art

  let savedName = localStorage.getItem('advName');
  let savedFace = localStorage.getItem('advFace'); // Data URL
  story = new Story(failTutorials); // toast manager
  STORY_MARKERS = COPY.MARKERS; // height-triggered captions

  if (savedName) {
    // player.setFace(loadImage(savedFace));
    playerName = savedName;
    if (savedFace) {
      loadImage(savedFace, (img) => {
        player.setFace(img);
      });
    }
    gameState = STATE_PLAY; // skip intro
  } else {
    gameState = STATE_INTRO; // start with intro
  }

  if (gameState === STATE_PLAY && !localStorage.getItem(TUT_KEY)) {
    tutorial = {
      active: true,
      step: 0,
      alpha: 255,
      text: TUTORIAL_STEPS[0](playerName),
    };
  }

  /* ---------- slice everything declared in TILES ---------- */
  Object.values(TILES).forEach((def) => {
    if (def.method === 'caps') {
      def.capImg = atlas.get(def.cap.x, def.cap.y, def.cap.w, def.cap.h);
      def.midImg = atlas.get(def.mid.x, def.mid.y, def.mid.w, def.mid.h);
    } else if (def.method === 'repeat' || def.method === 'tileY') {
      // repeat or tileY
      def.tileImg = atlas.get(def.tile.x, def.tile.y, def.tile.w, def.tile.h);
    } else if (def.method === 'single') {
      def.tileImg = atlas.get(def.tile.x, def.tile.y, def.tile.w, def.tile.h);
      // --------------------------------------------------
      // 1️⃣ 90-degree rotation (if rot90 flag present)
      // --------------------------------------------------
      if (def.rot90) {
        const w = def.tileImg.height;
        const h = def.tileImg.width;
        const g = createGraphics(w, h);
        g.noSmooth();
        g.push();
        g.translate(w, 0); // rotate by +90°
        g.rotate(HALF_PI);
        g.image(def.tileImg, 0, 0);
        g.pop();
        def.tileImg = g;
      }
      // --------------------------------------------------
      // 2️⃣ optional X or Y flip
      // --------------------------------------------------
      if (def.flipX || def.flipY) {
        const w = def.tileImg.width;
        const h = def.tileImg.height;
        const g = createGraphics(w, h);
        g.noSmooth();
        g.push();
        g.translate(def.flipX ? w : 0, def.flipY ? h : 0);
        g.scale(def.flipX ? -1 : 1, def.flipY ? -1 : 1);
        g.image(def.tileImg, 0, 0);
        g.pop();
        def.tileImg = g;
      }
    } else if (def.method === 'cliff') {
      // cliff
      def.stoneImg = atlas.get(
        def.stone.x,
        def.stone.y,
        def.stone.w,
        def.stone.h
      );
      def.taperImg = atlas.get(
        def.taper.x,
        def.taper.y,
        def.taper.w,
        def.taper.h
      );
    }
  });

  // Place tiles into brushKinds array
  brushKinds = Object.keys(TILES);

  createCanvas(windowWidth, windowHeight);

  /* ----- intro buttons ---------------------------------------- */
  if (gameState === STATE_INTRO) {
    ui.introYes = createButton('Add my face 😊');
    ui.introSkip = createButton('Skip for now');

    styleBtn(ui.introYes, 0);
    styleBtn(ui.introSkip, 1); // helper for CSS ↓↓↓

    ui.introYes.mousePressed(() => {
      ui.introYes.hide();
      ui.introSkip.hide();
      startWebcam();
    });

    ui.introSkip.mousePressed(() => {
      ui.introYes.remove();
      ui.introSkip.remove();
      gotoNameScreen(); // skip to name screen
      // gameState = STATE_PLAY; // straight into the game
    });
  }

  update(); // // updates scale (s) & letterbox offset
  calcLayout(); // sets playW & gutter

  bg = new Background(WORLD_H, WORLD.w, teraSprites, saggiSprites);

  cliffG = buildCliffStone(
    CLIFF_W, // width of the right-side wall
    TILES.cliffStone.stoneImg,
    TILES.cliffStone.taperImg,
    TILES.cliffStone.scale
  );

  level = new Level(
    playW,
    TILES // pass the tile definitions
  );
  buildInitialPlatforms();

  player = new Player(
    level,
    () => camera.camY,
    () => rightGutter,
    volCtrl,
    sfx
  );
  player.reset(playW * 0.15, GROUND_Y - player.r);

  camera = new Camera(player);

  // Speaker icon 16px from top right gutter
  const iconX = width - 32 - 32;
  const iconY = 16;

  volCtrl = new VolumeControl(iconX, iconY, [
    bgMusic,
    endMusic,
    sfx.grassGrabSnd,
    sfx.stoneGrabSnd,
    sfx.grassLandSnd,
    sfx.stoneLandSnd,
    sfx.armGrowSnd,
    sfx.armGrowSpecialSnd,
  ]);

  // console.log(sfx);

  volCtrl.setVolume(0.5); // default volume

  // ── Full-screen toggle ──────────────────────────────
  fsBtn = createButton(FS_ICON);
  fsBtn.size(FS_BTN_SIZE, FS_BTN_SIZE);
  fsBtn.style('background', 'transparent');
  fsBtn.style('border', 'none');
  fsBtn.style('font-size', '24px');
  fsBtn.style('cursor', 'pointer');
  fsBtn.style('color', '#fff');
  // bottom-right (16px margin)
  fsBtn.position(width - 16 - FS_BTN_SIZE, height - 16 - FS_BTN_SIZE);
  fsBtn.style('position', 'absolute');
  fsBtn.style('z-index', '1000'); // on top of everything

  // custom tooltip div (hidden by default)
  fsTooltip = createDiv('Full Screen').elt;
  Object.assign(fsTooltip.style, {
    position: 'absolute',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    pointerEvents: 'none',
    visibility: 'hidden',
  });
  document.body.appendChild(fsTooltip);

  // wire up click + hover
  // fsBtn.mousePressed(toggleFullscreen);
  fsBtn.elt.addEventListener('mouseover', () => {
    const label = document.fullscreenElement
      ? 'Exit Full Screen'
      : 'Full Screen';
    fsTooltip.textContent = label;
    const btnR = fsBtn.elt.getBoundingClientRect();
    // force layout so we can read its height
    fsTooltip.style.visibility = 'hidden';
    fsTooltip.style.display = 'block';
    const ttH = fsTooltip.getBoundingClientRect().height;
    fsTooltip.style.left = `${btnR.left}px`;
    fsTooltip.style.top = `${btnR.top - ttH - 4}px`;
    fsTooltip.style.display = '';
    fsTooltip.style.visibility = 'visible';
  });
  fsBtn.elt.addEventListener('mouseout', () => {
    fsTooltip.style.visibility = 'hidden';
  });

  // keep icon in sync if user presses ESC or exits with browser controls
  document.addEventListener('fullscreenchange', () => {
    updateFullscreenButton();
    // if tooltip showing, update its text too
    if (fsTooltip.style.visibility === 'visible') {
      fsTooltip.textContent = document.fullscreenElement
        ? 'Exit Full Screen'
        : 'Full Screen';
    }
  });
}

function draw() {
  if (gameState === STATE_INTRO) {
    background('#130022');

    const titleSize = Math.min(width, height) * 0.08;
    const titleFloat = Math.sin(frameCount * 0.05) * 8;
    push();
    textFont('monospace'); // or load a pixel font in preload
    textAlign(CENTER, CENTER);
    textFont(titleFont);
    textSize(titleSize);
    // outline
    // stroke('#FFD700');
    strokeWeight(8);
    // fill
    fill('#FFFFFF');

    text('A Game About\n' + 'Failing', width / 2, height * 0.25 + titleFloat);
    pop();

    // 3) draw your two intro buttons underneath
    return; // skip all the other states
  }

  if (gameState === STATE_CAM && camReady) {
    background('#130022');
    // center the live video feed with a faint circle “face window”
    imageMode(CORNER);
    image(cam, width / 2 - cam.width / 2, height / 2 - cam.height / 2);

    noFill();
    stroke(255);
    strokeWeight(2);
    circle(width / 2, height / 2, 128); // guide ring
    return; // skip game draw
  }

  if (gameState === STATE_REVIEW) {
    if (faceSnap) {
      background('#130022');
      imageMode(CENTER);
      image(faceSnap, width / 2, height / 2);
    }
    return; // skip gameplay
  }

  if (gameState === STATE_NAME) {
    background('#130022');
    imageMode(CENTER);
    if (!faceSnap) {
      // background('#130022');
      fill(100, 150, 255);
      circle(width / 2, height / 2, 128);
    } else {
      image(faceSnap, width / 2, height / 2);
    }
    return;
  }

  if (gameState === STATE_PLAY) {
    imageMode(CORNER); // reset image mode
    background(220);
    debugPreUpdate(player);

    begin(); // scale and center

    if (!endingTriggered || cutsceneTimer < 28) {
      camera.update();
    }

    const SKY_START_Y = 700;
    if (camera.camY < SKY_START_Y) {
      bg.draw(0, camera.camY);
    }

    camera.begin(); // follow-y

    // find first tile that sits just above view
    const firstY =
      floor((camera.camY - WORLD.h) / cliffG.height) * cliffG.height;

    if (!endingTriggered) {
      const dx = player.pos.x - 576;
      const dy = player.pos.y - cutsceneY; /* = -3200 */
      const distance = Math.hypot(dx, dy);
      if (distance < player.r + 32) {
        triggerEnding();
      }
    }

    drawEndingItem();

    for (let y = firstY; y < camera.camY + WORLD.h; y += cliffG.height) {
      if (y + cliffG.height > -3136) {
        image(cliffG, WORLD.w - rightGutter, y);
      }
    }

    if (Debug.active && Debug.showGrid) drawGrid(camera);
    if (Debug.active && Debug.world.bounds) drawWorldBounds();
    if (Debug.active && Debug.world.lanes) drawLaneBounds(playW);
    if (Debug.active && Debug.showBoxes) drawHitboxes(level);

    /* ---------- brush preview ---------- */
    if (Debug.brush) {
      const v = screenToWorld(mouseX, mouseY);
      const k = getBrushKind();
      const w = naturalWidth(k);
      const strip = level.getStrip(k, w);
      const ghost = { x: v.x, y: v.y + camera.camY };
      // snap to grid
      ghost.x = Math.round(ghost.x / Debug.snap) * Debug.snap;
      ghost.y = Math.round(ghost.y / Debug.snap) * Debug.snap;

      if (brushHalf && strip.height < GRID_UNIT)
        ghost.y += GRID_UNIT - strip.height;
      // sprite for the current brush kind
      function naturalWidth(kind) {
        const t = TILES[kind];
        if (!t) return 0;

        if (t.method === 'single') {
          const baseW = t.rot90 ? t.tile.h : t.tile.w;
          return baseW * (t.scale ?? 4);
        }
        return BRUSH_W;
      }
      // const strip = level.getStrip(getBrushKind(), BRUSH_W);

      if (TILES[k].align === 'right') ghost.x += GRID_UNIT - strip.width;

      push();
      tint(255, 160); // 60 % alpha so it looks ghosty
      image(strip, ghost.x, ghost.y);
      pop();
    }

    level.draw();
    player.update(endingTriggered);

    updateTutorial(); // update tutorial state
    updateStory(); // update story markers

    const hasTargetLen = (fs) => player.maxLen >= fs.targetLen - 0.01;

    /* ---------- Fail-State progression ---------- */
    if (failIndex < FAIL_STATES.length) {
      const fs = FAIL_STATES[failIndex];

      // 1. wait until Player stands on / below the checkpoint line
      if (!checkpointHit && player.pos.y <= fs.checkpointY) {
        checkpointHit = true;
      }

      if (!checkpointHit) {
        hasCountedThisFall = false;
      } else if (player.pos.y >= fs.bottomBoundY) {
        if (!hasCountedThisFall && !player.latched) {
          console.log('Story Tutorials', story.failTutorials);
          console.log('Counted Fall?', hasCountedThisFall);
          fails++;
          console.log('Fails:', fails);
          console.log('Has Target Length?', hasTargetLen(fs));
          const newLen = Math.min(player.maxLen + fs.stepLen, fs.targetLen);
          if (newLen > player.maxLen && !player.latched) {
            player.gainReach(newLen - player.maxLen);
            sfx.armGrowSnd.play();

            story.queue(COPY.TOASTS[fs.toastStep](playerName));
            checkpointHit = false; // reset for next fail-state
          }
          // Done? lock-in full long-arm, advance to next fail-state
          if (newLen >= fs.targetLen) {
            if (!hasTargetLen(fs)) {
              player.unlockLongArm(fs.targetLen);
              sfx.armGrowSnd.play();

              story.queue(COPY.TOASTS[fs.toastUnlock](playerName));
            }

            checkpointHit = false; // reset for next fail-state
            if (fails >= 6 && fails <= 7) {
              story.queue(
                COPY.TOASTS[fs.toastHints[toastHintIndex]](playerName)
              );
              toastHintIndex++;
            } else if (fails === 8) {
              story.queue(
                COPY.TOASTS[fs.toastHints[toastHintIndex]](playerName)
              );
              story.showGuide(failIndex);
              toastHintIndex++;
            }
          }
          hasCountedThisFall = true;
        }
      } else if (player.pos.y <= fs.topBoundY) {
        // If player finds a way to climb above the checkpoint without long-arm
        if (player.maxLen !== fs.targetLen) {
          player.unlockLongArm(fs.targetLen);
          sfx.armGrowSpecialSnd.play();
          story.queue(COPY.TOASTS[fs.toastUnlock](playerName));
        }
        failIndex++;
        checkpointHit = false; // reset for next fail-state
        totalGameFails += fails;
        fails = 0;
        toastHintIndex = 0;
      }
    }

    /* ---------- UI toast ---------- */
    story.draw(player, endingTriggered);

    player.draw();

    drawTutorial(); // show tutorial text
    drawStory(); // show story popups

    camera.end();
    end(); // pop

    drawArmLenHUD(player, camera); // show arm length HUD

    const worldRightScreenX = WORLD.w * scaleFactor;
    if (width > worldRightScreenX) {
      noStroke();
      fill('#130022'); // same dark purple
      rect(worldRightScreenX, 0, width - worldRightScreenX, height);
    }
    debugOverlay(); // show / hide the Reset-Cookies button

    if (!bgMusic.isPlaying() && !endingTriggered) {
      bgMusic.setVolume(volCtrl.volume);
      bgMusic.loop(); // loop background music
    }
    volCtrl.draw();

    if (endingTriggered) {
      if (!endMusic.isPlaying()) {
        // endMusic.setVolume(volCtrl.volume);
        endMusic.play();
        endMusic.jump(40);
      }
      // computing elapsed time in seconds
      cutsceneTimer = (millis() - cutsceneStartMs) / 1000;

      if (cutsceneTimer < 2) {
        cutsceneY += (5 * deltaTime) / 1000;
      } else if (cutsceneTimer < 3) {
        cutsceneY -= (10 * deltaTime) / 1000;
      } else if (cutsceneTimer < 5) {
        // Move player to the center of the screen by the end of this cutsceneTimer check
        let tNorm = (cutsceneTimer - 3) / 2;
        tNorm = constrain(tNorm, 0, 1); // clamp to [0, 1]
        cutsceneX = lerp(576, WORLD.w / 2, tNorm);
        const bob = Math.sin(frameCount * 0.05) * 1.5;
        cutsceneY += bob;
      } else if (cutsceneTimer < 7) {
        cutsceneY += (5 * deltaTime) / 1000;
      } else if (cutsceneTimer < 28) {
        cutsceneY -= 5;
        if (cutsceneTimer >= 7 && !cutsceneM1) {
          story.queue(COPY.M.END_ONE(playerName));
          cutsceneM1 = true;
        }
        if (cutsceneTimer >= 12 && !cutsceneM2) {
          story.queue(COPY.M.END_TWO(playerName));
          cutsceneM2 = true;
        }
        if (cutsceneTimer >= 17 && !cutsceneM3) {
          story.queue(COPY.M.END_THREE(playerName));
          cutsceneM3 = true;
        }
        if (cutsceneTimer >= 22 && !cutsceneM4) {
          story.queue(COPY.M.END_FOUR(playerName));
          cutsceneM4 = true;
        }
      } else {
        const t = cutsceneTimer - 31;
        cutsceneY -= 20;
        if (t > 0) {
          const alpha = constrain((t / 2) * 255, 0, 255);
          push();
          fill(0, alpha);
          noStroke();
          rect(0, 0, width, height);
          pop();

          if (alpha === 255) {
            let titleAlpha = constrain(((t - 2) / 2) * 255, 0, 255);
            // draw title
            if (titleAlpha > 0) {
              push();
              textAlign(CENTER, CENTER);
              textSize(48);
              fill(255, titleAlpha);
              text('A Game About Failing', width / 2, height / 2 - 150);
              pop();
            }
            if (cutsceneTimer >= 35) {
              let totalFailsAlpha = constrain(((t - 2) / 2) * 255, 0, 255);
              if (totalFailsAlpha > 0) {
                push();
                textAlign(CENTER, CENTER);
                textSize(20);
                fill(255, totalFailsAlpha);
                text(
                  `You made it to the top after ${totalGameFails} fails!\n Woohoo!!`,
                  width / 2,
                  height / 2 - 60
                );
                pop();
              }
            }

            if (cutsceneTimer >= 39) {
              if (!window.playAgainBtn) {
                window.playAgainBtn = p.createButton('Play Again?');
                window.playAgainBtn.position(
                  p.width / 2 - 60,
                  p.height / 2 + 20
                );
                window.playAgainBtn.size(120, 32);
                window.playAgainBtn.style('font-family', 'monospace');
                window.playAgainBtn.mousePressed(() => {
                  endMusic.stop(); // stop the music
                  // remove overlay
                  window.playAgainBtn.remove();
                  window.playAgainBtn = null;
                  // reset state
                  resetGame(); // defined lower in sketch.js
                  endingTriggered = null; // allow replay
                  cutsceneX = 576;
                  cutsceneY = -3200; // reset cutscene position
                  cutsceneTimer = 0; // reset timer
                  tutorial.active = false; // skip tutorial
                  // re-center camera, reset arm
                  camera.reset();
                });
              }
            }
          }
        }
      }
      // console.log(cutsceneTimer);
      player.pos.set(cutsceneX, cutsceneY);
      // console.log(cutsceneTimer);
    }
  }
}

/* ---------- Debug UI overlay ------------------------------------ */
function debugOverlay() {
  if (Debug.active) {
    // create once
    if (!btnResetCookies) {
      btnResetCookies = createButton('⚠︎ Reset Cookies');
      btnResetCookies.position(12, 10); // fixed-pixel HUD position
      btnResetCookies.style('font-family', 'monospace');
      btnResetCookies.mousePressed(() => {
        SAVE_KEYS.forEach((k) => localStorage.removeItem(k));
        console.log('Local storage cleared — reloading…');
        window.location.reload(); // hard reset
      });
    }
  } else if (btnResetCookies) {
    // tidy up when Debug toggles off
    btnResetCookies.remove();
    btnResetCookies = null;
  }
}

/* ---------- input/handlers ---------- */
function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
  const v = screenToWorld(mouseX, mouseY);
  if (Debug.brush) {
    // screen → world
    const world = { x: v.x, y: v.y + camera.camY };
    // snap to grid
    world.x = Math.round(world.x / Debug.snap) * Debug.snap;
    world.y = Math.round(world.y / Debug.snap) * Debug.snap;
    brushStart = world;
    return;
  }
  if (v.x < playW + 100 && !endingTriggered) {
    player.tryLatch();
    return;
  }
  userStartAudio();
  volCtrl.mousePressed(mouseX, mouseY); // check volume control
  fsBtn.mousePressed(toggleFullscreen);
}

function mouseDragged() {
  volCtrl.mouseDragged(mouseX, mouseY); // check volume control
}

function mouseReleased() {
  if (Debug.brush && brushStart) {
    const laneX = brushStart.x; // convert to lane coord
    let yTop = brushStart.y;
    const kind = getBrushKind();
    const spec = TILES[kind] ?? {};

    let wPix;
    if (spec.method === 'single') {
      const baseW = spec.rot90 ? spec.tile.h : spec.tile.w;
      wPix = baseW * (spec.scale ?? 4);
    } else {
      wPix = BRUSH_W;
    }
    // const wPix =
    //   spec.method === 'single' ? baseW * (spec.scale ?? 4) : BRUSH_W;
    const hit = 'hit' in spec ? spec.hit : HIT; // If hit is 0 it's not latchable

    let hArt = 64;
    if ('art' in spec) hArt = spec.art;
    else if (spec.tile) hArt = spec.tile.h * (spec.scale ?? 4);
    if (brushHalf && hArt < GRID_UNIT) yTop += GRID_UNIT - hArt;
    level.addPlatform(laneX, yTop, wPix, hit, ART, false, kind);
    const code = `level.addPlatform(${laneX}, ${yTop}, ${wPix}, ${hit}, ${hArt}, false, '${kind}');`;
    console.log(code); // ← copy-paste this

    brushStart = null;
    return;
  }
  volCtrl.mouseReleased();
  if (endingTriggered) return;

  player.release();
}

/* ---------- window resize ---------- */

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  update(); // update viewport
  calcLayout();
  if (gameState === STATE_PLAY) {
    bg = new Background(WORLD_H, WORLD.w, teraSprites, saggiSprites); // rebuild to new width
    level.playW = playW; // update spacing helper
  }

  volCtrl.x = width - 16 - volCtrl.size;
  volCtrl.y = 16;

  repositionUI(); // reposition UI elements

  fsBtn.position(width - 16 - FS_BTN_SIZE, height - 16 - FS_BTN_SIZE);
}

function repositionUI() {
  switch (gameState) {
    case STATE_INTRO:
      if (ui.introYes) styleBtn(ui.introYes, 0);
      if (ui.introSkip) styleBtn(ui.introSkip, 1);
      break;
    case STATE_CAM:
      if (ui.camCapture) styleBtn(ui.camCapture, 4);
      break;
    case STATE_REVIEW:
      if (ui.reviewTxt) ui.reviewTxt.position(width / 2 - 90, height / 2 - 150);
      if (ui.reviewYes) styleBtn(ui.reviewYes, 3);
      if (ui.reviewRetry) styleBtn(ui.reviewRetry, 4);
      break;
    case STATE_NAME:
      if (ui.namePrompt)
        ui.namePrompt.position(width / 2 - 120, height / 2 - 150);
      if (ui.nameInput) ui.nameInput.position(width / 2 - 84, height / 2 + 150);
      if (ui.nameStart) ui.nameStart.position(width / 2 - 45, height / 2 + 200);
      break;
  }
}

/* ---------- helper functions ---------- */

function calcLayout() {
  // playW = WORLD.w - CLIFF_W; // play area width
  rightGutter = CLIFF_W; // right side wall
  // rightGutter = Math.round(CLIFF_W / s / GRID_UNIT) * GRID_UNIT; // right side wall
  playW = WORLD.w - rightGutter; // play area width
}

function buildInitialPlatforms() {
  level.addPlatform(0, GROUND_Y, playW, 100, level.tileH, true, 'grass16'); // the ground
  level.addPlatform(
    0,
    GROUND_Y, // one strip below grass
    playW,
    0, // hHit 0 → never collides
    4096, // absurd height; we’ll cut it off-screen
    false,
    'groundFill'
  );

  level.addPlatform(512, 256, 64, 32, 32, false, 'tinyGrass');
  level.addPlatform(448, 128, 64, 32, 64, false, 'tinyGrass');
  level.addPlatform(448, 0, 64, 32, 64, false, 'tinyGrass');
  level.addPlatform(256, -128, 64, 32, 32, false, 'tinyGrass');
  level.addPlatform(448, -192, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(576, -320, 64, 32, 32, false, 'tinyGrass');
  level.addPlatform(384, -448, 64, 32, 32, false, 'tinyGrass');
  level.addPlatform(320, -448, 64, 32, 32, false, 'tinyGrass');
  level.addPlatform(192, -576, 64, 32, 64, false, 'tinyGrass');
  level.addPlatform(128, -768, 64, 32, 32, false, 'tinyGrass');

  // Stone Wall with grass patches 1
  level.addPlatform(320, -960, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -1024, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -1088, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -1152, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -896, 32, 16, 16, false, 'grassySurfaceT');
  level.addPlatform(320, -896, 32, 16, 16, false, 'grassySurfaceTR');
  level.addPlatform(576, -768, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(576, -832, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(576, -800, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(512, -1024, 64, 32, 32, false, 'tinyGrass');
  level.addPlatform(384, -1152, 16, 32, 32, false, 'grassySurfaceL');

  // Fail-State #3
  level.addPlatform(320, -1344, 32, 16, 16, false, 'grassySurfaceT');
  level.addPlatform(320, -1344, 32, 16, 16, false, 'grassySurfaceTR');
  // level.addPlatform(320, -1408, 32, 16, 16, false, 'grassySurfaceTR');
  // level.addPlatform(320, -1408, 32, 16, 16, false, 'grassySurfaceT');
  level.addPlatform(576, -1408, 64, 32, 32, false, 'tinyGrass');
  // level.addPlatform(320, -1472, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -1408, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -1472, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -1536, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -1536, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(64, -1600, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(128, -1600, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -1600, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(256, -1600, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(320, -1600, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -1600, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(448, -1568, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(448, -1600, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(64, -1616, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(64, -1616, 32, 16, 16, false, 'grassySurfaceBR');

  level.addPlatform(448, -1728, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(448, -1696, 16, 32, 32, false, 'grassySurfaceL');

  level.addPlatform(384, -1728, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -1792, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -1856, 64, 64, 64, false, 'stoneBlock');

  level.addPlatform(384, -2048, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2112, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2176, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2240, 64, 64, 64, false, 'stoneBlock');

  level.addPlatform(384, -1984, 32, 16, 16, false, 'grassySurfaceT');

  level.addPlatform(384, -1984, 32, 16, 16, false, 'grassySurfaceTR');
  level.addPlatform(320, -1728, 16, 32, 32, false, 'grassySurfaceR');

  level.addPlatform(320, -1696, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(576, -2112, 16, 32, 32, false, 'grassySurfaceR');

  level.addPlatform(256, -2432, 64, 32, 32, false, 'tinyGrass');
  level.addPlatform(320, -2432, 64, 32, 32, false, 'tinyGrass');

  level.addPlatform(192, -2624, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2624, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2688, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -2688, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -2752, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2752, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -2816, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2816, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -2880, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2880, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -2944, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -2944, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(256, -2592, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2944, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2880, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2816, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2752, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2688, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2624, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2656, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2720, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2784, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2848, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2912, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(320, -2592, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2656, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2720, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2784, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2848, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2912, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2624, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2688, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2752, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2816, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2880, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2944, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(192, -3008, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -3072, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -3008, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -3072, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(192, -3136, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(384, -3136, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(448, -3136, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(512, -3136, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(576, -3136, 64, 64, 64, false, 'stoneBlock');
  level.addPlatform(256, -3136, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -3072, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -3008, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -3104, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -3040, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(256, -2976, 16, 32, 32, false, 'grassySurfaceL');
  level.addPlatform(320, -3104, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -3040, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -2976, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -3136, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -3072, 16, 32, 32, false, 'grassySurfaceR');
  level.addPlatform(320, -3008, 16, 32, 32, false, 'grassySurfaceR');

  level.addPlatform(192, -3152, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(192, -3152, 32, 16, 16, false, 'grassySurfaceBR');
  level.addPlatform(384, -3152, 32, 16, 16, false, 'grassySurfaceBR');
  level.addPlatform(448, -3152, 32, 16, 16, false, 'grassySurfaceBR');
  level.addPlatform(512, -3152, 32, 16, 16, false, 'grassySurfaceBR');
  level.addPlatform(576, -3152, 32, 16, 16, false, 'grassySurfaceBR');
  level.addPlatform(640, -3152, 32, 16, 16, false, 'grassySurfaceBR');
  level.addPlatform(704, -3152, 32, 16, 16, false, 'grassySurfaceBR');
  level.addPlatform(384, -3152, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(448, -3152, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(512, -3152, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(576, -3152, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(640, -3152, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(704, -3152, 32, 16, 16, false, 'grassySurfaceB');
  level.addPlatform(768, -3152, 32, 16, 16, false, 'grassySurfaceB');
}

function resetGame() {
  camera.reset();
  player.reset(playW * 0.15, level.platforms[0].y - player.r);
}

/* ---------- Webcam Screen ---------- */
function startWebcam() {
  background('#130022');
  gameState = STATE_CAM;

  if (!cam) {
    cam = createCapture(VIDEO, { flipped: true }, () => {
      camReady = true;
    });
  } else {
    cam.play();
    // camReady = true; // webcam already open
  }

  cam.hide();

  // capture button
  ui.camCapture = createButton('Capture');
  styleBtn(ui.camCapture, 4);
  ui.camCapture.mousePressed(() => {
    grabFace();

    cam.stop(); // stop stream
    // cam = null;
    ui.camCapture.remove();
    showReviewScreen();
  });
}

function grabFace() {
  const srcSide = 128;
  const sx = (cam.width - srcSide) / 2; // top-left corner of crop
  const sy = (cam.height - srcSide) / 2;

  /* 1 ▸ copy the centred square region of the live feed */
  const square = cam.get(sx, sy, srcSide, srcSide); // p5.Image

  /* 3 ▸ apply a circular mask so corners become transparent */
  const mask = createGraphics(srcSide, srcSide);
  mask.noStroke();
  mask.fill(255);
  mask.circle(srcSide / 2, srcSide / 2, srcSide);

  square.mask(mask); // punch the circle

  /* 4 ▸ hand it to the player */
  faceSnap = square; // put the image in global scope
}

/* ---  Review Screen --- */

function showReviewScreen() {
  gameState = STATE_REVIEW;

  ui.reviewTxt = createDiv('Does this look good?');
  ui.reviewYes = createButton('Yes!');
  ui.reviewRetry = createButton('Retake it!');

  ui.reviewTxt
    .style('font-family', 'monospace', 'white')
    .style('color', 'white')
    .position(width / 2 - 90, height / 2 - 150);
  styleBtn(ui.reviewYes, 3);
  styleBtn(ui.reviewRetry, 4);

  ui.reviewYes.mousePressed(() => {
    ui.reviewYes.remove();
    ui.reviewRetry.remove();
    ui.reviewTxt.remove();
    player.setFace(faceSnap);
    if (faceSnap) {
      // const dataURL = faceSnap.canvas.toDataURL('image/png');
      // localStorage.setItem('advFace', dataURL);
    }
    cam.remove(); // stop webcam
    gotoNameScreen();
  });

  ui.reviewRetry.mousePressed(() => {
    faceSnap = null;
    camReady = false;
    cam.remove(); // stop webcam
    cam = null;
    ui.reviewYes.remove();
    ui.reviewRetry.remove();
    ui.reviewTxt.remove();
    startWebcam(); // reopen live preview
  });
}

/* ---  Name Screen --- */
function gotoNameScreen() {
  gameState = STATE_NAME;

  ui.namePrompt = createDiv('Adventurer, what is your name?');
  ui.nameInput = createInput('');
  ui.nameStart = createButton("Let's begin!");

  ui.namePrompt
    .style('font-family', 'monospace')
    .style('color', 'white')
    .style('width', '240px')
    .position(width / 2 - 120, height / 2 - 150);
  ui.nameInput.position(width / 2 - 84, height / 2 + 150).size(160, 32);
  ui.nameStart.position(width / 2 - 45, height / 2 + 200).size(90, 32);

  ui.nameStart.mousePressed(() => {
    const name = ui.nameInput.value().trim() || 'The Adventurer';
    playerName = name;
    // localStorage.setItem('advName', name);
    ui.namePrompt.remove();
    ui.nameInput.remove();
    ui.nameStart.remove();
    imageMode(CORNER); // reset image mode

    /* ---------- Tutorial start ---------- */
    const seenTut = localStorage.getItem(TUT_KEY);
    if (!seenTut) {
      tutorial.active = true; // start the tutorial
      tutorial.step = 0;
      tutorial.text = TUTORIAL_STEPS[tutorial.step](playerName);
      tutorial.alpha = 255; // fade in
    }

    /* ---------- start the game! ---------- */
    gameState = STATE_PLAY;
  });
}

/* simple inline styling */
function styleBtn(b, row = 0) {
  const x = width / 2 - 80;
  const y = height / 2 + row * 40; // 40 px
  b.position(x, y);
  b.size(160, 32);
  b.style('font-family', 'monospace');
}

/* ---------- tutorial functions ---------- */
function updateTutorial() {
  if (!tutorial.active) return;

  // STEP-0 ▸ wait for the first successful latch
  if (tutorial.step === 0 && player.latched) {
    tutorial.step = 1;
    tutorial.text = TUTORIAL_STEPS[1](playerName);
    tutorial.alpha = 255;
  }
  // STEP-1 ▸ wait for the first release
  else if (tutorial.step === 1 && !player.latched && !mouseIsPressed) {
    tutorial.step = 2;
    tutorial.text = TUTORIAL_STEPS[2](playerName);
    tutorial.alpha = 255;
  }
  // STEP-2 ▸ fade out, then finish
  else if (tutorial.step === 2) {
    tutorial.alpha -= 1; // fade-out
    if (tutorial.alpha <= 0) {
      tutorial.active = false;
      // localStorage.setItem(TUT_KEY, '1'); // never show again
    }
  }
}

function drawTutorial() {
  if (!tutorial.active) return;
  push();
  textAlign(CENTER, TOP);
  textFont('monospace');
  textSize(18);
  fill(255, tutorial.alpha);
  stroke(0, tutorial.alpha);
  strokeWeight(4);
  // keep it near the player so it scrolls with the camera
  text(tutorial.text, WORLD.w / 2, player.pos.y - player.r - 60);
  pop();
}

/* ---------- story functions ---------- */
function updateStory() {
  // skip story if tutorial already seen
  // if (!localStorage.getItem(TUT_KEY)) return;

  // HEIGHT-TRIGGERED CAPTIONS ──────────────────────────────────
  for (const m of STORY_MARKERS) {
    if (!storySeen.has(m) && player.pos.y <= m.y) {
      story.queue(COPY.M[m.key](playerName)); // one-shot toast
      storySeen.add(m);
      break; // one at a time
    }
  }

  // FADE-OUT for the active popup
  if (storyPopup.alpha > 0) {
    storyPopup.alpha -= 1; // ≈ 85 frames →  ~1.4 s
  }
}

function drawStory() {
  if (storyPopup.alpha <= 0) return;

  const txtOffset = player.r + 40; // a bit under the player
  push();
  textAlign(CENTER, TOP);
  textFont('monospace');
  textSize(18);
  fill(255, storyPopup.alpha);
  stroke(0, storyPopup.alpha);
  strokeWeight(4);
  text(
    storyPopup.txt,
    width / 3, // roughly lane-centre
    player.pos.y + txtOffset
  ); // world coords → scrolls w/ cam
  pop();
}

/* ---------- Ending Item Helper ---------- */
function drawEndingItem() {
  // bob up/down
  const floatAmt = endingTriggered ? 0 : Math.sin(frameCount * 0.05) * 8;

  push();
  imageMode(CENTER);
  translate(
    endingTriggered ? cutsceneX : 576,
    (endingTriggered ? cutsceneY : -3200) + floatAmt
  );
  image(itemSprite, 0, 0, 64, 64);

  // spawn a sparkle every few frames
  if (frameCount % 6 === 0) {
    sparkles.push({
      x: random(-16, 16),
      y: random(-16, 16),
      life: 30,
    });
  }

  // draw & age sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life--;
    const alpha = map(s.life, 0, 30, 0, 255);
    const size = map(s.life, 0, 30, 0, 4);
    noStroke();
    fill(255, 255, 200, alpha);
    ellipse(s.x, s.y, size);
    if (s.life <= 0) sparkles.splice(i, 1);
  }
  pop();
}

// window.p = p;

/*------------ Viewport Stuff ----------*/

function update() {
  scaleFactor = Math.min(windowWidth / WORLD.w, windowHeight / WORLD.h);
  letterBoxOffset.x = 0; // world units
  letterBoxOffset.y = (windowHeight / scaleFactor - WORLD.h) * 0.5;
}

function begin() {
  push();
  scale(scaleFactor);
  translate(letterBoxOffset.x, letterBoxOffset.y);
}

function end() {
  pop();
}

/* helper for mouse/touch → world coords (ignores Camera) */
function screenToWorld(px, py) {
  return {
    x: px / scaleFactor - letterBoxOffset.x,
    y: py / scaleFactor - letterBoxOffset.y,
  };
}

/* ---------- debug stuff ---------- */
keyPressed = (e) => {
  if (keyCode === ESCAPE) resetGame();
  handleDebugKeyPress(e, player, fails);
  // --- cycle brush kinds with [ and ] ---------------------------------
  if (Debug.active && Debug.brush && brushKinds.length) {
    if (e.key === ']') {
      brushIndex = (brushIndex + 1) % brushKinds.length; // next kind
      console.log('Brush →', getBrushKind());
    } else if (e.key === '[') {
      brushIndex = (brushIndex - 1 + brushKinds.length) % brushKinds.length; // prev kind
      console.log('Brush ←', getBrushKind());
    }
    if (e.key === 'v') {
      brushHalf ^= 1;
      console.log('Brush half:', brushHalf ? 'BOTTOM' : 'TOP');
    }
    if (e.key === 'x') {
      // NEW ⇆ toggle
      const cur = getBrushKind();
      const other = cur.endsWith('R') ? cur.slice(0, -1) : cur + 'R';
      const idx = brushKinds.indexOf(other);
      if (idx !== -1) {
        brushIndex = idx; // swap brush
        console.log('Brush side →', other);
      }
    }
  }
};
function triggerEnding() {
  endingTriggered = true;
  cutsceneStartMs = millis();
  cutsceneTimer = 0;
  bgMusic.stop(); // halt the soundtrack
  player.release(); // drop any latch & disable arm
}

function handleDebugKeyPress(e, player, fails) {
  switch (e.key) {
    case '`': // back‑tick toggles master flag
      Debug.active = !Debug.active;
      break;

    // The remaining shortcuts only work when Debug is on
    case 'g':
    case 'G':
      if (Debug.active) toggleGrid();
      break;
    case 'f':
    case 'F':
      if (Debug.active) Debug.freeMove = !Debug.freeMove;
      break;
    case 'b':
      if (Debug.active) Debug.brush = !Debug.brush;
      break;
    case 'l':
    case 'L':
      if (Debug.active) {
        if (Debug.active) Debug.longArm = !Debug.longArm;
        player.setMaxRopeLength(Debug.longArm ? 240 : MAX_LEN);
        console.log('Long arm:', Debug.longArm ? 'ON (240)' : 'OFF (170)');
      }
      break;
    case 'h':
    case 'H':
      if (Debug.active) Debug.showBoxes = !Debug.showBoxes;
      console.log('Show boxes:', Debug.showBoxes ? 'ON' : 'OFF');
      break;
    case 't':
    case 'T':
      if (Debug.active) {
        player.pos.set(448, -3200);
      }
    case '1':
      if (Debug.active) Debug.physics.gravity = !Debug.physics.gravity;
      break;
    case '2':
      if (Debug.active) Debug.physics.friction = !Debug.physics.friction;
      break;
    case '3':
      if (Debug.active) Debug.world.bounds = !Debug.world.bounds;
      break;
    case '4':
      if (Debug.active) Debug.world.lanes = !Debug.world.lanes;
      break;
  }
}

//--------------------------------------------------------------
// PRE‑UPDATE (call once each frame BEFORE physics)
//--------------------------------------------------------------
function debugPreUpdate(player) {
  if (!(Debug.active && Debug.freeMove)) return;

  // Cancel velocity so player stays put when keys released
  player.vel.set(0, 0);

  // Arrow keys nudge position 10 px per frame (adjust as needed)
  if (keyIsDown(LEFT_ARROW)) player.pos.x -= 10;
  if (keyIsDown(RIGHT_ARROW)) player.pos.x += 10;
  if (keyIsDown(UP_ARROW)) player.pos.y -= 10;
  if (keyIsDown(DOWN_ARROW)) player.pos.y += 10;
}

//--------------------------------------------------------------
// POST‑DRAW  (call once each frame AFTER your normal drawing)
//--------------------------------------------------------------
function drawGrid(cam, spacing = Debug.snap) {
  if (!(Debug.active && Debug.showGrid)) return;

  // 1. Visible world rectangle this frame
  const s = scaleFactor; // uniform scale
  const off = letterBoxOffset; // letter-box translate (world units)
  const viewW = width / s; // width & height in world coords
  const viewH = height / s;
  const leftX = -off.x; // world X at left edge
  const rightX = leftX + viewW;
  const topY = cam.camY - off.y; // world Y at top edge
  const botY = topY + viewH;

  // 2. Align to grid
  const firstX = Math.floor(leftX / spacing) * spacing;
  const firstY = Math.floor(topY / spacing) * spacing;

  const big = spacing * 5; // bold every 5th line

  push();
  noFill();

  // vertical lines
  for (let x = firstX; x <= rightX; x += spacing) {
    stroke(x % big ? 70 : 120);
    line(x, topY, x, botY);
    if ((x % GRID_UNIT) % 4 === 0) {
      fill(0);
      noStroke();
      textSize(12);
      text(x, x + 2, topY + 14); // label near top edge
    }
  }

  // horizontal lines
  for (let y = firstY; y <= botY; y += GRID_UNIT) {
    stroke(y % big ? 70 : 120);
    line(leftX, y, rightX, y);
    if ((y / GRID_UNIT) % 1 === 0) {
      fill(0);
      noStroke();
      textSize(12);
      text(y, leftX + 4, y - 4);
    }
  }
  // pop();

  // Camera coordinates (top‑left corner of viewport)
  noStroke();
  text(text(`camY: ${cam.camY.toFixed(0)}`, 6, 24));
  pop();
}

// Helper to toggle grid on/off
function toggleGrid() {
  Debug.showGrid = !Debug.showGrid;
}

function drawWorldBounds() {
  push();
  noFill();
  stroke(255, 0, 0); // bright red outline
  strokeWeight(10);
  rect(0, 0, WORLD.w, WORLD.h);
  pop();
}

function drawLaneBounds(playW) {
  push();
  noFill();
  stroke(0, 180, 255); // cyan
  strokeWeight(3);
  rect(0, -10000, playW, 20000); // crazy-tall so it spans whole level
  pop();
}

function drawHitboxes(level) {
  push();
  fill(0, 130, 255, 70);
  strokeWeight(6);
  stroke(0, 255, 0, 50);
  for (const r of level.platforms) {
    rect(r.x, r.y, r.w, r.hHit);
  }
  pop();
}

function drawArmLenHUD(player, camera) {
  if (!Debug.active) return; // only when debug is ON

  // 1. mouse position in WORLD coords
  const v = screenToWorld(mouseX, mouseY);
  const mouse = { x: v.x, y: v.y + camera.camY };

  // 2. distance from player centre to mouse
  const needLen = Math.hypot(mouse.x - player.pos.x, mouse.y - player.pos.y);
  const needRounded = Math.round(needLen);

  push();
  textFont('monospace');
  textSize(14);
  noStroke();
  fill('#7b00ffff');
  text(
    `ARM: \n Current Length: ${player.ropeLen} \n Max Length: ${player.maxLen} \n Length to Mouse: ${needRounded}`,
    10,
    60 // x,y in SCREEN space
  );
  pop();
}

/* --------------- CLASSES ------------- */
class Player {
  constructor(
    level,
    getCamY,
    getRightGutter = () => CLIFF_W,
    volumeControl,
    sounds
  ) {
    this.level = level; // need it for collisions
    this.getCamY = getCamY; // for mouse world coords
    this.getRightGutter = getRightGutter; // function to get right gutter width

    this.r = 24;
    this.pos = createVector(0, 0); // you’ll set a real x,y outside
    this.vel = createVector(0, 0);

    /* grappling state */
    this.armAngle = 0;
    this._candidateAnchor = null;
    this.anchor = null;
    this.latched = false;
    this.maxLen = MAX_LEN;
    this.ropeLen = this.maxLen; // adjustable based on set maxLen
    this.freeze = 0; // frames to skip physics after latch
    this.frozen = false; // true means no physics until mouse moves
    this.lastMouse = createVector(0, 0); // remember where freeze began

    /* upgrades */
    // this.longArmUnlocked = false; // true when player unlocks long arm
    this.armSegments = [];
    this.totalArmLen = 120; // Base of arm from beginning of game
    this.palette = [
      color('#ff595e'),
      color('#ff8560'), // a warmer orange-red
      color('#ffca3a'),
      color('#8ac926'),
      color('#0FA958'), // a lighter, spring-green
      color('#4baed9'), // a sky-blue tint
      color('#1982c4'),
      color('#6a4c93'),
    ];
    this.nextColIdx = 0; // next color index to use

    /* face? */
    this.face = null;

    // Audio Properties
    this.volCtrl = volumeControl;
    this.sfx = sounds;
  }

  /* ---------- FACE HELPER ---------- */
  setFace(img) {
    this.face = img;
  }

  /* ---------- UPGRADES / POWER-UPS ---------- */
  unlockLongArm(len) {
    if (len > this.maxLen) {
      this.gainReach(len - this.maxLen);
    }
  }

  /* ---------- math helpers ---------- */
  armDir() {
    return createVector(cos(this.armAngle), sin(this.armAngle));
  }
  armBase() {
    const dir = this.armDir();
    return createVector(
      this.pos.x + dir.x * this.r,
      this.pos.y + dir.y * this.r
    );
  }
  armTip() {
    if (this.latched) return this.anchor.copy();
    const mw = this.getMouseWorld();
    const distance = dist(mw.x, mw.y, this.pos.x, this.pos.y);
    const reach = constrain(distance, 0, this.maxLen);

    // step along the ray until just before we enter a platform
    const dir = this.armDir();
    const step = EDGE_TOL * 0.5; // 4-px steps = ~15 steps max
    let len = 0;
    let stop = reach;

    while (len < reach) {
      const probe = createVector(
        this.pos.x + dir.x * (len + step),
        this.pos.y + dir.y * (len + step)
      );
      const innerX = WORLD.w - this.getRightGutter();
      if (probe.x > innerX) {
        stop = len;
        // anchor on the wall edge
        this.anchor = createVector(innerX, probe.y);
        break;
      }
      if (this.level.isInsideRect(probe)) {
        stop = len; // stop at edge

        if (this.level.pointInsideRectEdge(probe)) {
          this.anchor = probe.copy();
        }
        break;
      }
      len += step;
    }

    // const finalLen = hitPos ? hitPos.dist(this.pos) : reach; // stop at edge or maxLen
    const tipPos = createVector(
      this.pos.x + dir.x * stop,
      this.pos.y + dir.y * stop
    );

    // expose both: tipPos for drawing, firstInside for latching
    this._candidateAnchor = this.anchor; // store for tryLatch()
    return tipPos;
  }

  gainReach(deltaLen) {
    // 1. Add a “ring” at the tip
    const col = this.palette[this.nextColIdx++ % this.palette.length];
    this.armSegments.unshift({ len: deltaLen, col }); // newest first

    // 2. Keep your numeric truth-source in sync
    this.totalArmLen += deltaLen;

    /* let the physics layer know */
    this.maxLen += deltaLen; // grow the legal reach
    this.ropeLen = constrain(this.ropeLen, MIN_LEN, this.maxLen);
  }

  drawArm() {
    const tip = this.armTip();
    const base = this.armBase();
    const bodyR = this.r;

    /* 0.  hidden?  */
    const distToBody = dist(tip.x, tip.y, this.pos.x, this.pos.y);
    if (distToBody <= bodyR + 0.5) return; // fully retracted 🚫

    /* 1.  how much rope is outside the body?  */
    let exposed = dist(tip.x, tip.y, base.x, base.y); // px

    /* 2.  draw coloured rings starting at the TIP and walking toward BASE  */
    const dirInward = p5.Vector.sub(base, tip).normalize(); // tip → base

    strokeWeight(6);
    strokeCap(SQUARE);

    let start = tip.copy(); // begin at the fingertip
    for (const seg of this.armSegments) {
      if (exposed <= 0) break;
      const segLen = Math.min(seg.len, exposed);
      const end = p5.Vector.add(start, p5.Vector.mult(dirInward, segLen));
      stroke(seg.col);
      line(start.x, start.y, end.x, end.y);
      start = end;
      exposed -= segLen;
    }

    /* 3.  draw the plain-grey base only if some length is still un-painted  */
    if (exposed > 0) {
      const end = p5.Vector.add(start, p5.Vector.mult(dirInward, exposed));
      stroke(40);
      line(start.x, start.y, end.x, end.y);
    }

    /* 4.  always stamp a round cap at the true tip so it stays curved  */
    noStroke();
    fill(this.armSegments.length ? this.armSegments[0].col : 40);
    circle(tip.x, tip.y, 6);
  }

  /* ---------- mouse world helpers ---------- */
  getMouseWorld() {
    const v = screenToWorld(mouseX, mouseY);
    return createVector(
      v.x,
      v.y + this.getCamY() // pass camera or camY too
    );
  }

  /* ---------- core loop steps ---------- */
  update(endingTriggered = false) {
    const mw = this.getMouseWorld();

    this.armAngle = atan2(mw.y - this.pos.y, mw.x - this.pos.x);

    if (endingTriggered) return; // skip all physics in ending cutscene

    // ————————————— LATched MODE —————————————
    if (this.latched) {
      // 1) handle the “freeze until mouse moves” state
      if (this.frozen) {
        if (mouseX !== this.lastMouse.x || mouseY !== this.lastMouse.y) {
          this.frozen = false;
        }
        this.applyAnchorConstraint();
        return;
      }

      // 2) once unfrozen, allow rope‐length adjust on drag
      if (mouseIsPressed) {
        const INPUT_SENSITIVITY = 0.4;

        // 1) raw distance from anchor → pointer
        const dx = mw.x - this.anchor.x;
        const dy = mw.y - this.anchor.y; // positive = downward drag
        const rawDist = Math.hypot(dx, dy) - this.r;

        let targetLen;
        if (dy > 0) {
          // only apply “joystick” when dragging down
          const inputRadius = this.maxLen * INPUT_SENSITIVITY;
          const norm = constrain(rawDist / inputRadius, 0, 1);
          targetLen = norm * this.maxLen;
        } else {
          // all other directions are normal
          targetLen = constrain(rawDist, MIN_LEN, this.maxLen);
        }
        this.ropeLen += (targetLen - this.ropeLen) * 0.25;
      }

      // 3) enforce rope constraint every frame, then skip free physics
      this.applyAnchorConstraint();
      return;
    }

    // physics

    // physics with sub-steps to prevent tunneling
    if (this.freeze > 0) {
      this.freeze--;
    } else {
      // 1) integrate gravity & friction once
      this.vel.y += GRAVITY;
      this.vel.mult(FRICTION);

      // 2) true top-only sweep clamp
      const oldPos = this.pos.copy();
      const nextPos = createVector(
        oldPos.x + this.vel.x,
        oldPos.y + this.vel.y
      );
      const mv = p5.Vector.sub(nextPos, oldPos);

      // only if moving mostly downward
      if (mv.y > 0 && Math.abs(mv.y) > Math.abs(mv.x)) {
        const oldBottom = oldPos.y + this.r;
        const nextBottom = nextPos.y + this.r;
        const EPS = 0.01;

        for (const r of this.level.platforms) {
          // require start above and end below the platform’s top edge
          if (
            oldBottom <= r.y &&
            nextBottom >= r.y &&
            // and horizontally overlapping when you land
            nextPos.x >= r.x &&
            nextPos.x <= r.x + r.w
          ) {
            const toi = segmentRectTOI(oldPos, nextPos, r, this.r);
            if (toi !== null && toi > EPS && toi < 1) {
              // clamp at impact and stop vertical velocity
              this.pos = p5.Vector.lerp(oldPos, nextPos, toi * 0.99);
              this.vel.y = 0;
              break;
            }
          }
        }
      }

      // free‐motion micro-steps to catch thin platforms
      const maxStep = this.r * 0.5;
      const distance = this.vel.mag();
      const steps = Math.ceil(distance / maxStep) || 1;
      for (let i = 0; i < steps; i++) {
        this.pos.x += this.vel.x / steps;
        this.pos.y += this.vel.y / steps;
        this.level.platforms.forEach((r) => this.collideRect(r));
        this.constrainToLane();
      }
    }

    // finally, if we’re latched, apply the rope constraint
    if (this.latched) this.applyAnchorConstraint();
  }

  draw() {
    /* 1. draw rope */

    this.drawArm();

    /* 2. draw body */
    noStroke();
    fill(100, 150, 255);
    circle(this.pos.x, this.pos.y, this.r * 2);

    /* 3. draw face if present */
    if (this.face) {
      push();
      imageMode(CENTER);
      image(this.face, this.pos.x, this.pos.y, this.r * 2, this.r * 2);
      pop();
    }
  }

  /* ---------- grappling helpers ---------- */
  tryLatch() {
    let tip = this.armTip(); // calculate tip position

    /* 1. Find the FIRST rectangle that already contains the tip */

    for (const r of this.level.platforms) {
      const top = r.y - EDGE_TOL;
      const bottom = r.y + (r.hHit ?? r.h) + EDGE_TOL;
      const left = r.x - EDGE_TOL;
      const right = r.x + r.w + EDGE_TOL;

      if (tip.x >= left && tip.x <= right && tip.y >= top && tip.y <= bottom) {
        if (r.latchable === false) {
          this.sfx.stoneGrabSnd.play();
          this.sfx.stoneGrabSnd.rate(4);
          break;
        }
        /* — v4 behaviour: anchor exactly where you clicked — */
        this.latched = true;
        this.anchor = tip.copy();

        // Play Sound
        this.sfx.grassGrabSnd.play();
        this.sfx.grassGrabSnd.rate(4);

        const full = dist(tip.x, tip.y, this.pos.x, this.pos.y);
        this.ropeLen = constrain(full - this.r, MIN_LEN, MAX_LEN);
        break;
      }
    }
    if (tip.x >= WORLD.w - this.getRightGutter() - EDGE_TOL) {
      this.sfx.stoneGrabSnd.play();
      this.sfx.stoneGrabSnd.rate(4);
    }
  }

  release() {
    this.latched = false;
    this.anchor = null;
    this.frozen = false;
  }

  /* ---------- rope distance‑joint ---------- */
  applyAnchorConstraint() {
    if (!this.latched || !this.anchor) return;

    const dir = this.armDir();
    const targetBase = createVector(
      this.anchor.x - dir.x * this.ropeLen,
      this.anchor.y - dir.y * this.ropeLen
    );
    const targetPos = createVector(
      targetBase.x - dir.x * this.r,
      targetBase.y - dir.y * this.r
    );
    // dynamic sub-steps
    const correction = p5.Vector.sub(targetPos, this.pos);
    const mag = correction.mag();
    if (mag > 0) {
      const maxStep = this.r * 0.5;
      const steps = Math.ceil(mag / maxStep);
      const sub = correction.copy().div(steps);
      for (let i = 0; i < steps; i++) {
        this.pos.add(sub);
        this.level.platforms.forEach((r) => this.collideRect(r));
        this.constrainToLane();
        this.collideWall();
      }
    }

    // remove radial velocity so you don't ping off axis

    const radialVel = this.vel.dot(dir); // projection onto rope
    this.vel.sub(dir.copy().mult(radialVel));
  }

  /* ---------- circle vs rect push‑out ---------- */
  collideRect(rect) {
    if (rect.hHit <= 0) return; // no hitbox, skip

    const cx = constrain(this.pos.x, rect.x, rect.x + rect.w);
    const cy = constrain(this.pos.y, rect.y, rect.y + rect.hHit);
    const delta = createVector(this.pos.x - cx, this.pos.y - cy);
    const d = delta.mag();

    if (d < this.r) {
      const overlap = this.r - d;
      delta.setMag(d !== 0 ? overlap : 0); // exact corner case

      if (d == 0) delta.set(0, -overlap);
      this.pos.add(delta);

      if (delta.y < 0) {
        // hitting top of platform
        this.vel.y = 0;
        if (!this.latched) {
          this.vel.x *= 0.3; // slow down on landing
        }
      } else {
        //side or bottom hit
        // this.vel.add(delta);
        if (this.vel.y < 0) this.vel.y = 0;
        if (!this.latched) {
          // this.vel.add(delta);
          this.vel.x *= 0.8;
        } else {
          // damped any residual slide when latched
          this.vel.mult(0.9);
        }
      }
    }
  }

  /* ---------- keep inside play lane ---------- */
  constrainToLane() {
    const half = this.r; // half the player
    const left = half; // left edge of player
    const right = WORLD.w - this.getRightGutter() - half; // right edge of player
    if (this.pos.x < left) {
      this.pos.x = left;
    }

    if (this.vel.x < 0) {
      this.vel.x = 0; // stop sliding
    } else if (this.pos.x > right) {
      this.pos.x = right;
      if (this.vel.x > 0) {
        this.vel.x = 0; // stop sliding
      }
    }
  }

  /**
   * Prevent the player from ever going into the right‐hand gutter wall.
   */
  collideWall() {
    // world-space X of the inner face of the wall:
    const innerX = WORLD.w - this.getRightGutter();
    const over = this.pos.x + this.r - innerX;

    if (over > 0) {
      // 1) push back out by the overlap amount
      this.pos.x -= over;

      // 2) zero out any positive x‐velocity so you don't ping off
      if (this.vel.x > 0) this.vel.x = 0;
    }
  }

  /* ---------- powerups ---------- */
  setMaxRopeLength(len) {
    this.maxLen = len;
    this.ropeLen = constrain(this.ropeLen, MIN_LEN, this.maxLen);
  }

  /* ---------- reset ---------- */
  reset(startX, startY) {
    this.pos.set(startX, startY);
    this.vel.set(0, 0);
    this.release();
    this.ropeLen = this.maxLen;
  }
}

// Background.js
class Background {
  /**
   * @param {number} worldH   – total vertical span of your level in px
   * @param {number} worldW   – canvas width at setup()
   * @param {p5}     p        – p5 instance (only needed if you’re using instance mode)
   */
  constructor(worldH, worldW, teraSprites, saggiSprites) {
    this.worldH = worldH;
    this.worldW = worldW;

    // ── Animation setup ─────────────────────────
    this.teraSprites = teraSprites;
    this.saggiSprites = saggiSprites;
    this.frameWidth = 100;
    this.frameHeight = 100;
    this.totalFrames = 60;
    this.animTimer = 0; // accumulates p.deltaTime
    this.frameDuration = 100; // ms per frame

    /* --------- 1. PAINT ONE LOOPABLE GRADIENT STRIP --------- */
    const STRIP_H = 3000; // fixed, GPU-friendly
    this.sky = createGraphics(worldW, STRIP_H);

    for (let y = 0; y < STRIP_H; y++) {
      // mirrored 0 → 1 → 0 so top == bottom ⇒ seamless tile
      let t = y / STRIP_H;
      t = t < 0.5 ? t * 2 : (1 - t) * 2;

      const col = lerpColor(
        color('#6EC6FF'), // zenith
        color('#E0F7FF'), // hazy horizon
        t
      );
      this.sky.stroke(col);
      this.sky.line(0, y, worldW, y);
    }

    // a handful of small stars scattered across the entire world
    this.spaceStars = Array.from({ length: 200 }, () => ({
      x: random(0, worldW),
      y: random(-10000, -6000),
      size: random(1, 3),
    }));
    // two “planets” placed in the upper half of the world
    this.planets = [
      {
        x: worldW * 0.3,
        y: -8000,
        r: 100,
        img: teraSprites,
        frameWidth: 100,
      },
      {
        x: worldW * 0.7,
        y: -7200,
        r: 40,
        img: saggiSprites,
        frameWidth: 5882 / 60,
      },
    ];

    // ── TUNE THESE TO YOUR CUTSCENE ────────────────
    // camera.camY at ~17 s of the cutscene is about –6000 px
    this.spaceFadeStartY = -6000;
    // over how many pixels to fade from sky → space
    this.spaceFadeRange = 1200;

    /* --------- 2. PROCEDURAL CLOUDS --------- */
    this.clouds = Array.from({ length: 120 }, () => ({
      x: random(-worldW * 0.5, worldW * 1.5),
      y: random(0, worldH),
      r: random(90, 220), // radius
      layer: random(0.35, 0.6), // parallax factor (lower = slower)
    }));
  }

  /** Draw at current camera origin (camX, camY) in world coordinates */
  draw(camX, camY) {
    // ── Advance animation timer & pick frame ────
    this.animTimer += deltaTime;
    const frameIndex =
      Math.floor(this.animTimer / this.frameDuration) % this.totalFrames;

    const PAR = 0.4;
    const imgH = this.sky.height;
    const viewH = height;

    // 1) Pure continuous scroll (no modulo)
    const scroll = Math.abs(camY) * PAR;

    // 2) Figure out the very first strip’s Y
    const startY = -scroll - imgH; // shift up one strip to guarantee coverage

    const tRaw = (this.spaceFadeStartY - camY) / this.spaceFadeRange;
    const fade = constrain(tRaw, 0, 1);
    const alpha = fade * 255;
    // skyAlpha: 255→0 as fade goes 0→1
    const skyAlpha = constrain(255 * (1 - fade), 0, 255);

    push();
    tint(255, skyAlpha);
    for (let y = startY; y < viewH + imgH; y += imgH) {
      image(this.sky, 0, Math.round(y), this.worldW, imgH + 0.99999999);
    }
    pop();

    // ── BLACK SPACE OVERLAY ───────────────────────────────────
    if (fade > 0) {
      push();
      noStroke();
      fill(0, alpha);
      for (let y = -6000; y < viewH + imgH; y += imgH) {
        rect(0, Math.round(y), this.worldW, imgH + 0.99999999);
      }
      pop();
    }

    /* ── 2.  CLOUDS ───────────────────────────────────── */
    if (alpha === 0) {
      push();
      translate(-camX, 0); // keep clouds locked in world-X
      this.clouds.forEach((cl) => {
        const yOnScreen = cl.y - camY * cl.layer;

        /* wrap both directions so there are always clouds */
        if (yOnScreen > height + cl.r) cl.y -= this.worldH;
        if (yOnScreen < -cl.r) cl.y += this.worldH;

        noStroke();
        fill(255, 240);
        ellipse(cl.x, yOnScreen, cl.r, cl.r * 0.6);
        ellipse(
          cl.x - cl.r * 0.4,
          yOnScreen + cl.r * 0.1,
          cl.r * 0.7,
          cl.r * 0.45
        );
        ellipse(
          cl.x + cl.r * 0.4,
          yOnScreen + cl.r * 0.1,
          cl.r * 0.7,
          cl.r * 0.45
        );
      });
      pop();
    }

    if (fade > 0) {
      const alpha = fade * 255;
      push();
      noStroke();

      // draw each star
      this.spaceStars.forEach((st) => {
        const sy = st.y - camY;
        if (sy < -st.size || sy > height + st.size) return;
        fill(255, alpha);
        circle(st.x, sy, st.size);
      });
      pop();

      push();
      imageMode(CENTER);
      // draw each planet
      this.planets.forEach((pl) => {
        const py = pl.y - camY;
        if (py < -pl.r || py > height + pl.r) return;

        // global frameIndex from your animTimer logic
        const idx = frameIndex;

        // source rect
        const sx = idx * pl.frameWidth;
        const sy = 0;

        // draw at pl.x, py; size = diameter = r*2
        image(
          pl.img,
          pl.x,
          py,
          pl.r * 2,
          pl.r * 2,
          sx,
          sy,
          this.frameWidth,
          this.frameHeight
        );
      });

      pop();
    }
  }
}

class Camera {
  constructor(player) {
    this.player = player;
    this.camY = 0;
  }

  update() {
    const midY = WORLD.h * SCREEN_GAP; // WORLD.h = 450 by default
    const playerY = this.player.pos.y - this.camY; // player in screen coords
    const desired = this.player.pos.y - midY; // camY if centred

    if (playerY < midY) {
      // above halfway → lift gently
      this.camY = lerp(this.camY, desired, LIFT_SPEED);
    } else if (playerY > midY) {
      // below halfway → drop faster
      this.camY = lerp(this.camY, desired, DROP_SPEED);
    }
  }

  /* call at top of draw(): push & translate world */
  begin() {
    push();
    translate(0, -Math.round(this.camY));
  }

  /* call after world draw, before UI: pop back */
  end() {
    pop();
  }

  /* reset on game restart */
  reset() {
    this.camY = 0;
  }
}

const snap = (v) => Math.round(v / GRID_UNIT) * GRID_UNIT;

class Level {
  constructor(playW, tiles) {
    this.playW = playW;
    this.platforms = [];
    this.tiles = tiles;
    this.cache = new Map(); // cache width and graphics buffer
  }

  /* ---------- Platform Creators ---------- */
  addPlatform(
    laneX,
    yTop,
    w,
    hHit = 12,
    hArt = this.tileH,
    isGround = false,
    kind
  ) {
    // this.platforms.push({ x, y: yTop, w, hHit, hArt, isGround, kind });

    let x = snap(laneX); // lane coord → world coord
    const spec = this.tiles[kind] ?? {};
    if (spec.snapW !== false) w = snap(w);
    if (spec.align === 'right') x += GRID_UNIT - w;

    // const mod = yTop % GRID_UNIT;
    // if (!(hArt < GRID_UNIT && mod === GRID_UNIT - hArt)) yTop = snap(yTop); // (optional – keeps rows tidy)
    this.platforms.push({
      x,
      y: yTop,
      w,
      hHit,
      hArt,
      isGround,
      latchable: spec.noLatch ? false : true,
      kind,
    });
  }

  addRow(y, positions, w, hHit, hArt) {
    if (Array.isArray(positions)) {
      positions.forEach((x) => this.addPlatform(x, y, w, hHit, hArt));
    } else {
      const count = positions;
      const gap = (this.playW - w) / (count - 1);
      for (let i = 0; i < count; i++)
        this.addPlatform(i * gap, y, w, hHit, hArt);
    }
  }

  /* ---------- Create with Tile ---------- */
  getStrip(kind, w) {
    const spec = this.tiles[kind]; // ← pull once
    if (!spec) return defaultStrip(w); // fallback

    const { scale = 4 } = spec;
    const key = `${kind}|${w}`;

    if (this.cache[key]) return this.cache[key];

    switch (spec.method) {
      case 'caps':
        this.cache[key] = buildCaps(spec.capImg, spec.midImg, w, scale);
        break;
      case 'repeat':
        this.cache[key] = buildRepeatingStrip(spec.tileImg, w, scale);
        break;
      case 'tileY':
        this.cache[key] = buildTilingArea(
          spec.tileImg,
          this.playW,
          4096,
          scale
        );
        break;
      case 'single':
        const tileW = spec.tileImg.width * scale;
        const tileH = spec.tileImg.height * scale;
        const g = createGraphics(tileW, tileH);
        g.noSmooth();
        g.image(spec.tileImg, 0, 0, tileW, tileH);
        this.cache[key] = g;
        break;
      default:
        this.cache[key] = defaultStrip(w);
    }
    return this.cache[key];
  }

  draw() {
    for (const r of this.platforms) {
      const strip = this.getStrip(r.kind, r.w, r.hArt);
      // align sprite so grass sits ON TOP of the collision rect
      image(strip, r.x, r.y);
    }
  }

  /* small utility used by Player */
  isInsideRect(pt) {
    return this.platforms.some(
      (r) =>
        pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.hHit
    );
  }

  pointInsideRectEdge(pt) {
    return this.platforms.some((r) => {
      const onTop =
        pt.x >= r.x &&
        pt.x <= r.x + r.w &&
        pt.y >= r.y &&
        pt.y <= r.y + EDGE_TOL;

      const onLeft =
        pt.y >= r.y &&
        pt.y <= r.y + r.hHit &&
        pt.x >= r.x - EDGE_TOL &&
        pt.x <= r.x;

      const onRight =
        pt.y >= r.y &&
        pt.y <= r.y + r.hHit &&
        pt.x >= r.x + r.w &&
        pt.x <= r.x + r.w + EDGE_TOL;

      return onTop || onLeft || onRight;
    });
  }
}

/**
 * buildGrassStrip(width, scale = 4)
 * Returns a p5.Graphics strip that is:
 *   [capL] [mid × N] [capR-mirror]
 * scaled to (8 × scale) pixels tall.
 */
function buildCaps(capImg, midImg, widthPx, scale = 4) {
  const tileW = capImg.width * scale;
  const tileH = capImg.height * scale;

  if (widthPx < tileW * 2) widthPx = tileW * 2;

  const g = createGraphics(widthPx, tileH);
  g.noSmooth();

  /* left cap */
  g.image(capImg, 0, 0, tileW, tileH);

  /* middle repeats */
  for (let x = tileW; x <= widthPx - tileW * 2; x += tileW)
    g.image(midImg, x, 0, tileW, tileH);

  /* right cap (mirror) */
  g.push();
  g.translate(widthPx, 0);
  g.scale(-1, 1);
  g.image(capImg, 0, 0, tileW, tileH);
  g.pop();

  return g;
}

function buildRepeatingStrip(tile, widthPx, scale = 4) {
  const tileW = tile.width * scale;
  const tileH = tile.height * scale;

  const g = createGraphics(widthPx, tileH);
  g.noSmooth();
  // for (let x = 0; x < widthPx; x += tileW) g.image(tile, x, 0, tileW, tileH);
  for (let x = 0; x < widthPx; x += tileW) {
    const drawW = Math.min(tileW, widthPx - x); // last sliver?
    g.image(
      tile,
      x,
      0,
      100,
      tileH,
      0,
      0,
      tile.width * (drawW / tileW),
      tile.height
    );
  }
  return g;
}

/**
 * buildTilingArea – fill a w×h buffer with one tile, scaled N×, repeating in X & Y.
 */
function buildTilingArea(tile, w, h, scale = 4) {
  const TW = tile.width * scale;
  const TH = tile.height * scale;

  const g = createGraphics(w, h);
  g.noSmooth();
  for (let y = 0; y < h; y += TH)
    for (let x = 0; x < w; x += TW) g.image(tile, x, y, TW, TH);

  return g;
}

function defaultStrip(widthPx, heightPx = 24, colour = '#666') {
  const g = createGraphics(widthPx, heightPx);
  g.noSmooth();
  g.background(colour);
  return g;
}

/* ------------------------------------------------------------------
   Return the nearest point ON the rectangle’s edge, or null if the
   point is outside the rect entirely.
------------------------------------------------------------------- */
function nearestEdgePoint(pt, rect) {
  // Support either {h} or {hHit}
  const top = rect.y;
  const bottom = rect.y + (rect.hHit ?? rect.h);
  const left = rect.x;
  const right = rect.x + rect.w;

  // Inclusive check so points exactly on the edge still count
  if (pt.x < left || pt.x > right || pt.y < top || pt.y > bottom) return null;

  // Distances to each edge
  const dxL = pt.x - left;
  const dxR = right - pt.x;
  const dyT = pt.y - top;
  const dyB = bottom - pt.y;

  const min = Math.min(dxL, dxR, dyT, dyB);

  if (min === dxL) return { x: left, y: pt.y }; // left edge
  if (min === dxR) return { x: right, y: pt.y }; // right edge
  if (min === dyT) return { x: pt.x, y: top }; // top edge
  return { x: pt.x, y: bottom }; // bottom edge
}

/* --------------------------------------------------------------
   Given a point KNOWN to be inside rect, return the closest
   point ON THE EDGE of that rect (left/right/top/bottom).
---------------------------------------------------------------- */
function projectToEdge(pt, rect) {
  const top = rect.y;
  const bottom = rect.y + (rect.hHit ?? rect.h);
  const left = rect.x;
  const right = rect.x + rect.w;

  const dxL = pt.x - left;
  const dxR = right - pt.x;
  const dyT = pt.y - top;
  const dyB = bottom - pt.y;

  const min = Math.min(dxL, dxR, dyT, dyB);

  switch (min) {
    case dxL:
      return { x: left, y: pt.y }; // left edge
    case dxR:
      return { x: right, y: pt.y }; // right edge
    case dyT:
      return { x: pt.x, y: top }; // top edge
    default:
      return { x: pt.x, y: bottom }; // bottom edge
  }
}

// VolumeControl.js
class VolumeControl {
  constructor(x, y, sounds = []) {
    this.x = x;
    this.y = y;
    this.size = 32; // speaker icon size
    this.sliderH = 100; // height of volume slider
    this.sliderW = 8; // width of slider track
    this.knobH = 12; // height of knob
    this.volume = 0.5;
    this.muted = false;
    this.prevVol = this.volume;
    this.sounds = sounds; // array of p5.Sound instances
    this.dragging = false; // is the slider knob being dragged?
    this.visible = false; // is the slider visible?
    this.pad = 10; // padding around expanded hit area
  }

  // basic rect hit-test
  _hit(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  draw() {
    const mx = mouseX,
      my = mouseY;

    // speaker bounds
    const sx = this.x,
      sy = this.y,
      sw = this.size,
      sh = this.size;

    // slider bounds (under speaker, 8px gap)
    const sliderX = this.x + this.size / 2 - this.sliderW / 2;
    const sliderY = this.y + this.size + 8;
    const sliderW = this.sliderW,
      sliderH = this.sliderH;

    // expanded hit area: covers speaker + slider + padding
    const areaX = sx - this.pad;
    const areaY = sy - this.pad;
    const areaW = sw + this.pad * 2;
    const areaH = sh + 8 + sliderH + this.pad * 2;

    // determine visibility: if dragging or mouse inside expanded area
    this.visible =
      this.dragging || this._hit(mx, my, areaX, areaY, areaW, areaH);

    // ── draw speaker background ───────────────────────────────
    push();
    noStroke();
    fill(30, 180);
    rect(sx, sy, sw, sh, 4);
    pop();

    // ── cone pointing right ────────────────────────────────────
    const midY = sy + sh / 2;
    push();
    noStroke();
    fill(200);
    triangle(sx + sw - 6, sy + 8, sx + sw - 6, sy + 24, sx + 6, midY);
    pop();

    // ── waves or X ────────────────────────────────────────────
    push();
    if (!this.muted) {
      noFill();
      stroke(200);
      strokeWeight(2);
      const waves = Math.ceil(this.volume * 3);
      for (let i = 1; i <= waves; i++) {
        arc(sx + sw - 6 + i * 4, midY, i * 8, i * 8, -PI / 4, PI / 4);
      }
    } else {
      // small X to the right of the speaker icon
      const x0 = sx + sw + 6;
      const y0 = midY;
      const s = 4; // half-size of the small X
      stroke(200);
      strokeWeight(2);
      line(x0 - s, y0 - s, x0 + s, y0 + s);
      line(x0 - s, y0 + s, x0 + s, y0 - s);
    }
    pop();

    // ── draw slider if visible ────────────────────────────────
    if (this.visible) {
      // track
      push();
      noStroke();
      fill(50, 180);
      rect(sliderX, sliderY, sliderW, sliderH, 4);
      pop();

      // knob
      const knobY = sliderY + sliderH * (1 - this.volume) - this.knobH / 2;
      push();
      noStroke();
      fill(220);
      rect(sliderX - 2, knobY, sliderW + 4, this.knobH, 4);
      pop();
    }
  }

  mousePressed(mx, my) {
    const sx = this.x,
      sy = this.y,
      sw = this.size,
      sh = this.size;
    const sliderX = this.x + this.size / 2 - this.sliderW / 2;
    const sliderY = this.y + this.size + 8;

    // speaker click toggles mute
    if (this._hit(mx, my, sx, sy, sw, sh)) {
      this.muted = !this.muted;
      if (this.muted) {
        this.prevVol = this.volume;
        this.setVolume(0);
      } else {
        this.setVolume(this.prevVol);
      }
      return;
    }

    // click on slider track starts drag
    if (
      this.visible &&
      this._hit(mx, my, sliderX, sliderY, this.sliderW, this.sliderH)
    ) {
      this.dragging = true;
      this._updateVolumeFromY(my, sliderY);
    }
  }

  mouseDragged(mx, my) {
    if (this.dragging) {
      const sliderY = this.y + this.size + 8;
      this._updateVolumeFromY(my, sliderY);
    }
  }

  mouseReleased() {
    this.dragging = false;
  }

  _updateVolumeFromY(my, sliderY) {
    const clamped = constrain(my, sliderY, sliderY + this.sliderH);
    this.setVolume(1 - (clamped - sliderY) / this.sliderH);
    if (this.muted && this.volume > 0) this.muted = false;
  }

  setVolume(v) {
    this.volume = constrain(v, 0, 1);
    this.sounds.forEach((snd) => snd.setVolume(this.volume));
    this.muted = this.volume === 0;
  }
}

class Story {
  constructor(failTutorials = []) {
    this.txt = '';
    this.timer = 0;

    // Guides
    this.failTutorials = failTutorials;
    this.guideGif = null;
    this.guideTimer = 0;
  }

  queue(txt, frames = MSG_TIME_FRAMES) {
    this.txt = txt;
    this.timer = frames;
  }

  showGuide(idx) {
    this.guideGif = this.failTutorials[idx];
    const nFrames = this.guideGif.numFrames();
    console.log(nFrames);
    this.guideTimer = GUIDE_FADE_FRAMES + nFrames + GUIDE_FADE_FRAMES;
  }

  draw(player, endingTriggered) {
    this._drawToast(player, endingTriggered);
    this._drawGuide();
  }

  _drawToast(player, endingTriggered) {
    if (this.timer <= 0) return; // nothing? nothing.
    const a = 255 * (this.timer / MSG_TIME_FRAMES);

    const off = player.r + 20; // little below the sprite
    push();
    imageMode(CENTER);
    textAlign(CENTER, TOP);
    textFont('monospace');
    textSize(18);
    fill(255, a);
    stroke(0, a);
    strokeWeight(4);
    if (!endingTriggered) {
      text(this.txt, width / 4, player.pos.y + off);
    } else {
      text(this.txt, player.pos.x, player.pos.y + off + 100);
    }
    pop();

    this.timer--;
  }
  _drawGuide() {
    if (this.guideTimer <= 0 || !this.guideGif) return;
    const t = this.guideTimer;
    const nFrames = this.guideGif.numFrames();
    const total = GUIDE_FADE_FRAMES + nFrames + GUIDE_FADE_FRAMES;
    let alpha = 255;

    // fade-in
    if (t > nFrames + GUIDE_FADE_FRAMES) {
      alpha = map(t, total, nFrames + GUIDE_FADE_FRAMES, 0, 255);
    }
    // fade-out
    else if (t < GUIDE_FADE_FRAMES) {
      alpha = map(t, 0, GUIDE_FADE_FRAMES, 0, 255);
    }
    // else fully visible

    // Responsiveness and sizing
    const pctSize = 0.3; // 30% of canvas width
    const padPct = 0.02; // 2% padding
    const dispW = width * pctSize; // desired display width
    const scale = dispW / this.guideGif.width;
    const dispH = this.guideGif.height * scale;
    const padX = width * padPct;
    const padY = height * padPct;

    push();
    resetMatrix();
    tint(255, alpha);
    imageMode(CORNER);
    // place bottom-left, with 16px padding
    image(this.guideGif, padX, height - dispH - padY, dispW, dispH);
    pop();

    this.guideTimer--;
  }
}

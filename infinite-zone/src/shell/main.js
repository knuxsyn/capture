// Browser shell: fixed 60 Hz loop, title attract mode, HUD, overlays,
// cartridge slots. Everything game-side lives in the core and carts.
import { createCore } from '../core/core.js';
import { base } from '../content/base.js';
import { createBot } from '../content/bot.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { SpriteSkin, loadImage, PRESETS } from './skin.js';
import { moon } from '../../mods/moon.js';
import { skyways } from '../../mods/skyways.js';
import { glide } from '../../mods/glide.js';

const CARTS = [skyways, glide, moon];
const STEP = 1000 / 60;
const $ = (id) => document.getElementById(id);

const store = {
  get(k, d) {
    try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ }
  },
};

const WORDS = ['ridge', 'ember', 'tidal', 'static', 'prism', 'orbit', 'quartz', 'delta', 'cobalt', 'vapor', 'summit', 'signal'];
const randomSeed = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(Math.random() * 9000) + 1000}`;
const cleanSeed = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9._~-]/g, '').slice(0, 32);

const input = new Input();
const sfx = new Sfx();
const renderer = new Renderer($('screen'));
const ui = {
  score: $('hud-score'), time: $('hud-time'), rings: $('hud-rings'), dist: $('hud-dist'),
  lives: $('hud-lives'), zone: $('hud-zone'), ringBox: $('hud-ringbox'),
};

let mode = 'title';
let core = null, bot = null, frame = 0;
let enabled = new Set(store.get('iz.carts', []).filter((id) => CARTS.some((c) => c.id === id)));
let seed = cleanSeed(location.hash.slice(1)) || store.get('iz.seed', '') || randomSeed();
let overT = 0, overAt = 0;
let hudCache = {};

function carts() {
  return [base, ...CARTS.filter((c) => enabled.has(c.id))];
}

function boot(play) {
  core = createCore({ seed: play ? seed : `attract-${seed}`, carts: carts() }).start();
  bot = play ? null : createBot();
  renderer.attach(core);
  hudCache = {};
  frame = 0;
}

function setMode(m) {
  mode = m;
  $('title').hidden = m !== 'title';
  $('paused').hidden = m !== 'paused';
  $('over').hidden = m !== 'over';
  $('hud').hidden = m === 'title';
  document.body.dataset.mode = m;
}

function start() {
  sfx.unlock();
  seed = cleanSeed($('seed').value) || randomSeed();
  $('seed').value = seed;
  store.set('iz.seed', seed);
  try { history.replaceState(null, '', `#${seed}`); } catch { /* sandboxed */ }
  boot(true);
  setMode('play');
  banner();
}

function toTitle() {
  boot(false);
  setMode('title');
}

function banner() {
  const z = core.zone();
  if (!z) return;
  const el = $('banner');
  el.innerHTML = `<span>${z.name}</span><small>Act ${core.act()}</small>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function gameOver() {
  const m = Math.floor(core.distance / 16);
  const key = `iz.best.${seed}`;
  const best = Math.max(store.get(key, 0), m);
  store.set(key, best);
  $('over-dist').textContent = `${m.toLocaleString()} m`;
  $('over-score').textContent = core.score.toLocaleString();
  $('over-time').textContent = clock(core.time);
  $('over-best').textContent = `${best.toLocaleString()} m`;
  $('over-seed').textContent = seed;
  overAt = performance.now();
  setMode('over');
}

function clock(t) {
  const s = Math.floor(t / 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function hud() {
  const v = {
    score: core.score.toLocaleString(),
    time: clock(core.time),
    rings: String(core.rings),
    dist: `${Math.floor(core.distance / 16).toLocaleString()} m`,
    lives: `Lives ${core.lives}`,
    zone: core.zone() ? `${core.zone().name} · Act ${core.act()}` : '',
  };
  for (const k in v) {
    if (hudCache[k] !== v[k]) {
      ui[k].textContent = v[k];
      hudCache[k] = v[k];
    }
  }
  ui.ringBox.classList.toggle('empty', core.rings === 0 && (frame >> 4) % 2 === 0);
  if (renderer.debug) $('debug').textContent = renderer.debugText();
}

function step() {
  let inp;
  if (mode === 'play') inp = input.read();
  else {
    const pressed = input.read();
    if (mode === 'title' && (pressed.jump || pressed.start)) return start();
    inp = bot(core);
  }
  core.step(inp);
  frame++;
  const ev = core.events;
  if (mode === 'play') {
    sfx.handle(ev, core);
    if (ev.includes('zone')) banner();
    if (core.state === 'over' && ++overT > 45) { overT = 0; gameOver(); }
  } else if (mode === 'title' && (core.state === 'over' || core.time > 60 * 90)) {
    boot(false);
  }
  renderer.follow();
}

let last = performance.now(), acc = 0;
function tick(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= STEP) {
    acc -= STEP;
    if (mode !== 'paused' && mode !== 'over') step();
  }
  renderer.draw(frame);
  if (mode !== 'title') hud();
  requestAnimationFrame(tick);
}

// --- cartridge slots ------------------------------------------------------

function renderCarts() {
  const list = $('carts');
  list.innerHTML = '';
  for (const c of CARTS) {
    const id = `cart-${c.id}`;
    const row = document.createElement('label');
    row.className = 'cart';
    row.htmlFor = id;
    row.innerHTML = `<input type="checkbox" id="${id}"><span class="slot"></span><span class="txt"><b></b><small></small></span>`;
    row.querySelector('b').textContent = c.name;
    row.querySelector('small').textContent = c.blurb;
    const box = row.querySelector('input');
    box.checked = enabled.has(c.id);
    box.addEventListener('change', () => {
      if (box.checked) enabled.add(c.id); else enabled.delete(c.id);
      store.set('iz.carts', [...enabled]);
      if (mode === 'title') boot(false);
      else start();
    });
    list.append(row);
  }
}

// --- character skin -------------------------------------------------------
// Sheets load from the viewer's own files and stay in this browser.

const readAs = (file, how) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r[how](file);
});

async function applySkin(src, atlas, save) {
  const img = await loadImage(src);
  atlas ??= PRESETS[`${img.naturalWidth}x${img.naturalHeight}`];
  if (!atlas) throw new Error(`No layout is known for a ${img.naturalWidth}×${img.naturalHeight} sheet. Load its atlas .json with it.`);
  renderer.skin = new SpriteSkin(img, atlas);
  $('skin-status').textContent = `Using ${renderer.skin.name}`;
  if (save) store.set('iz.skin', { src, atlas });
}

$('skin-file').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  const imgFile = files.find((f) => f.type.startsWith('image/'));
  const jsonFile = files.find((f) => f.name.endsWith('.json'));
  try {
    if (!imgFile) throw new Error('Pick the sheet image (PNG or GIF), plus its atlas .json if you have one.');
    const atlas = jsonFile ? JSON.parse(await readAs(jsonFile, 'readAsText')) : undefined;
    await applySkin(await readAs(imgFile, 'readAsDataURL'), atlas, true);
  } catch (err) {
    $('skin-status').textContent = err.message;
  }
});

$('skin-reset').addEventListener('click', () => {
  renderer.skin = null;
  store.set('iz.skin', null);
  $('skin-status').textContent = 'Using the built-in runner';
});

async function restoreSkin() {
  const saved = store.get('iz.skin', null);
  try {
    if (saved) return await applySkin(saved.src, saved.atlas, false);
    // Local development: drop sheet.png + skin.json into skins/local/.
    const res = await fetch('skins/local/skin.json');
    if (res.ok) await applySkin('skins/local/sheet.png', await res.json(), false);
  } catch { /* no saved or local skin */ }
}

// --- wiring ---------------------------------------------------------------

input.bind(window, $('touch'));
input.on('key', (code) => {
  sfx.unlock();
  const jumpKey = ['KeyZ', 'KeyX', 'KeyC', 'KeyJ', 'KeyK', 'Space'].includes(code);
  if (mode === 'over' && (code === 'Enter' || jumpKey) && performance.now() - overAt > 700) start();
  else if (code === 'Enter' && mode === 'title') start();
  else if ((code === 'KeyP' || code === 'Escape') && (mode === 'play' || mode === 'paused')) setMode(mode === 'play' ? 'paused' : 'play');
  else if (code === 'Backquote' || code === 'KeyG') {
    renderer.debug = !renderer.debug;
    $('debug').hidden = !renderer.debug;
  } else if (code === 'KeyM') {
    sfx.muted = !sfx.muted;
    $('mute').setAttribute('aria-pressed', String(sfx.muted));
  } else if (code === 'KeyR' && mode === 'play') start();
});
input.on('touch', () => {
  sfx.unlock();
  if (mode === 'title' || (mode === 'over' && performance.now() - overAt > 700)) start();
});

$('seed').value = seed;
$('start').addEventListener('click', start);
$('again').addEventListener('click', start);
$('fresh').addEventListener('click', () => { $('seed').value = randomSeed(); start(); });
$('reseed').addEventListener('click', () => { $('seed').value = randomSeed(); if (mode !== 'title') start(); });
$('resume').addEventListener('click', () => setMode('play'));
$('mute').addEventListener('click', () => {
  sfx.unlock();
  sfx.muted = !sfx.muted;
  $('mute').setAttribute('aria-pressed', String(sfx.muted));
});
$('seed').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); start(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') setMode('paused'); });

renderCarts();
restoreSkin();
toTitle();
requestAnimationFrame(tick);

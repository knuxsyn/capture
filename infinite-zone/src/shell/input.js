// Keyboard, gamepad and touch merged into one held-state snapshot.
// A jump press between frames is latched so short taps are never lost.

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', KeyX: 'jump', KeyC: 'jump', KeyJ: 'jump', KeyK: 'jump', Space: 'jump',
};

export class Input {
  constructor() {
    this.keys = {};
    this.touch = {};
    this.latch = false;
    this.handlers = {};
  }

  on(name, fn) { this.handlers[name] = fn; }

  bind(win, pad) {
    win.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = KEYS[e.code];
      if (k) {
        e.preventDefault();
        if (k === 'jump' && !this.keys.jump) this.latch = true;
        this.keys[k] = true;
      }
      if (!e.repeat) this.handlers.key?.(e.code);
    });
    win.addEventListener('keyup', (e) => {
      const k = KEYS[e.code];
      if (k) this.keys[k] = false;
    });
    win.addEventListener('blur', () => { this.keys = {}; this.touch = {}; });

    if (!pad) return;
    for (const btn of pad.querySelectorAll('[data-key]')) {
      const k = btn.dataset.key;
      const down = (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        if (k === 'jump' && !this.touch.jump) this.latch = true;
        this.touch[k] = true;
        btn.classList.add('on');
        this.handlers.touch?.();
      };
      const up = () => { this.touch[k] = false; btn.classList.remove('on'); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
    }
  }

  read() {
    const s = { left: false, right: false, up: false, down: false, jump: false };
    for (const src of [this.keys, this.touch]) for (const k in s) s[k] ||= !!src[k];
    let pads = [];
    try { pads = navigator.getGamepads?.() ?? []; } catch { /* blocked by permissions policy */ }
    for (const g of pads) {
      if (!g) continue;
      const b = (i) => !!g.buttons[i]?.pressed;
      s.left ||= b(14) || g.axes[0] < -0.4;
      s.right ||= b(15) || g.axes[0] > 0.4;
      s.up ||= b(12) || g.axes[1] < -0.6;
      s.down ||= b(13) || g.axes[1] > 0.6;
      s.jump ||= b(0) || b(1) || b(2) || b(3);
      s.start ||= b(9);
    }
    s.jump ||= this.latch;
    this.latch = false;
    return s;
  }
}

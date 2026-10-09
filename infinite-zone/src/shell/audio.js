// Tiny synth for sound effects. No samples; every sound is a few
// oscillators or a noise burst. Audio starts on the first user gesture.

export class Sfx {
  constructor() {
    this.ac = null;
    this.muted = false;
    this.pan = 1;
  }

  unlock() {
    try {
      if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ac.state === 'suspended') this.ac.resume();
    } catch {
      this.ac = null;
    }
  }

  tone(type, f0, f1, dur, vol = 0.08, delay = 0, pan = 0) {
    const ac = this.ac, t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (pan && ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    o.connect(g);
    out.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.06, f = 1200) {
    const ac = this.ac, n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), filt = ac.createBiquadFilter(), g = ac.createGain();
    filt.type = 'bandpass';
    filt.frequency.value = f;
    g.gain.value = vol;
    s.buffer = buf;
    s.connect(filt).connect(g).connect(ac.destination);
    s.start();
  }

  play(name, core) {
    if (this.muted || !this.ac || this.ac.state !== 'running') return;
    switch (name) {
      case 'jump': this.tone('square', 260, 720, 0.16, 0.04); break;
      case 'ring':
        this.pan = -this.pan;
        this.tone('sine', 1568, 1568, 0.07, 0.07, 0, this.pan * 0.6);
        this.tone('sine', 2093, 2093, 0.18, 0.06, 0.06, this.pan * 0.6);
        break;
      case 'spring': this.tone('triangle', 220, 990, 0.28, 0.09); break;
      case 'rev': this.tone('sawtooth', 300 + (core?.player.rev ?? 0) * 70, 900, 0.18, 0.035); break;
      case 'dash': this.noise(0.25, 0.08, 900); this.tone('square', 180, 90, 0.2, 0.03); break;
      case 'roll': this.noise(0.12, 0.05, 2400); break;
      case 'pop': this.noise(0.2, 0.09, 600); this.tone('square', 420, 140, 0.18, 0.035); break;
      case 'hurt': this.tone('sawtooth', 520, 110, 0.4, 0.05); this.noise(0.3, 0.05, 1800); break;
      case 'die': this.tone('square', 660, 70, 0.8, 0.05); break;
      case 'post': [784, 988, 1175].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.06, i * 0.07)); break;
      case 'life': [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.12, 0.04, i * 0.09)); break;
      case 'zone': [392, 523, 659, 784].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.05, i * 0.11)); break;
      case 'over': [392, 330, 262, 196].forEach((f, i) => this.tone('triangle', f, f, 0.3, 0.05, i * 0.18)); break;
      default: break;
    }
  }

  handle(events, core) {
    for (const e of events) this.play(e, core);
  }
}

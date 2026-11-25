/* Sizzle & Serve v2 — every sound is synthesized with WebAudio.
   No audio files are loaded, so the game stays silent on disk and
   still sizzles in the browser. Sounds start only after the
   player's first gesture, as browsers require. */

/** A tiny synthesizer for game feedback sounds. */
export class SoundBoard {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
  }

  /** Create the audio context on the first user gesture. */
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
    } catch {
      this.context = null;
    }
  }

  /** One short tone: frequency, seconds, waveform, and slide. */
  tone(freq, seconds, type = 'sine', slideTo = null, when = 0) {
    if (!this.context || !this.enabled) return;
    const t0 = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(1, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  /** A burst of filtered noise: the sizzle when food lands. */
  sizzle(seconds = 0.18) {
    if (!this.context || !this.enabled) return;
    const t0 = this.context.currentTime;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.8;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  /** An ingredient lands on the plate. */
  add() {
    this.tone(520, 0.09, 'triangle', 760);
    this.sizzle(0.12);
  }

  /** One knife chop on the board: a short wooden knock. */
  chop() {
    this.tone(220, 0.06, 'square', 140);
    this.tone(440, 0.05, 'triangle', 660, 0.02);
  }

  /** Something hits the frying pan: a long sizzle. */
  fry() {
    this.sizzle(0.5);
    this.tone(300, 0.2, 'sawtooth', 180);
  }

  /** A fried item is ready: a bright ding. */
  ready() {
    this.tone(1046, 0.12, 'sine');
    this.tone(1318, 0.14, 'sine', null, 0.08);
  }

  /** Something burned on the stove: a low thud. */
  burn() {
    this.tone(140, 0.35, 'sawtooth', 70);
  }

  /** A rush order lands: two urgent pings. */
  rush() {
    this.tone(1174, 0.09, 'square');
    this.tone(1174, 0.09, 'square', null, 0.12);
  }

  /** A dish is served: two bright dings. */
  serve() {
    this.tone(880, 0.12, 'sine');
    this.tone(1318, 0.18, 'sine', null, 0.09);
  }

  /** The plate does not match any order. */
  wrong() {
    this.tone(180, 0.22, 'sawtooth', 120);
  }

  /** An order's timer runs out. */
  expire() {
    this.tone(320, 0.3, 'square', 140);
    this.tone(210, 0.4, 'square', 110, 0.12);
  }

  /** A new order ticket appears. */
  order() {
    this.tone(660, 0.08, 'triangle');
    this.tone(990, 0.1, 'triangle', null, 0.07);
  }

  /** The player levels up: a rising arpeggio. */
  levelUp() {
    [523, 659, 784, 1046].forEach((freq, i) => this.tone(freq, 0.14, 'triangle', null, i * 0.08));
  }

  /** The shift ends. */
  shiftEnd() {
    [392, 523, 659].forEach((freq, i) => this.tone(freq, 0.25, 'sine', null, i * 0.14));
  }
}

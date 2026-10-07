// dragonBallAudio.ts
// Web Audio API procedural audio synthesizer for Dragon Ball sound effects.
// Zero external assets required, immediate response, fully offline compatible.

class DragonBallAudioController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('db_audio_muted') === 'true';
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('db_audio_muted', muted ? 'true' : 'false');
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Bulma's iconic Dragon Radar double beep (high pitch crisp pip-pip)
   */
  public playRadarBeep() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const playPip = (delay: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.09);
    };

    playPip(0, 1860);
    playPip(0.1, 2340);
  }

  /**
   * Shimmering mystical Ki resonance when a Dragon Ball is gathered
   */
  public playBallCollect(ballNumber: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Pentatonic scale base frequencies for each of the 7 balls
    const freqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];
    const baseFreq = freqs[(ballNumber - 1) % freqs.length];

    // Dual chime with slight detuning for glass shimmer
    [-3, 4].forEach((detune) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.detune.setValueAtTime(detune * 10, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  /**
   * Ominous sky darkens rumble with distant thunder
   */
  public playSkyDarkensRumble() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub-bass drone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 2.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.linearRampToValueAtTime(60, now + 2.5);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 3.2);

    // Filtered pink noise wind
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 2.5);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.96 * b1 + white * 0.11;
        b2 = 0.86 * b2 + white * 0.25;
        output[i] = (b0 + b1 + b2) * 0.3;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(250, now);
      noiseFilter.Q.setValueAtTime(1.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.8);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 2.6);
    } catch {
      // Fallback
    }
  }

  /**
   * Powerful anime lightning strike & thunderclap
   */
  public playThunder() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Transient crack (high-pass white noise spike)
    try {
      const burstSize = Math.floor(ctx.sampleRate * 0.06);
      const burstBuffer = ctx.createBuffer(1, burstSize, ctx.sampleRate);
      const burstData = burstBuffer.getChannelData(0);
      for (let i = 0; i < burstSize; i++) {
        burstData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (burstSize * 0.15));
      }

      const crack = ctx.createBufferSource();
      crack.buffer = burstBuffer;
      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.4, now);
      crack.connect(crackGain);
      crackGain.connect(ctx.destination);
      crack.start(now);
    } catch {}

    // Low boom & rumble
    try {
      const rumbleSize = Math.floor(ctx.sampleRate * 1.6);
      const rumbleBuffer = ctx.createBuffer(1, rumbleSize, ctx.sampleRate);
      const rumbleData = rumbleBuffer.getChannelData(0);
      for (let i = 0; i < rumbleSize; i++) {
        rumbleData[i] = (Math.random() * 2 - 1) * (1 - i / rumbleSize);
      }

      const rumble = ctx.createBufferSource();
      rumble.buffer = rumbleBuffer;

      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(220, now);
      rumbleFilter.frequency.exponentialRampToValueAtTime(40, now + 1.5);

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.35, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      rumble.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(ctx.destination);

      rumble.start(now);
    } catch {}
  }

  /**
   * Shenron's divine emergence / dragon resonance roar
   */
  public playShenronRoar() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic multi-oscillator roar
    const freqs = [70, 105, 140, 210];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.75, now + 1.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.linearRampToValueAtTime(150, now + 1.8);

      const maxGain = 0.18 / (idx + 1);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.1);
    });

    // Sub-bass impact
    this.playThunder();
  }

  /**
   * Colossal dragon flight whoosh through storm clouds
   */
  public playDragonFlightWhoosh() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const bufferSize = Math.floor(ctx.sampleRate * 1.3);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(140, now);
      filter.frequency.exponentialRampToValueAtTime(700, now + 0.5);
      filter.frequency.exponentialRampToValueAtTime(180, now + 1.2);
      filter.Q.setValueAtTime(2.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 1.3);
    } catch {}
  }

  /**
   * Divine hum as Shenron slowly descends and hovers
   */
  public playDragonDescendHum() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [55, 110, 165].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 2.0);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.3);
    });
  }

  /**
   * Golden Ki Pillar / Blinding light flare
   */
  public playKiPillar() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  /**
   * Triumphant chord when the wish is granted by Shenron
   */
  public playWishGranted() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Divine chord: C major 9 (C4, E4, G4, B4, D5)
    const chord = [261.63, 329.63, 392.00, 493.88, 587.33];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(0.001, now + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.04 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + 2.4);
    });

    // Eye flare red thunder
    this.playThunder();
  }

  /**
   * Dragon Balls turning into stone & scattering across the earth
   */
  public playBallsScatter() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 7 high-speed whooshes soaring into the distance
    for (let i = 0; i < 7; i++) {
      const delay = i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + i * 80, now + delay);
      osc.frequency.exponentialRampToValueAtTime(2200 + i * 150, now + delay + 0.5);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.14, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.65);
    }
  }
}

export const dragonBallAudio = new DragonBallAudioController();

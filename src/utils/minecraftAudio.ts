// minecraftAudio.ts
// Web Audio API synthesizer for authentic Minecraft-themed sound effects.
// Completely offline, zero external dependencies, immediate response.

class MinecraftAudioController {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
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
   * Block placement sound: rapid click with muffled thud matching Minecraft block place.
   */
  public playBlockPlace(type: 'wood' | 'stone' | 'grass' | 'dirt' | 'ore' = 'stone') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      // 1. Transient noise click
      const bufferSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();

      if (type === 'wood') {
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.Q.setValueAtTime(1.5, now);
      } else if (type === 'grass' || type === 'dirt') {
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(600, now);
      } else if (type === 'ore') {
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
      } else {
        // stone
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1400, now);
        noiseFilter.Q.setValueAtTime(2.0, now);
      }

      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      // 2. Low thump tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      const startFreq = type === 'wood' ? 140 : type === 'ore' ? 320 : 180;
      const endFreq = type === 'wood' ? 60 : type === 'ore' ? 120 : 70;

      osc.type = type === 'ore' ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.07);

      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);

      // 3. Extra metallic ring for ores
      if (type === 'ore') {
        const ring = ctx.createOscillator();
        const ringGain = ctx.createGain();
        ring.type = 'sine';
        ring.frequency.setValueAtTime(1800, now);
        ring.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
        ringGain.gain.setValueAtTime(0.2, now);
        ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        ring.connect(ringGain);
        ringGain.connect(ctx.destination);
        ring.start(now);
        ring.stop(now + 0.12);
      }
    } catch {
      // Audio autoplay restriction or disabled
    }
  }

  /**
   * Pickaxe swing swoosh sound.
   */
  public playPickaxeSwing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.1);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      filter.Q.setValueAtTime(3, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.1);
    } catch {
      // fallback
    }
  }

  /**
   * Classic ascending XP orb chime: high bright ping.
   */
  public playXpOrb(pitchIndex = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      // Pentatonic / ascending pitches: C6, D6, E6, G6, A6, C7
      const pitches = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
      const freq = pitches[pitchIndex % pitches.length];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.18);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // fallback
    }
  }

  /**
   * Achievement / Challenge complete fanfare chords.
   */
  public playAchievementFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      // 3 progressive triumphant chords:
      // Chord 1 (0.0s): G major (G4, B4, D5)
      // Chord 2 (0.2s): C major (C5, E5, G5)
      // Chord 3 (0.4s): High D major / triumph (D5, F#5, A5, D6)
      const playChord = (time: number, freqs: number[], duration: number) => {
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, time);

          gain.gain.setValueAtTime(0.18 / freqs.length, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(time);
          osc.stop(time + duration);
        });
      };

      playChord(now, [392.0, 493.88, 587.33], 0.25);
      playChord(now + 0.2, [523.25, 659.25, 783.99], 0.25);
      playChord(now + 0.42, [587.33, 739.99, 880.0, 1174.66], 0.7);
    } catch {
      // fallback
    }
  }

  /**
   * Authentic Minecraft Stone Button click.
   */
  public playButtonClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // fallback
    }
  }
}

export const minecraftAudio = new MinecraftAudioController();

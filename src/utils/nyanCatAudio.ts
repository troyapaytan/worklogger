// nyanCatAudio.ts
// Official Nyan Cat MP3 player ("Nyan Cat [original].mp3") & Web Audio sound effects.

class NyanCatAudioController {
  private audioEl: HTMLAudioElement | null = null;
  private fadeAnimId: number | null = null;
  private isPlaying = false;
  private ctx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    if (this.audioEl) return;
    try {
      this.audioEl = new Audio('/nyan_cat_theme.mp3');
      this.audioEl.preload = 'auto';
      this.audioEl.loop = true;
    } catch (e) {
      console.warn('Failed to initialize Nyan Cat audio element:', e);
    }
  }

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
   * Plays the canonical Nyan Cat MP3 starting at the given time (in seconds).
   * Default starts at 0.0s for full intro.
   */
  public playNyanSong(startTime = 0, volume = 0.5): Promise<void> {
    this.initAudio();
    if (!this.audioEl) return Promise.resolve();

    if (this.fadeAnimId !== null) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }

    try {
      this.audioEl.currentTime = startTime;
    } catch {}

    this.audioEl.volume = volume;
    this.isPlaying = true;

    const playPromise = this.audioEl.play();
    if (playPromise !== undefined) {
      return playPromise.catch((err) => {
        console.warn('Autoplay prevented or audio play error:', err);
        // Set up one-time user interaction listener to start music if autoplay was blocked
        const onFirstInteract = () => {
          if (this.isPlaying && this.audioEl && this.audioEl.paused) {
            this.audioEl.play().catch(() => {});
          }
          window.removeEventListener('pointerdown', onFirstInteract);
          window.removeEventListener('keydown', onFirstInteract);
        };
        window.addEventListener('pointerdown', onFirstInteract);
        window.addEventListener('keydown', onFirstInteract);
      });
    }
    return Promise.resolve();
  }

  /**
   * Returns the current playback time of the song in seconds.
   */
  public getCurrentTime(): number {
    return this.audioEl ? this.audioEl.currentTime : 0;
  }

  /**
   * Returns whether the song is currently actively playing.
   */
  public isSongPlaying(): boolean {
    return this.isPlaying && !!this.audioEl && !this.audioEl.paused;
  }

  /**
   * Stops the Nyan Cat theme song with a smooth, clean fade-out ("as it disappears so does the music").
   */
  public stopNyanSong(fadeMs = 180) {
    if (!this.audioEl || !this.isPlaying) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = false;
    if (this.fadeAnimId !== null) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }

    const audio = this.audioEl;
    const startVol = audio.volume;
    const startTime = performance.now();

    const fadeStep = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      if (elapsed >= fadeMs) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = startVol;
        this.fadeAnimId = null;
      } else {
        const factor = 1 - elapsed / fadeMs;
        audio.volume = Math.max(0, startVol * factor);
        this.fadeAnimId = requestAnimationFrame(fadeStep);
      }
    };

    this.fadeAnimId = requestAnimationFrame(fadeStep);
  }

  /**
   * Rainbow sparkle: bright 8-bit arpeggio burst when a worklog block appears.
   */
  public playRainbowSparkle(pitch = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
      const baseNote = notes[pitch % notes.length];

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(baseNote, now);
      osc.frequency.exponentialRampToValueAtTime(baseNote * 1.5, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(baseNote * 0.8, now + 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  /**
   * Nyan meow: cute 8-bit "nyaa~" sound for achievement.
   */
  public playNyanMeow() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.08);
      osc.frequency.linearRampToValueAtTime(750, now + 0.2);
      osc.frequency.linearRampToValueAtTime(500, now + 0.35);

      const vibrato = ctx.createOscillator();
      vibrato.type = 'sine';
      vibrato.frequency.setValueAtTime(30, now);
      const vibratoGain = ctx.createGain();
      vibratoGain.gain.setValueAtTime(25, now);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      vibrato.start(now);
      vibrato.stop(now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch {}
  }

  /**
   * Achievement fanfare: classic chiptune victory melody.
   */
  public playAchievementFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const melody = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.08 },
        { freq: 783.99, time: 0.16 },
        { freq: 1046.5, time: 0.24 },
        { freq: 1318.5, time: 0.36 },
      ];

      melody.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.09, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + 0.18);
      });

      const bassOsc = ctx.createOscillator();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(150, now + 0.36);
      bassOsc.frequency.exponentialRampToValueAtTime(60, now + 0.56);

      const bassGain = ctx.createGain();
      bassGain.gain.setValueAtTime(0.18, now + 0.36);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.56);

      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now + 0.36);
      bassOsc.stop(now + 0.56);
    } catch {}
  }

  /**
   * Star collect sound — bright rising chime.
   */
  public playStarCollect(index = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const freq = 880 + index * 220;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  /**
   * Button click sound.
   */
  public playButtonClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }
}

export const nyanCatAudio = new NyanCatAudioController();

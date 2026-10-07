// sfwAudio.ts
// Plays the actual audio file /sfw-intro.mp3 with automatic fallback to Web Audio synthesis if offline or blocked.

export function playSfwIntroAudio() {
  try {
    const audio = new Audio('/sfw-intro.mp3');
    audio.volume = 0.9;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to Web Audio synthesizer if HTML5 audio fails
        playSfwIntroSynthesizer();
      });
    }
  } catch {
    playSfwIntroSynthesizer();
  }
}

export function playSfwIntroSynthesizer() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const playTom = (time: number, freqStart: number, freqEnd: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqStart, time);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, time + duration);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    };

    const playSnare = (time: number, duration: number, gainVal: number) => {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(1000, time);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(gainVal, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(60, time + duration * 0.5);

      oscGain.gain.setValueAtTime(gainVal * 0.8, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      noise.start(time);
      noise.stop(time + duration);
      osc.start(time);
      osc.stop(time + duration * 0.5);
    };

    const playCymbal = (time: number, duration: number, gainVal: number) => {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(8000, time);
      filter.Q.setValueAtTime(2, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(time);
      noise.stop(time + duration);
    };

    playTom(now + 0.15, 150, 45, 0.18, 0.7);
    playTom(now + 0.45, 180, 60, 0.16, 0.65);
    playSnare(now + 0.75, 0.25, 0.85);
    playTom(now + 0.95, 140, 35, 0.35, 0.9);
    playSnare(now + 0.95, 0.3, 0.7);
    playCymbal(now + 0.95, 0.9, 0.6);
  } catch {
    // Silent fallback
  }
}

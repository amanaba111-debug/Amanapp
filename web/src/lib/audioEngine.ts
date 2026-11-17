import type { SoundTheme } from '../types';

/**
 * Zero-dependency offline Web Audio synthesis engine for MindLoop:
 * - Calm soundscapes: Rain, Forest, Café (continuous seamless generative audio)
 * - 4-7-8 breathing bowl tones (inhale, hold, exhale, completion)
 * - Evening Body-Scan restorative drone + zone transition bells + live waveform analyser
 * - Optional calm offline speech guidance
 */
class MindLoopAudioEngine {
  private ctx: AudioContext | null = null;
  private ambientMaster: GainNode | null = null;
  private ambientStopFns: Array<() => void> = [];
  private activeTheme: SoundTheme | null = null;

  private scanMaster: GainNode | null = null;
  private scanAnalyser: AnalyserNode | null = null;
  private scanStopFns: Array<() => void> = [];

  private volume = 0.55;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, kind: 'pink' | 'brown', seconds = 4): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const out = buffer.getChannelData(ch);
      if (kind === 'pink') {
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
          b6 = white * 0.115926;
        }
      } else {
        let last = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          out[i] = last * 1.4;
        }
      }
    }
    return buffer;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.ambientMaster) {
      this.ambientMaster.gain.setTargetAtTime(this.volume * 0.42, this.ctx.currentTime, 0.12);
    }
    if (this.ctx && this.scanMaster) {
      this.scanMaster.gain.setTargetAtTime(this.volume * 0.45, this.ctx.currentTime, 0.15);
    }
  }

  getActiveSoundscape(): SoundTheme | null {
    return this.activeTheme;
  }

  startSoundscape(theme: SoundTheme, volume?: number): void {
    if (volume !== undefined) this.volume = Math.max(0, Math.min(1, volume));
    if (this.activeTheme === theme && this.ambientMaster) {
      this.setVolume(this.volume);
      return;
    }
    this.stopSoundscape();
    const ctx = this.ensureContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.volume * 0.42),
      ctx.currentTime + 0.8
    );
    master.connect(ctx.destination);
    this.ambientMaster = master;
    this.activeTheme = theme;

    const stops: Array<() => void> = [];

    if (theme === 'rain') {
      // Layer 1: Warm steady rainfall (pink noise through lowpass + gentle wind LFO)
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'pink', 5);
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1450;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 280;
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      src.connect(lp);
      lp.connect(master);
      src.start();
      lfo.start();

      // Layer 2: Distant thunder/roof warmth (brown noise)
      const warm = ctx.createBufferSource();
      warm.buffer = this.createNoiseBuffer(ctx, 'brown', 5);
      warm.loop = true;
      const warmLp = ctx.createBiquadFilter();
      warmLp.type = 'lowpass';
      warmLp.frequency.value = 220;
      const warmGain = ctx.createGain();
      warmGain.gain.value = 0.55;
      warm.connect(warmLp);
      warmLp.connect(warmGain);
      warmGain.connect(master);
      warm.start();

      // Layer 3: Soft windowpane droplets
      const dropTimer = window.setInterval(() => {
        if (!this.ctx || !this.ambientMaster) return;
        if (Math.random() > 0.62) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        const base = 950 + Math.random() * 900;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 0.65, now + 0.055);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.022 + Math.random() * 0.018, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        osc.connect(g);
        g.connect(this.ambientMaster);
        osc.start(now);
        osc.stop(now + 0.08);
      }, 280);

      stops.push(() => {
        window.clearInterval(dropTimer);
        try {
          src.stop();
          lfo.stop();
          warm.stop();
        } catch {}
      });
    } else if (theme === 'forest') {
      // Layer 1: Leaf canopy breeze (bandpass pink noise with slow swell)
      const wind = ctx.createBufferSource();
      wind.buffer = this.createNoiseBuffer(ctx, 'pink', 5);
      wind.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 540;
      bp.Q.value = 0.65;
      const windLfo = ctx.createOscillator();
      windLfo.frequency.value = 0.12;
      const windLfoGain = ctx.createGain();
      windLfoGain.gain.value = 210;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(bp.frequency);
      const windGain = ctx.createGain();
      windGain.gain.value = 0.72;
      wind.connect(bp);
      bp.connect(windGain);
      windGain.connect(master);
      wind.start();
      windLfo.start();

      // Layer 2: Soft mossy earth harmonic bed
      const pad = ctx.createOscillator();
      pad.type = 'sine';
      pad.frequency.value = 174; // gentle grounding tone
      const padGain = ctx.createGain();
      padGain.gain.value = 0.05;
      pad.connect(padGain);
      padGain.connect(master);
      pad.start();

      // Layer 3: Occasional soft woodland birdsong notes (pentatonic)
      const notes = [1568, 1760, 1975.5, 2349.3, 2637];
      const birdTimer = window.setInterval(() => {
        if (!this.ctx || !this.ambientMaster) return;
        if (Math.random() > 0.36) return;
        const now = this.ctx.currentTime;
        const f1 = notes[Math.floor(Math.random() * notes.length)];
        const f2 = notes[Math.floor(Math.random() * notes.length)];
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f1, now);
        osc.frequency.exponentialRampToValueAtTime(f2, now + 0.14);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.024, now + 0.035);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(g);
        g.connect(this.ambientMaster);
        osc.start(now);
        osc.stop(now + 0.24);
      }, 1700);

      stops.push(() => {
        window.clearInterval(birdTimer);
        try {
          wind.stop();
          windLfo.stop();
          pad.stop();
        } catch {}
      });
    } else {
      // Café: Warm espresso-bar room murmur + soft mellow chord warmth + tiny ceramic clinks
      const room = ctx.createBufferSource();
      room.buffer = this.createNoiseBuffer(ctx, 'brown', 5);
      room.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 460;
      const roomGain = ctx.createGain();
      roomGain.gain.value = 0.72;
      room.connect(lp);
      lp.connect(roomGain);
      roomGain.connect(master);
      room.start();

      const murmur = ctx.createBufferSource();
      murmur.buffer = this.createNoiseBuffer(ctx, 'pink', 5);
      murmur.loop = true;
      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.value = 380;
      formant.Q.value = 1.4;
      const murmurGain = ctx.createGain();
      murmurGain.gain.value = 0.42;
      murmur.connect(formant);
      formant.connect(murmurGain);
      murmurGain.connect(master);
      murmur.start();

      // Subtle lo-fi electric piano warmth (Fmaj7 low voicing)
      const chordFreqs = [174.61, 220, 261.63, 329.63];
      const chordOscs = chordFreqs.map((f) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.022;
        o.connect(g);
        g.connect(master);
        o.start();
        return o;
      });

      stops.push(() => {
        try {
          room.stop();
          murmur.stop();
          chordOscs.forEach((o) => o.stop());
        } catch {}
      });
    }

    this.ambientStopFns = stops;
  }

  stopSoundscape(): void {
    const fns = this.ambientStopFns;
    this.ambientStopFns = [];
    this.activeTheme = null;
    if (this.ctx && this.ambientMaster) {
      const m = this.ambientMaster;
      this.ambientMaster = null;
      const now = this.ctx.currentTime;
      m.gain.cancelScheduledValues(now);
      m.gain.setTargetAtTime(0.0001, now, 0.08);
      window.setTimeout(() => {
        fns.forEach((fn) => fn());
        try {
          m.disconnect();
        } catch {}
      }, 260);
    } else {
      fns.forEach((fn) => fn());
    }
  }

  /**
   * Gentle singing-bowl phase cues for 4-7-8 breathing & 5-breath morning primer.
   */
  playBreathCue(phase: 'inhale' | 'hold' | 'exhale' | 'complete'): void {
    if (this.volume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (phase === 'complete') {
      [261.63, 329.63, 392.0, 493.88].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        g.gain.setValueAtTime(0.0001, now + idx * 0.09);
        g.gain.exponentialRampToValueAtTime(0.08 * this.volume, now + idx * 0.09 + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 1.4);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 1.45);
      });
      return;
    }

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';

    if (phase === 'inhale') {
      osc.frequency.setValueAtTime(261.63, now);
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.55);
    } else if (phase === 'hold') {
      osc.frequency.setValueAtTime(392.0, now);
    } else {
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.exponentialRampToValueAtTime(220.0, now + 0.75);
    }

    const peak = (phase === 'hold' ? 0.055 : 0.08) * this.volume;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  /**
   * Subtle crisp water-drop chime when logging a glass of water.
   */
  playWaterDrop(): void {
    if (this.volume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.09);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.07 * this.volume, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Evening Body-Scan restorative sound bed + real-time AnalyserNode for gentle waveform visualization.
   */
  startBodyScanAudio(): AnalyserNode | null {
    this.stopBodyScanAudio();
    this.stopSoundscape();
    const ctx = this.ensureContext();
    if (!ctx) return null;

    const master = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.88;

    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.volume * 0.45),
      ctx.currentTime + 1.4
    );

    master.connect(analyser);
    analyser.connect(ctx.destination);
    this.scanMaster = master;
    this.scanAnalyser = analyser;

    // Warm sleep-inducing harmonic sanctuary (A2=110, E3=164.81, A3=220, gentle 113.5Hz slow delta drift)
    const freqs = [110, 113.5, 164.81, 220, 277.18];
    const gains = [0.22, 0.14, 0.14, 0.09, 0.045];
    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = gains[i];

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.017;
      const lfoG = ctx.createGain();
      lfoG.gain.value = gains[i] * 0.35;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);

      o.connect(g);
      g.connect(master);
      o.start();
      lfo.start();
      return { o, lfo };
    });

    // Soft ocean-like breath undertone
    const breathNoise = ctx.createBufferSource();
    breathNoise.buffer = this.createNoiseBuffer(ctx, 'brown', 5);
    breathNoise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    const ng = ctx.createGain();
    ng.gain.value = 0.24;
    breathNoise.connect(lp);
    lp.connect(ng);
    ng.connect(master);
    breathNoise.start();

    this.scanStopFns = [
      () => {
        try {
          breathNoise.stop();
          oscs.forEach(({ o, lfo }) => {
            o.stop();
            lfo.stop();
          });
        } catch {}
      },
    ];

    return analyser;
  }

  setBodyScanFadeFactor(factor: number): void {
    if (!this.ctx || !this.scanMaster) return;
    const clamped = Math.max(0.0005, Math.min(1, factor));
    this.scanMaster.gain.setTargetAtTime(
      Math.max(0.0005, this.volume * 0.45 * clamped),
      this.ctx.currentTime,
      0.25
    );
  }

  playBodyScanZoneBell(): void {
    if (!this.ctx || !this.scanMaster) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.075, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(g);
    g.connect(this.scanMaster);
    osc.start(now);
    osc.stop(now + 2.5);
  }

  speakCalmPrompt(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.82;
      utter.pitch = 0.92;
      utter.volume = Math.min(0.85, this.volume);
      window.speechSynthesis.speak(utter);
    } catch {
      // Gracefully ignore when speech synthesis isn't installed on device
    }
  }

  stopBodyScanAudio(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    const fns = this.scanStopFns;
    this.scanStopFns = [];
    this.scanAnalyser = null;
    if (this.ctx && this.scanMaster) {
      const m = this.scanMaster;
      this.scanMaster = null;
      const now = this.ctx.currentTime;
      m.gain.cancelScheduledValues(now);
      m.gain.setTargetAtTime(0.0001, now, 0.12);
      window.setTimeout(() => {
        fns.forEach((fn) => fn());
        try {
          m.disconnect();
        } catch {}
      }, 320);
    } else {
      fns.forEach((fn) => fn());
    }
  }

  getScanAnalyser(): AnalyserNode | null {
    return this.scanAnalyser;
  }

  stopAll(): void {
    this.stopSoundscape();
    this.stopBodyScanAudio();
  }
}

export const audioEngine = new MindLoopAudioEngine();

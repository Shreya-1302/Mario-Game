// Web Audio API Procedural Retro Synthesizer
// Provides 100% offline, zero-dependency 8-bit game audio and background music loops.

class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmInterval = null;
    this.bgmStep = 0;
    this.bgmPlaying = false;

    // Classic game BGM melody loop notes (in Hz)
    this.bgmSequence = [
      659.25, 659.25, 0, 659.25, 0, 523.25, 659.25, 0, 
      783.99, 0, 0, 0, 392.00, 0, 0, 0,
      523.25, 0, 0, 392.00, 0, 0, 329.63, 0, 
      0, 440.00, 0, 493.88, 0, 466.16, 440.00, 0,
      392.00, 659.25, 783.99, 880.00, 0, 698.46, 783.99, 0, 
      659.25, 0, 523.25, 587.33, 493.88, 0, 0, 0
    ];
    this.bgmTempo = 130; // Milliseconds per 16th note step
  }

  // Lazy initialize AudioContext on first user interaction to satisfy browser policies
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, volume = 0.1, delay = 0) {
    this.init();
    if (freq <= 0) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
      // Exponential decay envelope
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      console.warn('Audio playTone failed:', e);
    }
  }

  playJump() {
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      // Sweep pitch upwards rapidly
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.16);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('Audio playJump failed:', e);
    }
  }

  playCoin() {
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Coin is two high notes in sequence (B5 -> E6)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.setValueAtTime(0.08, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {
      console.warn('Audio playCoin failed:', e);
    }
  }

  playStomp() {
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Stomp is a low-frequency square wave drop
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(20, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio playStomp failed:', e);
    }
  }

  playDie() {
    this.stopBGM();
    this.init();
    try {
      const now = this.ctx.currentTime;
      // Sad descending arpeggio sequence
      const notes = [493.88, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63];
      
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.18);
      });
    } catch (e) {
      console.warn('Audio playDie failed:', e);
    }
  }

  playComplete() {
    this.stopBGM();
    this.init();
    try {
      const now = this.ctx.currentTime;
      // Victory fanfare notes: C5, E5, G5, C6, E6, G6, C7
      const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
      
      fanfare.forEach((freq, idx) => {
        const time = now + idx * 0.12;
        const duration = idx === fanfare.length - 1 ? 0.7 : 0.15;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + duration);
      });
    } catch (e) {
      console.warn('Audio playComplete failed:', e);
    }
  }

  startBGM() {
    if (this.bgmPlaying) return;
    this.init();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    const playNextStep = () => {
      if (!this.bgmPlaying) return;
      const freq = this.bgmSequence[this.bgmStep];
      
      if (freq > 0) {
        // Soft background square wave sound
        this.playTone(freq, 'square', (this.bgmTempo / 1000) * 0.8, 0.015, 0);
      }

      this.bgmStep = (this.bgmStep + 1) % this.bgmSequence.length;
      this.bgmInterval = setTimeout(playNextStep, this.bgmTempo);
    };

    playNextStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearTimeout(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

const soundManager = new SoundManager();
export default soundManager;

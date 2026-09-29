/**
 * Synthesizes pure Web Audio API sound effects and triggers gentle haptics.
 * 100% offline, zero external asset dependencies.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('mcg_sound_enabled', enabled ? 'true' : 'false');
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mcg_sound_enabled');
    if (saved !== null) {
      soundEnabled = saved === 'true';
    }
  }
  return soundEnabled;
}

export function triggerHaptic(pattern: number | number[] = 15): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator && soundEnabled) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors if unsupported
    }
  }
}

/**
 * Shuffle sound: realistic card riffle flutter effect (4–5 second sustained rhythm)
 */
export function playShuffleSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // 4-5 seconds realistic card riffle flutter sequence
  const riffleWaves = 4;
  for (let wave = 0; wave < riffleWaves; wave++) {
    const waveStart = now + wave * 0.95;
    const flutterCount = 22;
    for (let i = 0; i < flutterCount; i++) {
      const time = waveStart + i * 0.038;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550 + Math.random() * 500, time);
      filter.Q.value = 4;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140 + Math.random() * 90, time);

      gain.gain.setValueAtTime(0.045, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.032);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.034);
    }
  }
}

/**
 * Single card deal flick/tick sound for 1-at-a-time dealing animation
 */
export function playCardDealFlickSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(580, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.036);
}

/**
 * Deal card sound
 */
export function playDealSound(): void {
  playCardDealFlickSound();
}

/**
 * Card play sound: satisfying felt snap
 */
export function playCardPlaySound(): void {
  triggerHaptic(12);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * Trick collection sound: smooth sliding sweep
 */
export function playTrickCollectSound(): void {
  triggerHaptic([10, 30, 10]);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(380, now + 0.12);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.14);
}

/**
 * Normal Call confirmation: clean metallic gold chime
 */
export function playCallConfirmSound(): void {
  triggerHaptic(20);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const frequencies = [587.33, 880]; // D5, A5 metallic chime

  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.04);

    gain.gain.setValueAtTime(0.1, now + idx * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.04);
    osc.stop(now + idx * 0.04 + 0.26);
  });
}

/**
 * Bumper Call 8 Festive / Shehnai-style Sound:
 * Reedy, expressive celebratory Indian classical fanfare with rich vibrato & sliding ornamentation.
 */
export function playBumperCallFestiveSound(): void {
  triggerHaptic([25, 40, 25, 40, 60]);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Celebratory Shehnai scale notes: C5 (523), D5 (587), E5 (659), G5 (783), A5 (880), C6 (1046)
  const melody = [
    { freq: 523.25, duration: 0.15, delay: 0.00 },
    { freq: 587.33, duration: 0.12, delay: 0.14 },
    { freq: 659.25, duration: 0.14, delay: 0.25 },
    { freq: 783.99, duration: 0.18, delay: 0.38 },
    { freq: 880.00, duration: 0.22, delay: 0.54 },
    { freq: 1046.50, duration: 0.45, delay: 0.74 },
  ];

  melody.forEach(note => {
    const start = now + note.delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Vibrato LFO for reedy shehnai timbre
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(6.5, start);
    lfoGain.gain.setValueAtTime(14, start);
    lfo.connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + note.duration);

    // Reedy shehnai bandpass resonance
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(note.freq * 1.8, start);
    filter.Q.value = 5.0;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(note.freq, start);
    // Expressive portamento slide
    osc.frequency.linearRampToValueAtTime(note.freq * 1.02, start + note.duration);

    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + note.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + note.duration + 0.02);
  });
}

/**
 * Winner fanfare: triumphant luxury gold chord progression
 */
export function playWinnerMusic(): void {
  triggerHaptic([30, 50, 30, 50, 80]);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [293.66, 369.99, 440.0, 587.33, 739.99];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);

    gain.gain.setValueAtTime(0.12, now + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.48);
  });
}

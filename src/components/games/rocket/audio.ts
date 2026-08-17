/**
 * Procedural sound effects for Rollin Rocket via the Web Audio API - same
 * approach as plinko/audio.ts and slots/audio.ts (no licensable sound asset
 * files exist in this repo, so everything is synthesized on the fly).
 * Kept as its own module (not shared with the other games' audio.ts files)
 * so a future music/ambience layer can be added here without touching
 * unrelated games, per the "separate the sound system" requirement.
 */

const MUTE_STORAGE_KEY = 'rocket_sound_muted';

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return null;
        audioCtx = new Ctor();
    }
    return audioCtx;
}

/** Must be called from within a user gesture handler to satisfy browser autoplay policy. */
export function unlockAudio() {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
}

export function isSoundMuted(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
}

/** Persists the preference - muting once keeps it muted across sessions until the player explicitly re-enables it. */
export function setSoundMuted(muted: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    if (muted) stopEngineLoop();
}

function tone(ctx: AudioContext, frequency: number, startTime: number, duration: number, gain: number, type: OscillatorType = 'sine') {
    if (isSoundMuted()) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

function noiseBurst(ctx: AudioContext, startTime: number, duration: number, gain: number, lowpassHz = 2200) {
    if (isSoundMuted()) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassHz, startTime);
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(startTime);
    source.stop(startTime + duration + 0.02);
}

export function playCountdownTick() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 720, ctx.currentTime, 0.09, 0.07, 'square');
}

export function playFinalCountdownTick() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 980, ctx.currentTime, 0.14, 0.1, 'square');
}

export function playIgnition() {
    const ctx = getContext();
    if (!ctx) return;
    noiseBurst(ctx, ctx.currentTime, 0.4, 0.16, 3000);
    tone(ctx, 90, ctx.currentTime, 0.5, 0.14, 'sawtooth');
}

export function playButtonClick() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 520, ctx.currentTime, 0.05, 0.05, 'triangle');
}

export function playCashOutPress() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 660, ctx.currentTime, 0.08, 0.08, 'triangle');
}

export function playCashOutSuccess() {
    const ctx = getContext();
    if (!ctx) return;
    [659.25, 830.61, 987.77].forEach((freq, i) => {
        tone(ctx, freq, ctx.currentTime + i * 0.08, 0.24, 0.11, 'sine');
    });
}

export function playCrash() {
    const ctx = getContext();
    if (!ctx) return;
    noiseBurst(ctx, ctx.currentTime, 0.55, 0.22, 1400);
    tone(ctx, 110, ctx.currentTime, 0.4, 0.16, 'sawtooth');
    tone(ctx, 55, ctx.currentTime + 0.05, 0.5, 0.14, 'sine');
}

// --- Looping engine drone, reused (never re-created) for the whole flight -
// intensity smoothly ramps its pitch/gain/wind-noise layer instead of the
// sound restarting on every update. ---
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let windSource: AudioBufferSourceNode | null = null;
let windGain: GainNode | null = null;

export function startEngineLoop() {
    const ctx = getContext();
    if (!ctx || isSoundMuted() || engineOsc) return;

    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(70, ctx.currentTime);
    engineGain = ctx.createGain();
    engineGain.gain.setValueAtTime(0, ctx.currentTime);
    engineGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.3);
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(400, ctx.currentTime);
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();

    // Continuous looping noise buffer for the "wind" layer that grows with speed.
    const loopSeconds = 2;
    const bufferSize = Math.floor(ctx.sampleRate * loopSeconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    windSource = ctx.createBufferSource();
    windSource.buffer = buffer;
    windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(1800, ctx.currentTime);
    windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, ctx.currentTime);
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSource.start();
}

/** intensity: 0-1 - called periodically (not per-frame) as flight intensity changes; ramps smoothly, never restarts the loop. */
export function updateEngineIntensity(intensity: number) {
    const ctx = getContext();
    if (!ctx || !engineOsc || !engineGain || !windGain) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    const targetTime = ctx.currentTime + 0.25;
    engineOsc.frequency.linearRampToValueAtTime(70 + clamped * 90, targetTime);
    engineGain.gain.linearRampToValueAtTime(isSoundMuted() ? 0 : 0.05 + clamped * 0.05, targetTime);
    windGain.gain.linearRampToValueAtTime(isSoundMuted() ? 0 : clamped * 0.045, targetTime);
}

export function stopEngineLoop() {
    const ctx = getContext();
    if (ctx && engineGain && windGain) {
        const stopTime = ctx.currentTime + 0.25;
        engineGain.gain.linearRampToValueAtTime(0, stopTime);
        windGain.gain.linearRampToValueAtTime(0, stopTime);
    }
    const osc = engineOsc;
    const wind = windSource;
    engineOsc = null;
    engineGain = null;
    windSource = null;
    windGain = null;
    window.setTimeout(() => {
        try { osc?.stop(); } catch {}
        try { wind?.stop(); } catch {}
    }, 300);
}

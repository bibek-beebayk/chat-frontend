/**
 * Procedural sound effects for Rollin Hi-Lo via the Web Audio API - same
 * approach as rocket/audio.ts, plinko/audio.ts and slots/audio.ts (no
 * licensable sound asset files exist in this repo, so everything is
 * synthesized on the fly). Kept as its own module so this game's audio can
 * evolve without touching unrelated games.
 */

const MUTE_STORAGE_KEY = 'hilo_sound_muted';

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

/** Persists the preference - muting once keeps it muted across sessions. */
export function setSoundMuted(muted: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
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

function noiseBurst(ctx: AudioContext, startTime: number, duration: number, gain: number, lowpassHz = 2600) {
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
    source.stop(startTime + duration);
}

export function playButtonClick() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 880, ctx.currentTime, 0.05, 0.05, 'triangle');
}

/** The card sliding out of the deck. */
export function playCardDeal() {
    const ctx = getContext();
    if (!ctx) return;
    noiseBurst(ctx, ctx.currentTime, 0.11, 0.05, 3400);
}

/** The flip itself - a short papery snap. */
export function playCardFlip() {
    const ctx = getContext();
    if (!ctx) return;
    noiseBurst(ctx, ctx.currentTime, 0.07, 0.07, 5200);
    tone(ctx, 420, ctx.currentTime + 0.03, 0.06, 0.03, 'triangle');
}

/**
 * Correct prediction. `streak` raises the pitch each time, so a long run
 * audibly climbs - the "one more prediction" pull the design brief asks the
 * multiplier animation to carry, in sound.
 */
export function playCorrect(streak: number) {
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const base = 520 * Math.pow(1.06, Math.min(streak, 12));
    tone(ctx, base, t, 0.1, 0.06, 'triangle');
    tone(ctx, base * 1.5, t + 0.07, 0.14, 0.05, 'sine');
}

export function playWrong() {
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 220, t, 0.18, 0.07, 'sawtooth');
    tone(ctx, 138, t + 0.09, 0.28, 0.06, 'sawtooth');
    noiseBurst(ctx, t, 0.22, 0.05, 900);
}

/** Neutral, deliberately unexciting - a push is neither good nor bad news. */
export function playPush() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 392, ctx.currentTime, 0.16, 0.045, 'sine');
}

export function playCashOut(multiplier: number) {
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    // A rising arpeggio, longer the bigger the win.
    const steps = multiplier >= 10 ? 6 : multiplier >= 5 ? 5 : 4;
    for (let i = 0; i < steps; i++) {
        tone(ctx, 523.25 * Math.pow(1.26, i), t + i * 0.075, 0.22, 0.055, 'triangle');
    }
}

/** The 100x ceiling - the server ended the round for you. */
export function playJackpot() {
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 9; i++) {
        tone(ctx, 523.25 * Math.pow(1.18, i), t + i * 0.06, 0.3, 0.06, 'triangle');
    }
    noiseBurst(ctx, t + 0.1, 0.5, 0.05, 6000);
}

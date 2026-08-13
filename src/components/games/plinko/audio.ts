/**
 * Procedural sound effects for Plinko via the Web Audio API - there are no
 * licensable sound asset files in this repo (public/ has exactly one file,
 * notification.mp3, used for chat notifications), so peg hits and win
 * chimes are synthesized on the fly instead of played from files.
 */

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

/** Must be called from within a user gesture handler (e.g. pointerdown) to satisfy browser autoplay policy. */
export function unlockAudio() {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {
            // ignored - a later gesture will retry via getContext()
        });
    }
}

function tone(ctx: AudioContext, frequency: number, startTime: number, duration: number, gain: number, type: OscillatorType = 'sine') {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

/** Short peg-hit blip. Pitch is randomized a bit each call so repeated collisions don't sound identical. */
export function playPegHit() {
    const ctx = getContext();
    if (!ctx) return;
    const base = 620 + Math.random() * 260;
    tone(ctx, base, ctx.currentTime, 0.07, 0.09, 'triangle');
}

export type WinTier = 'minimal' | 'subtle' | 'medium' | 'large' | 'extreme';

const WIN_TIER_NOTES: Record<Exclude<WinTier, 'minimal'>, number[]> = {
    subtle: [523.25, 659.25],
    medium: [523.25, 659.25, 783.99],
    large: [523.25, 659.25, 783.99, 1046.5],
    extreme: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98],
};

/**
 * Every landing gets an audible reaction, even a below-1x result - a soft
 * neutral thud for 'minimal' instead of silence, then an ascending arpeggio
 * (more notes, brighter tone) for bigger wins.
 */
export function playWinChime(tier: WinTier) {
    const ctx = getContext();
    if (!ctx) return;
    if (tier === 'minimal') {
        tone(ctx, 180, ctx.currentTime, 0.14, 0.08, 'sine');
        return;
    }
    const notes = WIN_TIER_NOTES[tier];
    const step = tier === 'extreme' ? 0.09 : 0.11;
    notes.forEach((freq, i) => {
        tone(ctx, freq, ctx.currentTime + i * step, 0.22, tier === 'extreme' ? 0.13 : 0.1, 'sine');
    });
}

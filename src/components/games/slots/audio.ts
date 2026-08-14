/**
 * Procedural sound effects for the Rollin 3x3 slot via the Web Audio API -
 * mirrors components/games/plinko/audio.ts's approach exactly (no
 * licensable sound asset files exist in this repo, so every effect is
 * synthesized on the fly rather than played from a file).
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

/** Must be called from within a user gesture handler (e.g. the SPIN click) to satisfy browser autoplay policy. */
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

/** Short upward blip when SPIN is pressed. */
export function playSpinStart() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 320, ctx.currentTime, 0.08, 0.08, 'triangle');
    tone(ctx, 480, ctx.currentTime + 0.05, 0.08, 0.07, 'triangle');
}

/** Soft, quiet click for each individual reel stopping - not the spin loop itself, just the "thunk". */
export function playReelStop() {
    const ctx = getContext();
    if (!ctx) return;
    tone(ctx, 200 + Math.random() * 40, ctx.currentTime, 0.09, 0.07, 'square');
}

export type SlotWinTier = 'none' | 'small' | 'medium' | 'big';

const WIN_TIER_NOTES: Record<Exclude<SlotWinTier, 'none'>, number[]> = {
    small: [523.25, 659.25],
    medium: [523.25, 659.25, 783.99, 1046.5],
    big: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0],
};

/**
 * 'none' plays a soft neutral thud (a normal loss should never feel like
 * silence/nothing happened), the rest play an ascending arpeggio that gets
 * brighter/longer for bigger multipliers.
 */
export function playResultChime(tier: SlotWinTier) {
    const ctx = getContext();
    if (!ctx) return;
    if (tier === 'none') {
        tone(ctx, 160, ctx.currentTime, 0.16, 0.07, 'sine');
        return;
    }
    const notes = WIN_TIER_NOTES[tier];
    const step = tier === 'big' ? 0.085 : 0.11;
    notes.forEach((freq, i) => {
        tone(ctx, freq, ctx.currentTime + i * step, 0.24, tier === 'big' ? 0.14 : 0.1, 'sine');
    });
}

export function winTierForMultiplier(totalMultiplier: number): SlotWinTier {
    if (totalMultiplier <= 0) return 'none';
    if (totalMultiplier < 5) return 'small';
    if (totalMultiplier < 15) return 'medium';
    return 'big';
}

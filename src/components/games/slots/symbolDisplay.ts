import { SlotSymbolId } from '@/types';

// Placeholder glyphs, not final art - kept separate from symbol IDs (per
// the design brief) so re-theming with real assets later never touches
// game logic, reel strips, or the paytable.
export const SYMBOL_GLYPH: Record<SlotSymbolId, string> = {
    coin: '🪙',
    gem: '💎',
    cards: '🃏',
    bell: '🔔',
    crown: '👑',
    seven: '7',
};

export const SYMBOL_LABEL: Record<SlotSymbolId, string> = {
    coin: 'Rollin Coin',
    gem: 'Purple Gem',
    cards: 'Playing Cards',
    bell: 'Bell',
    crown: 'Crown',
    seven: 'Golden 7',
};

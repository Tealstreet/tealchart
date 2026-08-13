import { describe, expect, it } from 'vitest';

import { parseColorChannels, tintOver } from './colorAlpha';

describe('parseColorChannels', () => {
  it('reads short and long hex, with or without an alpha channel', () => {
    expect(parseColorChannels('#0f8')).toEqual({ red: 0, green: 255, blue: 136, alpha: 1 });
    expect(parseColorChannels('0ECB81')).toEqual({ red: 14, green: 203, blue: 129, alpha: 1 });
    expect(parseColorChannels('#0ECB8180')?.alpha).toBeCloseTo(0.502, 3);
  });

  it('reads rgb and rgba', () => {
    expect(parseColorChannels('rgb(32, 33, 42)')).toEqual({ red: 32, green: 33, blue: 42, alpha: 1 });
    expect(parseColorChannels('rgba(32, 33, 42, 0.88)')).toEqual({ red: 32, green: 33, blue: 42, alpha: 0.88 });
  });

  it('returns null for colors it cannot read', () => {
    expect(parseColorChannels('rebeccapurple')).toBeNull();
    expect(parseColorChannels('')).toBeNull();
  });
});

describe('tintOver', () => {
  it('mixes the hue into the ground rather than replacing it', () => {
    expect(tintOver('#14161c', '#0ecb81', 0.14)).toBe('rgba(19, 47, 42, 1)');
  });

  it('keeps the ground opacity so the label stays one object over the candles', () => {
    expect(tintOver('rgba(32, 33, 42, 0.88)', '#f6465d', 0.18)).toBe('rgba(71, 40, 51, 0.88)');
  });

  it('falls back to the tint when a color cannot be read', () => {
    expect(tintOver('currentColor', '#0ecb81', 0.14)).toBe('#0ecb81');
  });
});

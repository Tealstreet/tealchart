import { describe, expect, it } from 'vitest';

import { parseColorChannels, pickReadableTextColor, tintOver, withColorAlpha } from './colorAlpha';

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

describe('withColorAlpha', () => {
  it('replaces the opacity while preserving the colour channels', () => {
    expect(withColorAlpha('#0ba7da', 0.88)).toBe('rgba(11, 167, 218, 0.88)');
    expect(withColorAlpha('rgba(32, 33, 42, 0.4)', 0.88)).toBe('rgba(32, 33, 42, 0.88)');
  });

  it('falls back to the original colour when it cannot be parsed', () => {
    expect(withColorAlpha('currentColor', 0.88)).toBe('currentColor');
  });
});

describe('pickReadableTextColor', () => {
  const darkInk = '#1f2933';
  const lightInk = '#ffffff';

  it('keeps dark ink on saturated mid-tones a lightness threshold would misread', () => {
    expect(pickReadableTextColor('#0ba7da', darkInk, lightInk)).toBe(darkInk);
    expect(pickReadableTextColor('#fa6b67', darkInk, lightInk)).toBe(darkInk);
  });

  it('switches to light ink once the fill is dark enough', () => {
    expect(pickReadableTextColor('#14161c', darkInk, lightInk)).toBe(lightInk);
  });

  it('falls back to the light ink when a color cannot be read', () => {
    expect(pickReadableTextColor('currentColor', darkInk, lightInk)).toBe(lightInk);
  });
});

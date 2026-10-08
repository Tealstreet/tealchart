import { describe, expect, it } from 'vitest';

import { getTradeLineLabelHeight, resolveTradeLineFont } from './tradeLineFont';

describe('trade line fonts', () => {
  it('preserves adapter pixel fonts, quoted families, style and weight', () => {
    expect(resolveTradeLineFont('italic 700 20px/1.3 "Fira Sans", sans-serif')).toEqual({
      fontSize: 20,
      fontFamily: '"Fira Sans", sans-serif',
      fontStyle: 'italic bold',
    });
    expect(resolveTradeLineFont('8.5px Verdana')).toEqual({ fontSize: 8.5, fontFamily: 'Verdana', fontStyle: '' });
  });

  it.each([
    undefined,
    '',
    'var(--font)',
    'bold -1px Arial',
    'bold 0px Arial',
    '999px Arial',
    '11px var(--family)',
    'x'.repeat(513),
  ])('uses a bounded fallback for unsupported adapter font %s', (font) => {
    expect(resolveTradeLineFont(font, 'Inter')).toEqual({ fontSize: 11, fontFamily: 'Inter', fontStyle: '' });
  });

  it('uses the largest visible segment font for the shared row height', () => {
    const segment = { text: 'Label', backgroundColor: '#fff', borderColor: '#000', textColor: '#000' };
    expect(getTradeLineLabelHeight({ offsetPercent: 0, segments: [{ ...segment, font: '8px Arial' }] })).toBe(18);
    expect(
      getTradeLineLabelHeight({
        offsetPercent: 0,
        segments: [
          { ...segment, font: '20px Arial' },
          { ...segment, font: '14px Verdana' },
        ],
      }),
    ).toBe(26);
  });
});

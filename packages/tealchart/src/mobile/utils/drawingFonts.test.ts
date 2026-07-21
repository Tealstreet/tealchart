import { describe, expect, it } from 'vitest';

import { resolveMobileUserDrawingFontFamily } from './drawingFonts';

describe('mobile user drawing fonts', () => {
  it('maps logical drawing font families to native iOS families', () => {
    expect(resolveMobileUserDrawingFontFamily('sans-serif', 'ios')).toBe('Helvetica');
    expect(resolveMobileUserDrawingFontFamily('serif', 'ios')).toBe('Times New Roman');
    expect(resolveMobileUserDrawingFontFamily('monospace', 'ios')).toBe('Menlo');
  });

  it('keeps Android logical family names that Skia can resolve', () => {
    expect(resolveMobileUserDrawingFontFamily('sans-serif', 'android')).toBe('sans-serif');
    expect(resolveMobileUserDrawingFontFamily('serif', 'android')).toBe('serif');
    expect(resolveMobileUserDrawingFontFamily('monospace', 'android')).toBe('monospace');
  });

  it('normalizes unsupported drawing font families before native lookup', () => {
    expect(resolveMobileUserDrawingFontFamily('fantasy', 'ios')).toBe('Helvetica');
    expect(resolveMobileUserDrawingFontFamily(undefined, 'android')).toBe('sans-serif');
  });
});

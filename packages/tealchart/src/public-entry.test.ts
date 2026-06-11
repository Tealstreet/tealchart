import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingOpacity,
  setUserDrawingTextAlign,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_OPACITY_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
} from './index';
import type {
  UserDrawingFontFamily,
  UserDrawingFontFamilyDescriptor,
  UserDrawingOpacityDescriptor,
  UserDrawingStyleToggleDescriptor,
} from './index';

describe('tealchart public entries', () => {
  it('exports shared and native drawing text alignment helpers', () => {
    expect(setUserDrawingTextAlign).toBeTypeOf('function');
    expect(readFileSync(resolve(__dirname, 'index.native.ts'), 'utf8')).toContain('setMobileUserDrawingTextAlign');
  });

  it('exports shared drawing opacity helpers', () => {
    const descriptor: UserDrawingOpacityDescriptor = USER_DRAWING_OPACITY_DESCRIPTORS[0]!;
    expect(normalizeUserDrawingOpacity(0.5)).toBe(0.5);
    expect(descriptor.label).toBe('100 percent opacity');
    expect(USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity)).toEqual([1, 0.75, 0.5, 0.25]);
  });

  it('exports shared drawing style toggle descriptors', () => {
    const descriptor: UserDrawingStyleToggleDescriptor = USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS[0]!;
    expect(descriptor.style).toBe('lineVisible');
    expect(USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.map((descriptor) => descriptor.style)).toEqual([
      'lineVisible',
      'fillVisible',
    ]);
  });

  it('exports shared drawing font-family helpers', () => {
    const fontFamily: UserDrawingFontFamily = USER_DRAWING_FONT_FAMILIES[0]!;
    const descriptor: UserDrawingFontFamilyDescriptor = USER_DRAWING_FONT_FAMILY_DESCRIPTORS[0]!;
    expect(fontFamily).toBe('sans-serif');
    expect(descriptor.fontFamily).toBe('sans-serif');
    expect(normalizeUserDrawingFontFamily('serif')).toBe('serif');
  });
});

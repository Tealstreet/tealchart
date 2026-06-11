import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizeUserDrawingOpacity, setUserDrawingTextAlign, USER_DRAWING_OPACITY_DESCRIPTORS } from './index';

describe('tealchart public entries', () => {
  it('exports shared and native drawing text alignment helpers', () => {
    expect(setUserDrawingTextAlign).toBeTypeOf('function');
    expect(readFileSync(resolve(__dirname, 'index.native.ts'), 'utf8')).toContain('setMobileUserDrawingTextAlign');
  });

  it('exports shared drawing opacity helpers', () => {
    expect(normalizeUserDrawingOpacity(0.5)).toBe(0.5);
    expect(USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity)).toEqual([1, 0.75, 0.5, 0.25]);
  });
});

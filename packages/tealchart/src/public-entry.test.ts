import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { setUserDrawingTextAlign } from './index';

describe('tealchart public entries', () => {
  it('exports shared and native drawing text alignment helpers', () => {
    expect(setUserDrawingTextAlign).toBeTypeOf('function');
    expect(readFileSync(resolve(__dirname, 'index.native.ts'), 'utf8')).toContain('setMobileUserDrawingTextAlign');
  });
});

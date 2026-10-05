import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Native v5 capture: corpus-compile-third-v5-fill-positional-transp-named-title-v1.pine.
// TradingView refuses positional title 80 even when a later named title is supplied.
describe('captured v5 fill title binding', () => {
  const prefix = '//@version=5\nindicator("corpus-compile-third-v5-fill-positional-transp-named-title-v1")\np1 = plot(close, "UPPER")\np2 = plot(close - 1, "LOWER")\n';

  it('checks the first positional title despite the duplicate named title', () => {
    const result = checkProgram(parse(`${prefix}fill(p1, p2, color.green, 80, title="Fill")\n`));
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'type-mismatch',
      message: 'fill title must be a string, got int',
    }));
  });
});

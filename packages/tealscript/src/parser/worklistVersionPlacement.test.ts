import { describe, expect, it } from 'vitest';

import { parse } from './parser';

// Rank 1652: version annotations may occur outside the first source line.
// https://www.tradingview.com/pine-script-docs/language/script-structure/
describe('worklist version annotation placement', () => {
  for (const version of [1, 2, 3, 4, 5, 6]) {
    it(`retains v${version} after executable statements`, () => {
      const program = parse(`plot(1)\n//@version=${version}`);
      expect(program.version).toBe(version);
      expect(program.explicitVersion).toBe(true);
      expect(program.body).toHaveLength(1);
    });
  }
});

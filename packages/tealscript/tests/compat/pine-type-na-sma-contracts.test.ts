import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json function/ta.sma remarks: source na is ignored.
// These contracts assess missingness and sample selection, not universal precision.
const header = '//@version=6\nindicator("Typed SMA missing samples")\n';

describe('SMA missing-value sample selection', () => {
  // Signed values and real zero reject zero-filling, poisoning, physical windows,
  // partial-window publication, reset-on-na and never-evict interpretations.
  for (const type of ['int', 'float'] as const) {
    it(`ignores typed ${type} na without ignoring a real zero`, () => {
      const source =
        header +
        `${type} sample = switch bar_index
    1 => -9
    2 => 0
    4 => 6
    6 => 12
    7 => -3
    => ${type}(na)
plot(ta.sma(sample, 3), "Mean")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'sample')?.type?.kind).toBe(type);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 9) });
      expect(result.errors).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Mean').values).toEqual([null, null, null, null, -1, -1, 6, 5, 5]);
    });
  }
});

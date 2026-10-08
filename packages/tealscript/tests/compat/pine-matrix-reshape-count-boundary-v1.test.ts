import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('matrix reshape rejects unequal element counts', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const dimensions of [[1, 3], [3, 2]]) {
    it(`v${version} receiver=${receiver} dimensions=${dimensions}`, () => {
      const [rows, columns] = dimensions;
      const result = runCompatScript(`//@version=${version}
indicator("Reshape count boundary")
m = matrix.new<int>(2, 2, 17)
${receiver ? `m.reshape(${rows}, ${columns})` : `matrix.reshape(id=m, rows=${rows}, columns=${columns})`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});

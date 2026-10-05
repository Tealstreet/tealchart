import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic';

const bars = [11, 23, 37, 53].map((close, i) => ({
  time: i * 60000,
  open: close,
  high: close + 3,
  low: close - 1,
  close,
  volume: 2 * (i + 1),
}));
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((x) => x.severity === 'error');

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entry66 ta.accdist.
// V5 migration: /to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables.
describe('worklist1463 accdist variable namespace boundary', () => {
  for (const version of [4, 5, 6]) {
    it(`v${version} resolves the published variable and accumulates`, () => {
      const source = `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Accdist rename")\nplot(${version === 4 ? 'accdist' : 'ta.accdist'})`;
      expect(errors(source)).toEqual([]);
      const result = executeScript(parse(source), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([-1, -3, -6, -10]);
    });
  }
  for (const version of [5, 6]) {
    it(`v${version} rejects legacy bare accdist`, () => {
      expect(
        errors(`//@version=${version}\nindicator("Accdist refusal")\nplot(accdist)`).some((x) =>
          x.message.includes('accdist'),
        ),
      ).toBe(true);
    });
  }
});

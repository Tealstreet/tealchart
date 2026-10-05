import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

// Reference constants and coverage-math-2-v1 native capture agree on these
// binary64 values across all 24136 historical rows; strict equality matters.
const constants = [
  ['pi', 3.1415926535897932],
  ['e', 2.7182818284590452],
  ['phi', 1.6180339887498948],
  ['rphi', 0.6180339887498948],
] as const;

const bars = [1, 2, 3].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1,
  low: close - 1, close, volume: 10,
}));

describe('native and reference math constant values', () => {
  it.each(constants)('preserves full precision for math.%s', (name, value) => {
    const ast = parse(`//@version=6\nindicator("Native math constant v1")\nplot(math.${name})`);
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[value, value, value]]);
  });
});

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// float function entries 284–287: cast na to float; preserve argument qualifier.
// Fractions of both signs distinguish conversion from truncation or zero-filling.
it.each(['const', 'input', 'simple', 'series'] as const)('float(%s) preserves missing and finite fractional values', (qualifier) => {
  const declarations = qualifier === 'input'
    ? 'missing = input.float(float(na))\npositive = input.float(3.75)\nnegative = input.float(-3.75)'
    : `${qualifier} float missing = na\n${qualifier} float positive = 3.75\n${qualifier} float negative = -3.75`;
  const source = `//@version=6
indicator("Float missing cast")
${declarations}
convertedMissing = float(missing)
convertedPositive = float(x = positive)
convertedNegative = float(negative)
plot(convertedMissing, "missing")
plot(na(convertedMissing) ? 1 : 0, "missing flag")
plot(convertedPositive, "positive")
plot(convertedNegative, "negative")`;
  const checked = checkProgram(parse(source));
  expect(checked.diagnostics).toEqual([]);
  for (const name of ['convertedMissing', 'convertedPositive', 'convertedNegative']) {
    expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'float', qualifier });
  }
  const result = runCompatScript(source);
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(getPlot(result, 'missing').values).toEqual(Array(12).fill(null));
  expect(getPlot(result, 'missing flag').values).toEqual(Array(12).fill(1));
  expect(getPlot(result, 'positive').values).toEqual(Array(12).fill(3.75));
  expect(getPlot(result, 'negative').values).toEqual(Array(12).fill(-3.75));
});

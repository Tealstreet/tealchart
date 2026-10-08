import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// bool function 292: na and numeric zero become false; other numbers become true.
// Both signs and a negative fraction reject positive-only or truncated conversion.
for (const kind of ['int', 'float'] as const) {
  it.each(['const', 'input', 'simple'] as const)('bool converts %s ' + kind + ' missing/zero/sign values', (qualifier) => {
    const negative = kind === 'int' ? '-7' : '-0.25';
    const positive = kind === 'int' ? '4' : '0.25';
    const declarations = qualifier === 'input'
      ? `missing = input.bool(true) ? ${kind}(na) : input.${kind}(1)\nzero = input.${kind}(0)\nnegative = input.${kind}(${negative})\npositive = input.${kind}(${positive})`
      : `${qualifier} ${kind} missing = na\n${qualifier} ${kind} zero = 0\n${qualifier} ${kind} negative = ${negative}\n${qualifier} ${kind} positive = ${positive}`;
    const result = runCompatScript(`//@version=6
indicator("Numeric bool missing")
${declarations}
plot(bool(missing) ? 1 : 0, "missing")
plot(bool(x = zero) ? 1 : 0, "zero")
plot(bool(negative) ? 1 : 0, "negative")
plot(bool(x = positive) ? 1 : 0, "positive")`);

    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    for (const [title, value] of [['missing', 0], ['zero', 0], ['negative', 1], ['positive', 1]] as const) {
      expect(getPlot(result, title).values).toEqual(Array(12).fill(value));
    }
  });
}

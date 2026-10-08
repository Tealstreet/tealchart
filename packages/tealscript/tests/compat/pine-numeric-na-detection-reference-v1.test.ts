import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bars: Bar[] = [8, -3, 12, 0, -7, 4].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
}));

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// na function entries 66/67: true for na, false for defined numeric values.
// Zero/sign/fraction controls reject truthiness; interior gaps reject sticky flags.
for (const kind of ['int', 'float'] as const) {
  it.each(['simple', 'series'] as const)('na detects %s ' + kind + ' missing values without treating zero as missing', (qualifier) => {
    const sample = qualifier === 'simple' ? 'na' : `bar_index == 0 or bar_index == 2 ? na : ${kind}(close)`;
    const negative = kind === 'int' ? '-7' : '-7.25';
    const source = `//@version=6
indicator("Numeric missing detection")
${qualifier} ${kind} sample = ${sample}
${qualifier} ${kind} zero = 0
${qualifier} ${kind} negative = ${negative}
${qualifier} ${kind} positive = ${kind}(4)
missingFlag = na(sample)
plot(missingFlag ? 1 : 0, "missing")
plot(na(x = sample) ? 1 : 0, "named missing")
plot((na(zero) ? 1 : 0) + (na(negative) ? 10 : 0) + (na(positive) ? 100 : 0), "present controls")`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'missingFlag')?.type).toEqual({ kind: 'bool', qualifier });
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    const expected = qualifier === 'simple' ? [1, 1, 1, 1, 1, 1] : [1, 0, 1, 0, 0, 0];
    expect(getPlot(result, 'missing').values).toEqual(expected);
    expect(getPlot(result, 'named missing').values).toEqual(expected);
    expect(getPlot(result, 'present controls').values).toEqual([0, 0, 0, 0, 0, 0]);
  });
}

import { expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

// Authority: Script structure compiler annotations; folding is editor host-scope.
for (const annotation of ['//#region named', '//#endregion']) {
  it(`keeps ${annotation} runtime-neutral`, () => {
    const source = `//@version=6
indicator("region")
${annotation}
value = close + 1
plot(value)`;
    const bars = [2, 4].map((close, time) => ({ time, open: close, high: close, low: close, close, volume: 1 }));
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[3, 5]]);
  });
}

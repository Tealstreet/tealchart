import { expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { readFileSync } from 'node:fs';
import { checkProgram } from '../../src/semantic/checker';

// Native v5 bundle: actual v6 const/input sources, verifier division-int-target v2.
for (const kind of ['const', 'input']) {
  it(`retains native fractional integer-operand ${kind} division`, () => {
    const source = readFileSync(new URL(`../../oracle-probes/v5/fractional-int-division-${kind}-control-v1.pine`, import.meta.url), 'utf8');
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bars = [{ time: 1788134400000, open: 1, high: 1, low: 1, close: 1, volume: 0 }];
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    for (const title of ['RAW', 'ASSIGNED']) expect(result.plots.find((plot) => plot.title === title)?.values).toEqual([2.5]);
    expect(result.plots.find((plot) => plot.title === 'RESIDUAL')?.values).toEqual([0]);
  });
}

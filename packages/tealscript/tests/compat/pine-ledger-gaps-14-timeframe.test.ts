import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';

describe(`Ledger gaps521/522: ${reference} functions[202]`, () => {
  it('preserves series int for positional and named series-string arguments', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Series timeframe overload")
tf = bar_index % 2 == 0 ? "1" : "5"
positional = timeframe.in_seconds(tf)
named = timeframe.in_seconds(timeframe=tf)
simple int literalControl = timeframe.in_seconds("5")
inputTf = input.timeframe("1")
simple int inputControl = timeframe.in_seconds(inputTf)
simple int rejectedPositional = positional
simple int rejectedNamed = named
plot(positional)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));
    expect(types.get('positional')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('named')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('literalControl')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('inputControl')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign series value to simple int',
      'Cannot assign series value to simple int',
    ]);
  });

  it('executes both series-string forms with the selected timeframe on every bar', () => {
    const result = runCompatScript(`//@version=6
indicator("Series timeframe values")
tf = bar_index % 2 == 0 ? "1" : "5"
plot(timeframe.in_seconds(tf), title="Positional")
plot(timeframe.in_seconds(timeframe=tf), title="Named")
`);
    expect(result.errors).toEqual([]);
    const expected = [60, 300, 60, 300, 60, 300, 60, 300, 60, 300, 60, 300];
    expect(getPlot(result, 'Positional').values).toEqual(expected);
    expect(getPlot(result, 'Named').values).toEqual(expected);
  });
});

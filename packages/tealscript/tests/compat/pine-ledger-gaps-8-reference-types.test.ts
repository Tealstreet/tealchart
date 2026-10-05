import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Independent reference contracts: drawing na casts return series handles.
// Ledger 300/317-319; table objects and hline handles are inherently series.
// https://www.tradingview.com/pine-script-docs/language/type-system/#reference-types
describe('ledger gaps 8: reference result qualifiers', () => {
  it.each(['table', 'line', 'label', 'box', 'linefill'])('%s(na) retains a series missing handle through aliases', (kind) => {
    const source = `//@version=6
indicator("Missing reference")
missing = ${kind}(na)
alias = missing
${kind} typed = na
plot(na(missing) and na(alias) and na(typed) ? 1 : 0, title="missing")`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['missing', 'alias', 'typed']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind, qualifier: 'series' });
    }
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'missing').values).toEqual(Array(12).fill(1));
    expect(result.drawings).toEqual([]);
  });

  it('table creation and aliases retain the series reference qualifier', () => {
    const checked = checkProgram(parse(`//@version=6
indicator("Table qualifier")
created = table.new(position.top_right, 1, 1)
alias = created
table typed = created`));
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['created', 'alias', 'typed']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'table', qualifier: 'series' });
    }
  });

  it('hline creation and aliases retain the series reference qualifier', () => {
    const checked = checkProgram(parse(`//@version=6
indicator("Hline qualifier")
created = hline(17.5)
alias = created
inferred = created`));
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['created', 'alias', 'inferred']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'hline', qualifier: 'series' });
    }
  });
});

describe('named x missing reference casts', () => {
  it.each(['table', 'line', 'label', 'box', 'linefill'])('%s(x=na) retains a series missing handle', (kind) => {
    const source = `//@version=6
indicator("Named missing reference")
missing = ${kind}(x=na)
alias = missing
plot(na(missing) and na(alias) ? 1 : 0, title="missing")`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['missing', 'alias']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind, qualifier: 'series' });
    }
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'missing').values).toEqual(Array(12).fill(1));
    expect(result.drawings).toEqual([]);
  });
});

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// type-qualifier-system-v3#37: plot IDs are reference types and always series,
// including constant plotted values and aliases. The public fill payload pins
// identity as well as the inferred qualifier.
// https://www.tradingview.com/pine-script-docs/language/type-system/#plot-and-hline
it('keeps plot handles and aliases series-qualified with their original identities', () => {
  const source = `//@version=6
indicator("Plot references")
upper = plot(7, title="Upper")
alias = upper
lower = plot(-3, title="Lower")
fill(alias, lower, color=#123456, title="Between")
`;
  const checked = checkProgram(parse(source));
  expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  for (const name of ['upper', 'alias', 'lower']) {
    expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'plot', qualifier: 'series' });
  }
  const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 2) });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Upper').values).toEqual([7, 7]);
  expect(getPlot(result, 'Lower').values).toEqual([-3, -3]);
  expect(getPlot(result, 'Between')).toMatchObject({ type: 'fill', plot1Id: 'plot_Upper', plot2Id: 'plot_Lower' });
});

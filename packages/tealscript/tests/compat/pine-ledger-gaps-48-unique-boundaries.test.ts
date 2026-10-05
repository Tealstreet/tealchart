import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// The v5 migration guide gives plot.style_columns the v4 value 5.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#some-function-parameters-now-require-built-in-arguments
const source = (version: number, body: string) => `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Unique boundaries")\n${body}`;

describe('ledger gaps 48: legacy numeric and modern unique style boundaries', () => {
  it('infers the documented v4 Columns constant and its arithmetic as integers', () => {
    const result = checkProgram(parse(source(4, 'columns = plot.style_columns\ndoubled = 2 * columns\nplot(doubled)')));
    expect(result.diagnostics).toEqual([]);
    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));
    expect(types.get('columns')).toMatchObject({ kind: 'int', qualifier: 'const' });
    expect(types.get('doubled')).toMatchObject({ kind: 'int' });
  });

  it.each([
    'plot(2 * plot.style_columns, "Documented")',
    'columns = plot.style_columns\nplot(2 * columns, "Documented")',
  ])('evaluates the documented v4 doubled value for %s', (body) => {
    const result = runCompatScript(source(4, body));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Documented').values).toEqual(Array(12).fill(10));
  });

  it.each(['5', 'plot.style_columns'])('renders the documented v4 Columns style from %s', (style) => {
    const result = runCompatScript(source(4, `plot(close, "Columns", style=${style})`));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Columns').style).toBe('columns');
  });

  describe.each([5, 6])('from v%i', (version) => {
    it('refuses the documented unique constant arithmetic', () => {
      const result = checkProgram(parse(source(version, 'a = 2 * plot.style_columns\nplot(a)')));
      expect(result.diagnostics).toContainEqual(expect.objectContaining({
        code: 'invalid-operator-operands', severity: 'error',
      }));
    });

    it('preserves the Columns unique type', () => {
      const result = checkProgram(parse(source(version, 'columns = plot.style_columns\nplot(close, style=columns)')));
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'columns')?.type).toMatchObject({
        kind: 'unique', name: 'plot_style', qualifier: 'const',
      });
    });

    it('retains named Columns style output', () => {
      const result = runCompatScript(source(version, 'plot(close, "Columns", style=plot.style_columns)'));
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Columns').style).toBe('columns');
    });

    it.each(['plot(close, style=5)', 'hline(100, linestyle=5)'])('refuses raw integer style in %s', (body) => {
      const result = checkProgram(parse(source(version, body)));
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'type-mismatch', severity: 'error' }));
    });

    it('preserves a local callable with the same name as plot', () => {
      const result = checkProgram(parse(source(version, 'plot(int style) => style\nresult = plot(style=5)')));
      expect(result.diagnostics).toEqual([]);
    });
  });
});

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Authority: pine-v6-reference-v1.json entries plot, hline, fill, bgcolor,
// barcolor, plotshape, plotchar, plotarrow (each case names its entry).
// Version rules are explicit in the official migration guide:
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/
// #the-transp-parameter-is-removed, #no-series-offset-values,
// #minimum-linewidth-is-1.
function source(version: number, body: string): string {
  return `//@version=${version}\nindicator("Visual version reference")\n${body}`;
}

function diagnostics(version: number, body: string) {
  return checkProgram(parse(source(version, body))).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

const transpCases = [
  { name: 'plot', call: 'plot(close, transp=37)' },
  { name: 'fill', call: 'a = plot(close)\nb = plot(open)\nfill(a, b, color=color.red, transp=37)' },
  { name: 'plotarrow', call: 'plotarrow(close, transp=37)' },
  { name: 'plotchar', call: 'plotchar(close > open, transp=37)' },
  { name: 'plotshape', call: 'plotshape(close > open, transp=37)' },
];

const offsetCases = [
  { name: 'plot', call: 'plot(close, offset=shift)' },
  { name: 'plotarrow', call: 'plotarrow(close, offset=shift)' },
  { name: 'plotchar', call: 'plotchar(close > open, offset=shift)' },
  { name: 'plotshape', call: 'plotshape(close > open, offset=shift)' },
  { name: 'bgcolor', call: 'bgcolor(color.red, offset=shift)' },
  { name: 'barcolor', call: 'barcolor(color.red, offset=shift)' },
];

describe('documented visual parameter version boundaries', () => {
  // Red proof: disable both v5 legacy-signature selection sites for transp
  // and swap the v5/v6 minimum-width rules. All seven ordinary cases fail.
  // Reference signatures omit transp; the v6 guide explicitly permits it in
  // v5. The paired positive control rejects a uniform all-version refusal.
  it.each(transpCases)('removes transp only in v6 $name', ({ name, call }) => {
    expect(diagnostics(5, call)).toEqual([]);
    expect(diagnostics(6, call)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'error', code: 'unknown-argument',
        message: expect.stringContaining(`Unknown argument 'transp' for ${name}()`),
      }),
    ]));
  });

  // Reference plot/hline linewidth is int and >= 1 in v6; guide allows zero
  // in v5. Include width one in both versions to distinguish > 1 from >= 1.
  it.each(['plot', 'hline'])('changes zero linewidth acceptance for %s', (name) => {
    expect(diagnostics(5, `${name}(1, linewidth=0)`)).toEqual([]);
    for (const version of [5, 6]) {
      expect(diagnostics(version, `${name}(1, linewidth=1)`)).toEqual([]);
    }
    expect(diagnostics(6, `${name}(1, linewidth=0)`)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'error', code: 'type-mismatch', message: expect.stringContaining('linewidth must be at least 1'),
      }),
    ]));
  });
});

describe('named visual version defects', () => {
  // Reference bgcolor; guide #the-transp-parameter-is-removed.
  // Natural red: the modern signature retained transp; v5 still accepts it.
  it('V6_BGCOLOR_TRANSP_STILL_ACCEPTED [bgcolor]', () => {
    expect(diagnostics(5, 'bgcolor(color.red, transp=37)')).toEqual([]);
    expect(diagnostics(6, 'bgcolor(color.red, transp=37)')).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'error', code: 'unknown-argument',
        message: expect.stringContaining("Unknown argument 'transp' for bgcolor()"),
      }),
    ]));
  });

  // Reference each visual's offset; guide #no-series-offset-values.
  // Natural red: series offsets were accepted despite preserved qualifiers.
  // Const/input/simple controls retain v6 acceptance; v5 permits series.
  it.each(offsetCases)('V6_SERIES_VISUAL_OFFSET_ACCEPTED: $name', ({ name, call }) => {
    for (const declaration of ['int shift = 1', 'shift = input.int(1)', 'simple int shift = 1']) {
      expect(diagnostics(6, `${declaration}\n${call}`)).toEqual([]);
    }
    const body = `int shift = bar_index == 0 ? 4 : -2\n${call}`;
    expect(diagnostics(5, body)).toEqual([]);
    expect(diagnostics(6, body)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'error', code: 'qualifier-mismatch',
        message: expect.stringContaining(`simple parameter 'offset' for ${name};`),
      }),
    ]));
  });

  // Reference plot/hline; guide #minimum-linewidth-is-1 gives -5 and -3.
  // Natural red: v5 refused negative integer widths despite these examples.
  // Fractional widths still fail so accepting all legacy numbers cannot pass.
  it.each([
    { name: 'plot', width: -5 }, { name: 'hline', width: -3 },
  ])('V5_NEGATIVE_LITERAL_LINEWIDTH_REFUSED: $name', ({ name, width }) => {
    const body = `${name}(1, linewidth=${width})`;
    expect(diagnostics(5, body)).toEqual([]);
    expect(diagnostics(5, `${name}(1, linewidth=${width}.5)`)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'error', code: 'type-mismatch', message: expect.stringContaining('linewidth must be an integer'),
      }),
    ]));
    expect(diagnostics(6, body)).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', code: 'type-mismatch', message: expect.stringContaining('linewidth') }),
    ]));
  });

  // Reference plot; guide #no-series-offset-values applies the last offset.
  // [4, -2, 9, 1] rejects first/min/max/per-bar shifting of the whole chart.
  // Natural red: registration latched four instead of the final offset one.
  it('V5_PLOT_OFFSET_LATCHES_FIRST_VALUE [plot]', () => {
    const bars: Bar[] = [30, -4, 8, 2].map((close, index) => ({
      time: (index + 1) * 60_000, open: close, high: close + 1,
      low: close - 1, close, volume: 10,
    }));
    const ast = parse(source(5, `int shift = bar_index == 0 ? 4 : bar_index == 1 ? -2 : bar_index == 2 ? 9 : 1
plot(close, offset=shift)`));
    expect(checkProgram(ast).diagnostics).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    expect(result.plots[0].values).toEqual([30, -4, 8, 2]);
    expect(result.plots[0].offset).toBe(1);
  });
});

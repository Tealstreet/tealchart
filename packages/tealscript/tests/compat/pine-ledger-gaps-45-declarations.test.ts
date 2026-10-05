import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(source: string) {
  return checkProgram(parse(`//@version=6\n${source}\n`)).diagnostics;
}

const qualifiedArguments = [
  { kind: 'indicator', parameter: 'title', setup: 'value = input.string("Title")', value: 'value' },
  { kind: 'indicator', parameter: 'shorttitle', setup: 'value = input.string("Short")', value: 'value' },
  { kind: 'indicator', parameter: 'overlay', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'indicator', parameter: 'precision', setup: 'value = input.int(3)', value: 'value' },
  { kind: 'indicator', parameter: 'max_bars_back', setup: 'value = input.int(10)', value: 'value' },
  { kind: 'indicator', parameter: 'max_lines_count', setup: 'value = input.int(10)', value: 'value' },
  { kind: 'indicator', parameter: 'max_labels_count', setup: 'value = input.int(10)', value: 'value' },
  { kind: 'indicator', parameter: 'max_boxes_count', setup: 'value = input.int(10)', value: 'value' },
  { kind: 'indicator', parameter: 'max_polylines_count', setup: 'value = input.int(10)', value: 'value' },
  { kind: 'indicator', parameter: 'calc_bars_count', setup: 'value = input.int(10)', value: 'value' },
  { kind: 'indicator', parameter: 'timeframe', setup: '', value: 'timeframe.period' },
  { kind: 'indicator', parameter: 'timeframe_gaps', setup: '', value: 'barstate.islast' },
  { kind: 'indicator', parameter: 'explicit_plot_zorder', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'indicator', parameter: 'behind_chart', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'indicator', parameter: 'dynamic_requests', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'strategy', parameter: 'title', setup: 'value = input.string("Title")', value: 'value' },
  { kind: 'strategy', parameter: 'initial_capital', setup: 'value = input.float(1000)', value: 'value' },
  { kind: 'strategy', parameter: 'pyramiding', setup: 'value = input.int(1)', value: 'value' },
  { kind: 'strategy', parameter: 'default_qty_value', setup: 'value = input.float(1)', value: 'value' },
  { kind: 'strategy', parameter: 'commission_value', setup: 'value = input.float(1)', value: 'value' },
  { kind: 'strategy', parameter: 'slippage', setup: 'value = input.int(1)', value: 'value' },
  { kind: 'strategy', parameter: 'margin_long', setup: 'value = input.float(1)', value: 'value' },
  { kind: 'strategy', parameter: 'margin_short', setup: 'value = input.float(1)', value: 'value' },
  { kind: 'strategy', parameter: 'backtest_fill_limits_assumption', setup: 'value = input.int(1)', value: 'value' },
  { kind: 'strategy', parameter: 'process_orders_on_close', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'strategy', parameter: 'use_bar_magnifier', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'strategy', parameter: 'calc_on_every_tick', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'strategy', parameter: 'close_entries_rule', setup: 'value = input.string("FIFO")', value: 'value' },
  { kind: 'library', parameter: 'title', setup: 'value = input.string("Title")', value: 'value' },
  { kind: 'library', parameter: 'overlay', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'library', parameter: 'dynamic_requests', setup: 'value = input.bool(true)', value: 'value' },
  { kind: 'indicator', parameter: 'precision', setup: 'simple int value = 3', value: 'value' },
  { kind: 'indicator', parameter: 'overlay', setup: 'simple bool value = true', value: 'value' },
  { kind: 'indicator', parameter: 'shorttitle', setup: 'simple string value = "Short"', value: 'value' },
  { kind: 'indicator', parameter: 'max_bars_back', setup: '', value: 'bar_index' },
  { kind: 'indicator', parameter: 'behind_chart', setup: '', value: 'barstate.islast' },
  { kind: 'indicator', parameter: 'title', setup: '', value: 'str.tostring(close)' },
] as const;

describe('ledger gaps 45: declaration arguments', () => {
  it.each(qualifiedArguments)('1778 requires const $kind:$parameter', ({ kind, parameter, setup, value }) => {
    const title = parameter === 'title' ? `title=${value}` : `"Const declaration", ${parameter}=${value}`;
    const diagnostics = check(
      `${setup}\n${kind}(${title})\n${kind === 'library' ? 'export identity(float source) => source' : 'plot(close)'}`,
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'qualifier-mismatch',
          severity: 'error',
          message: expect.stringContaining(parameter),
        }),
      ]),
    );
  });

  it.each([
    'indicator("Literal", shorttitle="L", overlay=true, precision=3, max_bars_back=10, max_lines_count=10, calc_bars_count=0, timeframe="60", timeframe_gaps=true, explicit_plot_zorder=true, behind_chart=true, dynamic_requests=true)\nplot(close)',
    'const string titleText = "Computed" + " title"\nconst int count = 2 + 1\nindicator(titleText, precision=count, max_lines_count=count, overlay=not false)\nplot(close)',
    'strategy("Strategy", initial_capital=1000, pyramiding=1, calc_on_every_tick=true, close_entries_rule="FIFO")\nplot(close)',
    'library("Library", overlay=true, dynamic_requests=true)\nexport identity(float source) => source',
  ])('1778 accepts literal and computed const declarations: %s', (source) => {
    expect(check(source).filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});

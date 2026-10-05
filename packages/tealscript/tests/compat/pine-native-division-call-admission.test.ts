import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const capturedSources = [
  [
    'row1654-label-timeframe-division-v1.pine',
    '//@version=5\nindicator("row1654-label-timeframe-division-v1", overlay=true)\ntfMultiplier = timeframe.multiplier\nif barstate.islast\n    for barIndex = 0 to 1\n        label.new(bar_index + barIndex * 60 / tfMultiplier, low, "target", xloc=xloc.bar_index)\nplot(close, "compile_control")\n',
  ],
  [
    'row1654-line-timeframe-division-v1.pine',
    '//@version=5\nindicator("row1654-line-timeframe-division-v1", overlay=true)\ntfMultiplier = timeframe.multiplier\nif barstate.islast\n    for barIndex = 0 to 1\n        line.new(bar_index + barIndex * 60 / tfMultiplier, low, bar_index + (barIndex + 1) * 60 / tfMultiplier, high, xloc=xloc.bar_index)\nplot(close, "compile_control")\n',
  ],
  [
    'row1654-lowest-timeframe-division-v1.pine',
    '//@version=5\nindicator("row1654-lowest-timeframe-division-v1", overlay=true)\ntfMultiplier = timeframe.multiplier\nlookbackLength = 1440 / tfMultiplier\npriceLowest = ta.lowest(low, lookbackLength)\nplot(priceLowest, "target")\nplot(ta.lowest(low, int(lookbackLength)), "explicit_int_control")\nplot(lookbackLength, "division_value")\n',
  ],
  [
    'drawing-coordinate-backquant-float-x-v1.pine',
    '//@version=6\nindicator("BackQuant coordinate v1")\nlabel.new(bar_index + (1 + 2) / 2, close)\n',
  ],
  [
    'drawing-coordinate-point-index-active-v5-length50-v1.pine',
    '//@version=5\nindicator("Point index active input division 50")\nlength = input.int(50)\np = chart.point.from_index(bar_index + (length / 2 - 1), low)\nplot(p.index, title="POINT_INDEX")\nplot(bar_index, title="CHART_INDEX")\nplot(time, title="INPUT_TIME")\n',
  ],
  [
    'drawing-coordinate-point-index-active-v5-length51-v1.pine',
    '//@version=5\nindicator("Point index active input division 51")\nlength = input.int(51)\np = chart.point.from_index(bar_index + (length / 2 - 1), low)\nplot(p.index, title="POINT_INDEX")\nplot(bar_index, title="CHART_INDEX")\nplot(time, title="INPUT_TIME")\n',
  ],
  [
    'drawing-coordinate-profile-float-right-v1.pine',
    '//@version=6\nindicator("Profile coordinate v1")\nwidth = input.int(6)\nif barstate.islast\n    box.new(bar_index, high, bar_index + math.max(width * 2 / 3, 1), low)\n',
  ],
  [
    'drawing-coordinate-sabres-input-division-v1.pine',
    '//@version=5\nindicator("Sabres point v1")\nlength = input.int(50)\np = chart.point.from_index(bar_index + (length / 2 - 1), low)\nplot(close)\n',
  ],
  [
    'row390-label-new-midpoint-v1.pine',
    '//@version=6\nindicator("row390-label-new-midpoint-v1", overlay=true)\ninvLabelPos = input.string("Right", "Label Position", options=["Left", "Center", "Right"])\nf_invLabelX(int x1, int x2) =>\n    invLabelPos == "Left" ? x1 : invLabelPos == "Center" ? (x1 + x2) / 2 : x2\nif barstate.islast\n    label.new(f_invLabelX(time[1], time), close, "Invalidation", xloc=xloc.bar_time)\nplot(close, "compile_control")\n',
  ],
  [
    'row390-label-set-x-midpoint-v1.pine',
    '//@version=6\nindicator("row390-label-set-x-midpoint-v1", overlay=true)\ninvLabelPos = input.string("Right", "Label Position", options=["Left", "Center", "Right"])\nf_invLabelX(int x1, int x2) =>\n    invLabelPos == "Left" ? x1 : invLabelPos == "Center" ? (x1 + x2) / 2 : x2\nvar label id = label.new(time, close, "Invalidation", xloc=xloc.bar_time)\nif barstate.islast\n    label.set_x(id, f_invLabelX(time[1], time))\nplot(close, "compile_control")\n',
  ],
];

const nativeRefusals = [
  [
    'v5-float-length-highest-v1.pine',
    '//@version=5\nindicator("V5-FLOAT-LENGTH-HIGHEST-V1")\ntargetValue = ta.highest(7.5)\nfloorValue = ta.highest(7)\nceilValue = ta.highest(8)\nplot(targetValue, title="OUTCOME", display=display.data_window)\nplot(floorValue, title="FLOOR_CONTROL", display=display.data_window)\nplot(ceilValue, title="CEIL_CONTROL", display=display.data_window)\nplot(close, title="INPUT_CLOSE", display=display.data_window)\nplot(bar_index, title="BAR_INDEX", display=display.data_window)\n',
  ],
  [
    'v5-float-length-ema-v1.pine',
    '//@version=5\nindicator("V5-FLOAT-LENGTH-EMA-V1")\ntargetValue = ta.ema(close, 7.5)\nfloorValue = ta.ema(close, 7)\nceilValue = ta.ema(close, 8)\nplot(targetValue, title="OUTCOME", display=display.data_window)\nplot(floorValue, title="FLOOR_CONTROL", display=display.data_window)\nplot(ceilValue, title="CEIL_CONTROL", display=display.data_window)\nplot(close, title="INPUT_CLOSE", display=display.data_window)\nplot(bar_index, title="BAR_INDEX", display=display.data_window)\n',
  ],
  [
    'v5-float-length-sma-v1.pine',
    '//@version=5\nindicator("V5-FLOAT-LENGTH-SMA-V1")\ntargetValue = ta.sma(close, 7.5)\nfloorValue = ta.sma(close, 7)\nceilValue = ta.sma(close, 8)\nplot(targetValue, title="OUTCOME", display=display.data_window)\nplot(floorValue, title="FLOOR_CONTROL", display=display.data_window)\nplot(ceilValue, title="CEIL_CONTROL", display=display.data_window)\nplot(close, title="INPUT_CLOSE", display=display.data_window)\nplot(bar_index, title="BAR_INDEX", display=display.data_window)\n',
  ],
];

describe('native integer-derived division call admission', () => {
  it.each(capturedSources)('admits captured %s', (_name, source) => {
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it.each(nativeRefusals)('preserves captured refusal %s', (_name, source) => {
    expect(checkProgram(parse(source)).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
  it('retains the native odd-length point index fraction', () => {
    const source = capturedSources.find(([name]) => name.includes('length51'))![1];
    const result = runCompatScript(source, {
      bars: [
        { time: 1788134400000, open: 1, high: 2, low: 0, close: 1, volume: 1 },
        { time: 1788134520000, open: 1, high: 2, low: 0, close: 1, volume: 1 },
      ],
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'POINT_INDEX').values).toEqual([24.5, 25.5]);
  });
  it.each([
    'ta.highest(close, 7.5)',
    'ta.sma(close, 7.5)',
    'ta.wma(close, 7.5)',
    'label.new(bar_index + 1.5, close)',
    'chart.point.from_index(bar_index + input.float(1.5), close)',
  ])('preserves float operand refusal for %s', (call) => {
    const source = '//@version=6\nindicator("control")\n' + call + '\nplot(close)';
    expect(checkProgram(parse(source)).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
  it.each([
    'float length = 7.5\nplot(ta.highest(close, length))',
    'length = input.float(15) / timeframe.multiplier\nplot(ta.highest(close, length))',
    'length = input.int(15) / timeframe.multiplier\nlength := 7.5\nplot(ta.highest(close, length))',
    'length = close > open ? input.int(15) / timeframe.multiplier : 7.5\nplot(ta.highest(close, length))',
    'length = bar_index / 2\nplot(ta.ema(close, length))',
  ])('keeps operand and qualifier boundaries: %s', (body) => {
    expect(
      checkProgram(parse('//@version=6\nindicator("control")\n' + body)).diagnostics.some(
        (d) => d.severity === 'error',
      ),
    ).toBe(true);
  });
  it('keeps general division float inference outside the captured call boundaries', () => {
    const ast = parse(
      '//@version=6\nindicator("control")\nlength = input.int(15) / timeframe.multiplier\nplot(length)',
    );
    const result = checkProgram(ast);
    expect(result.symbols.find((symbol) => symbol.name === 'length')?.type?.kind).toBe('float');
  });
});

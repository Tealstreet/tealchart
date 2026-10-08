import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
const errors = (body: string) => checkProgram(parse(`//@version=6\nindicator("Ledger witnesses")\n${body}`)).diagnostics.filter((d) => d.severity === 'error');

describe('ledger gaps 641–680 documented witnesses', () => {
  // Rows642/644/646, functions[180]: all three MACD lengths have a simple qualifier ceiling.
  it.each(['fastlen', 'slowlen', 'siglen'])('MACD refuses series int %s', (parameter) => {
    const args = { source: 'close', fastlen: '2', slowlen: '3', siglen: '2', [parameter]: 'bar_index + 2' };
    expect(errors(`[m, s, h] = ta.macd(${Object.entries(args).map(([k, v]) => `${k}=${v}`).join(', ')})`)).toContainEqual(expect.objectContaining({
      code: 'qualifier-mismatch', message: expect.stringContaining(parameter),
    }));
  });

  // Row679, functions[205]: diLength is simple/input/const int, so series int is too strong.
  it('DMI refuses series int diLength', () => {
    expect(errors('[p, m, a] = ta.dmi(diLength=bar_index + 2, adxSmoothing=2)')).toContainEqual(expect.objectContaining({
      code: 'qualifier-mismatch', message: expect.stringContaining('diLength'),
    }));
  });

  // Rows659–662, functions[186–189]: select source at the latest true condition, executing every bar.
  it.each([
    ['float', 'close', 'x', compatibilityBars.map((_, i) => compatibilityBars[i - i % 2]!.close)],
    ['int', 'bar_index', 'x', compatibilityBars.map((_, i) => i - i % 2)],
    ['bool', 'bar_index % 3 == 0', 'x ? 1 : 0', compatibilityBars.map((_, i) => (i - i % 2) % 3 === 0 ? 1 : 0)],
    ['color', 'bar_index % 3 == 0 ? #0B1621 : #2C3742', 'x == #0B1621 ? 1 : 0', compatibilityBars.map((_, i) => (i - i % 2) % 3 === 0 ? 1 : 0)],
  ] as const)('valuewhen selects %s source on its occurrence bar', (_kind, source, output, expected) => {
    const result = runCompatScript(`//@version=6\nindicator("Occurrence source")\nx = ta.valuewhen(bar_index % 2 == 0, ${source}, 0)\nplot(${output}, title="Selected")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Selected').values).toEqual(expected);
  });

  // Row670, constants[181] remark1: addition/subtraction compose display settings without numeric encoding assumptions.
  it('display.all subtraction matches the remaining named display settings', () => {
    const result = runCompatScript(`//@version=6
indicator("Display arithmetic")
plot(close, title="Subtract", display=display.all - display.data_window)
plot(close, title="Compose", display=display.pane + display.status_line + display.price_scale + display.pine_screener)
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Subtract').display).toEqual(getPlot(result, 'Compose').display);
  });

  // Row677, functions[461] remark0: string-array indexing starts at zero.
  it('string arrays expose the first and last elements at zero and size minus one', () => {
    const result = runCompatScript(`//@version=6
indicator("String indices")
a = array.new_string(3, "middle")
array.set(a, 0, "first")
array.set(a, 2, "last")
plot(array.get(a, 0) == "first" and array.get(a, 1) == "middle" and array.get(a, 2) == "last" ? 1 : 0, title="Indices")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Indices').values).toEqual(compatibilityBars.map(() => 1));
  });
  // Row672, functions[178] remark0: source na is ignored; no exact window weights or warmup are pinned.
  it('VWMA source holes do not produce missing output after its windows are ready', () => {
    const result = runCompatScript(`//@version=6
indicator("VWMA holes")
x = ta.vwma(bar_index == 5 ? na : close, 2)
plot(na(x) ? 0 : 1, title="Present")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Present').values.slice(2)).toEqual(compatibilityBars.slice(2).map(() => 1));
  });

});

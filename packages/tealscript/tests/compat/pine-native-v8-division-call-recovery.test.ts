import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

const captured = [
  ['authority-label-division-v6-v1.pine', '451d119f49cfda705ffc62063938f1e8e218d6526b251fd82208a81144eef351'],
  ['authority-point-division-v5-v1.pine', 'a5122c98d54b95715c2b541fe0f8820e688c84361f9b4df1df9628f105e7d65d'],
  ['authority-box-division-v6-v1.pine', 'db8d4a0a2d6884fbadb8532c5eeb96de2b8cededccf94a335bdcc6be72c66e5d'],
  ['corpus-input-float-sma-dminutes-v6-v1.pine', '5719a03e43f47fc4200fbdf495f8bf3b338cd05665b4e392cab0bb0260f90007'],
  ['corpus-input-float-ema-half-length-v5-v1.pine', '21aa41a9c9c8eebab7a37d4b0a0cc9cd5e7d5c28e5246ca9d69829fc38286ab1'],
] as const;
const sourceFor = (name: string) => readFileSync(new URL(`../../oracle-probes/v8/${name}`, import.meta.url), 'utf8');
const bars = Array.from({ length: 1000 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 100 + i,
  high: 102 + i,
  low: 99 + i,
  close: 101 + i,
  volume: 100,
}));
const options = { runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } };

describe('native v8 division call recovery', () => {
  it.each(captured)('admits unchanged native source %s', (name, sha) => {
    const source = sourceFor(name);
    expect(createHash('sha256').update(source).digest('hex')).toBe(sha);
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it('preserves the captured fractional point index', () => {
    const result = executeCompiledScript(
      parse(sourceFor('authority-point-division-v5-v1.pine')),
      bars.slice(0, 3),
      undefined,
      options,
    );
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots[0].values).toEqual([1.5, 1.5, 1.5]);
  });
  it.each([
    ['corpus-input-float-sma-dminutes-v6-v1.pine', 'Open: Hours a Day', 6.51, 977.5, 976],
    ['corpus-input-float-ema-half-length-v5-v1.pine', 'Length', 31, 15.5, 44],
  ] as const)('normalizes only TA length for %s', (name, title, value, length, first) => {
    const result = executeCompiledScript(parse(sourceFor(name)), bars, new Map([['input_' + title, value]]), options);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;
    expect(result.result.errors).toEqual([]);
    const target = result.result.plots.find((p) => p.title === 'OUTCOME')!.values;
    const floor = result.result.plots.find((p) => p.title === 'FLOOR_CONTROL')!.values;
    expect(target).toEqual(floor);
    expect(target.findIndex((v) => v !== null && Number.isFinite(v))).toBe(first);
    expect(result.result.plots.find((p) => p.title === 'INPUT_LENGTH')!.values[0]).toBe(length);
  });
  it.each([
    'label.new(bar_index + 1.5, close)',
    'box.new(bar_index, high, bar_index + input.float(2), low)',
    'chart.point.from_index(bar_index + input.float(1.5), close)',
    'plot(ta.sma(close, input.float(3.5)))',
    'plot(ta.ema(close, 7.5))',
    'plot(ta.wma(close, 7.5))',
    'length = input.int(5) / 2\nlength := 7.5\nplot(ta.wma(close, length))',
    'length = close > open ? input.int(5) / 2 : 7.5\nplot(ta.wma(close, length))',
  ])('retains refusal for %s', (body) => {
    expect(
      checkProgram(parse('//@version=6\nindicator("control")\n' + body)).diagnostics.some(
        (d) => d.severity === 'error',
      ),
    ).toBe(true);
  });
});

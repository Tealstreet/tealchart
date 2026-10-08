import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const args = ['"Transport"', '"T"', 'true', 'format.volume', '3', 'scale.left', '2', '"60"', 'false', 'true', '5', '4', '6', '0', '7', 'false', 'false'];
const shifted = ['max_lines_count', 'max_labels_count', 'max_boxes_count', 'calc_bars_count', 'max_polylines_count', 'dynamic_requests', 'behind_chart'] as const;
const values = [5, 4, 6, 0, 7, false, false];
const named = 'indicator("Transport", behind_chart=false, dynamic_requests=false, max_polylines_count=7, calc_bars_count=0, max_boxes_count=6, max_labels_count=4, max_lines_count=5, explicit_plot_zorder=true, timeframe_gaps=false, timeframe="60", max_bars_back=2, scale=scale.left, precision=3, format=format.volume, overlay=true, shorttitle="T")';
const expected = {
  title: 'Transport', shortTitle: 'T', overlay: true, precision: 3, format: 'volume', scale: 'left',
  timeframe: '60', timeframeGaps: false, explicitPlotZOrder: true, behindChart: false,
  calcBarsCount: 0, maxBarsBack: 2, dynamicRequests: false,
  drawingLimits: { label: 4, line: 5, box: 6, polyline: 7 },
};
const bars = [7, -3].map((close, index) => ({
  time: (index + 1) * 3_600_000, open: close, high: close, low: close, close, volume: 10,
}));

function run(version: number, declaration: string) {
  const source = `//@version=${version}\n${declaration}\nplot(close, "Result")`;
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = runCompatScript(source, {
    bars, engineOptions: { runtime: { timeframe: { period: '60', multiplier: 60, isminutes: true, isintraday: true } } },
  });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Result').values).toEqual([7, -3]);
  return { ast, declaration: result.declaration };
}

describe.each([5, 6])('v%i indicator positional signature', (version) => {
  it('transports the full positional declaration', () => {
    expect(run(version, `indicator(${args.join(', ')})`).declaration).toEqual(expected);
  });
  it('preserves the matching named declaration', () => {
    expect(run(version, named).declaration).toEqual(expected);
  });
  for (const [index, parameter] of shifted.entries()) {
    it(`binds the partial positional prefix for ${parameter}`, () => {
      const count = index === 6 ? 16 : 11 + index;
      const suffix = index === 6 ? ', behind_chart=false' : '';
      const { ast } = run(version, `indicator(${args.slice(0, count).join(', ')}${suffix})`);
      const declaration = ast.body.find((s) => s.type === 'IndicatorDeclaration');
      expect(declaration?.type).toBe('IndicatorDeclaration');
      if (!declaration || declaration.type !== 'IndicatorDeclaration') throw new Error('Missing declaration');
      for (let slot = 0; slot <= index; slot++) {
        expect(declaration[shifted[slot]]).toMatchObject({ value: values[slot] });
      }
      for (let slot = index + 1; slot < shifted.length; slot++) {
        expect(declaration[shifted[slot]]).toBeUndefined();
      }
    });
  }
  it('keeps the legacy strategy positional table', () => {
    const ast = parse(`//@version=${version}\nstrategy(${args.slice(0, 10).join(', ')}, false, 5, 4, 6, 0, 7, false)\nplot(close)`);
    const declaration = ast.body[0];
    expect(checkProgram(parse(`//@version=${version}\nstrategy("Short", "S", true)\nplot(close)`)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(declaration).toMatchObject({
      type: 'IndicatorDeclaration', declarationKind: 'strategy', behind_chart: { value: false },
      max_lines_count: { value: 5 }, max_labels_count: { value: 4 }, max_boxes_count: { value: 6 },
      calc_bars_count: { value: 0 }, max_polylines_count: { value: 7 }, dynamic_requests: { value: false },
    });
  });
  it('keeps library positional arguments', () => {
    const ast = parse(`//@version=${version}\nlibrary("Library", true, false)\nexport identity(float x) => x`);
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(ast.body[0]).toMatchObject({ type: 'LibraryDeclaration', title: { value: 'Library' }, overlay: { value: true }, dynamic_requests: { value: false } });
  });
});

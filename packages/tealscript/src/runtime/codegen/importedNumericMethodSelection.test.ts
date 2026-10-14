import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const bars = [3, 4, 5].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close, low: close, close, volume: 1,
}));

function values(version: number, libraryBody: string, body: string): unknown[][] {
  const libraries = new Map([['Test/Nums/1', parse(`//@version=${version}\nlibrary("Nums")\n${libraryBody}`)]]);
  const ast = parse(`//@version=${version}\nindicator("Imported numeric methods")\nimport Test/Nums/1 as lib\n${body}`);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast, undefined, { libraries });
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { libraries });
  expect(result).toBeDefined();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result!.plots.map((plot) => plot.values);
}

describe('imported numeric receiver selection', () => {
  for (const version of [5, 6]) {
    for (const reverse of [false, true]) {
      const methods = ['export method pick(int self) => self + 200', 'export method pick(float self) => self + 100'];
      if (reverse) methods.reverse();
      const library = methods.join('\n');
      it(`selects integral floats and integers by static type in v${version}, reverse=${reverse}`, () => {
        expect(values(version, library, `method localInt(int self) => self + 200
method localFloat(float self) => self + 100
plot(float(3.0).pick())
plot(int(3).pick())
plot(float(3.0).localFloat())
plot(int(3).localInt())
plot(close.pick())
plot(int(close).pick())`)).toEqual([[103, 103, 103], [203, 203, 203], [103, 103, 103], [203, 203, 203], [103, 104, 105], [203, 204, 205]]);
      });
      it(`carries each untyped wrapper call's receiver type in v${version}, reverse=${reverse}`, () => {
        expect(values(version, library, `read(value) => value.pick()
plot(read(close))
plot(read(int(close)))`)).toEqual([[103, 104, 105], [203, 204, 205]]);
      });
    }
    it(`retains a mixed numeric receiver expression inside nested requests in v${version}`, () => {
      const library = parse(`//@version=${version}\nlibrary("Nums")\nexport method pick(int self) => self + 100\nexport method pick(float self) => self`);
      const libraries = new Map([['Test/Nums/1', library]]);
      const ast = parse(`//@version=${version}
indicator("Nested imported methods")
import Test/Nums/1 as lib
outer(value) => request.security("REMOTE", "1D", request.security("REMOTE", "1D", value.pick() + int(7).pick(), lookahead=barmerge.lookahead_on), lookahead=barmerge.lookahead_on)
plot(outer(close))`);
      expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, bars, undefined, {
        libraries, runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'CHART', timezone: 'Etc/UTC' } },
        requestDatafeed: { getBars(query) {
          return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: [41, 42].map((close, index) => ({ ...bars[0]!, time: index * 86_400_000, close })) } };
        } },
      });
      expect(result!.errors).toEqual([]);
      expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(result!.plots.map((plot) => plot.values)).toEqual([[148, 148, 148]]);
    });
    it(`keeps unused numeric exports out of unrelated call codegen in v${version}`, () => {
      const library = parse(`//@version=${version}
library("Nums")
export type Point
    float value
export method pick(Point self) => self.value + 1
export method pick(array<float> self) => self.get(0) + 2
export forward(float value) => value + 3
export method unused(float self) => self`);
      const libraries = new Map([['Test/Nums/1', library]]);
      const ast = parse(`//@version=${version}
indicator("Unrelated exports")
import Test/Nums/1 as lib
p = lib.Point.new(3)
a = array.from(4.0)
plot(p.pick())
plot(a.pick())
plot(lib.forward(5.0))`);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(true);
      expect(compiled.generatedCode).not.toContain('_methodContext');
      const result = executeCompiled(compiled, bars, undefined, { libraries });
      expect(result!.errors).toEqual([]);
      expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(result!.plots.map((plot) => plot.values)).toEqual([[4, 4, 4], [6, 6, 6], [8, 8, 8]]);
    });
    it(`refuses an integer receiver for an exported float-only method in v${version}`, () => {
      const libraries = new Map([['Test/Nums/1', parse(`//@version=${version}\nlibrary("Nums")\nexport method pick(float self) => self + 10`)]]);
      const ast = parse(`//@version=${version}\nindicator("Integer receiver")\nimport Test/Nums/1 as lib\nplot(int(3).pick())`);
      expect(checkProgram(ast, { libraries }).diagnostics.filter(d => d.severity === 'error')).toEqual([
        expect.objectContaining({
          code: version === 6 ? 'CE10271' : 'method-receiver-type',
          message: version === 6 ? "Could not find method or method reference 'integer.pick'" : "Could not find method or method reference 'pick' for 'integer'",
          line: 4,
          column: 12,
        }),
      ]);
      expect(values(version, 'export method pick(float self) => self + 10', 'plot(float(3).pick())')).toEqual([[13, 13, 13]]);
    });
    it(`retains a library-local numeric receiver's definition in v${version}`, () => {
      expect(values(version, `method pick(float self) => self + 10
export forward(float self) => self.pick()`, 'plot(lib.forward(float(3.0)))')).toEqual([[13, 13, 13]]);
    });
    it(`refuses equally specific exported receivers from two libraries in v${version}`, () => {
      const library = parse(`//@version=${version}\nlibrary("Nums")\nexport method pick(float self) => self`);
      const libraries = new Map([['Test/Nums/1', library], ['Other/Nums/1', parse(`//@version=${version}\nlibrary("Nums")\nexport method pick(float self) => self + 1`)]]);
      const ast = parse(`//@version=${version}\nindicator("Ambiguous imported methods")\nimport Test/Nums/1 as first\nimport Other/Nums/1 as second\nplot(close.pick())`);
      expect(checkProgram(ast, { libraries }).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'ambiguous-call', severity: 'error' }),
      ]));
      expect(tryCompile(ast, undefined, { libraries }).success).toBe(false);
    });
  }
});

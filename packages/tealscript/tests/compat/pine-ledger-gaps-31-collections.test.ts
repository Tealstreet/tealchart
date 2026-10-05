import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

function values(source: string): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Ledger31 collections")\n${source}`, {
    bars: compatibilityBars.slice(0, 1),
  });
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => getPlot(result, plot.title).values[0]!);
}

// Authority: reference/pine-v6-reference-v1.json exact function/method remarks.
// Each receiver spelling executes through the public compiled entrypoint.
describe('ledger31 collection remarks', () => {
  for (const method of [false, true]) {
    const call = (member: string, id: string, rest = '') =>
      method ? `${id}.${member}(${rest})` : `matrix.${member}(${id}${rest ? ', ' + rest : ''})`;
    it(`matrix.is_symmetric rejects both non-square shapes (${method ? 'method' : 'namespace'}), ranks1208/1209`, () => {
      expect(
        values(`wide = matrix.new<float>(1, 2, 7)
tall = matrix.new<float>(2, 1, 7)
square = matrix.new<float>(2, 2, 7)
plot(${call('is_symmetric', 'wide')} ? 1 : 0)
plot(${call('is_symmetric', 'tall')} ? 1 : 0)
plot(${call('is_symmetric', 'square')} ? 1 : 0)`),
      ).toEqual([0, 0, 1]);
    });
    it(`matrix.swap_columns uses zero-based endpoints (${method ? 'method' : 'namespace'}), ranks1210/1211`, () => {
      expect(
        values(`m = matrix.new<float>(2, 3, 0)
m.set(0, 0, 11)
m.set(0, 1, 12)
m.set(0, 2, 13)
m.set(1, 0, 21)
m.set(1, 1, 22)
m.set(1, 2, 23)
${call('swap_columns', 'm', 'column1=0, column2=2')}
plot(m.get(0, 0))
plot(m.get(0, 1))
plot(m.get(0, 2))
plot(m.get(1, 0))
plot(m.get(1, 1))
plot(m.get(1, 2))`),
      ).toEqual([13, 12, 11, 23, 22, 21]);
    });
    for (const kind of ['float', 'int']) {
      const arrayCall = (member: string, id: string, rest = '') =>
        method ? `${id}.${member}(${rest})` : `array.${member}(${id}${rest ? ', ' + rest : ''})`;
      const numbers = kind === 'float' ? '0.0, 3.0, 6.0' : '0, 3, 6';
      it(`array.variance ${kind} population/sample/empty (${method ? 'method' : 'namespace'}), ranks1219-1226`, () => {
        expect(
          values(`array<${kind}> a = array.from(${numbers})
empty = array.new<${kind}>()
plot(${arrayCall('variance', 'a', 'biased=true')})
plot(${arrayCall('variance', 'a', 'biased=false')})
plot(${arrayCall('variance', 'empty', 'biased=true')})
plot(${arrayCall('variance', 'empty', 'biased=false')})`),
        ).toEqual([6, 9, null, null]);
      });
      it(`array.covariance ${kind} population/sample/both-empty (${method ? 'method' : 'namespace'}), ranks1233/1238`, () => {
        const right = kind === 'float' ? '0.0, 6.0, 12.0' : '0, 6, 12';
        expect(
          values(`array<${kind}> a = array.from(${numbers})
array<${kind}> b = array.from(${right})
empty = array.new<${kind}>()
plot(${arrayCall('covariance', 'a', method ? 'id2=b, biased=true' : 'b, biased=true')})
plot(${arrayCall('covariance', 'a', method ? 'id2=b, biased=false' : 'b, biased=false')})
plot(${arrayCall('covariance', 'empty', method ? 'id2=empty' : 'empty')})`),
        ).toEqual([12, 18, null]);
      });
      it(`array.percentrank ${kind} ranks the indexed element including ties (${method ? 'method' : 'namespace'}), ranks1228-1237`, () => {
        const ranked = kind === 'float' ? '3.0, 1.0, 3.0, 9.0' : '3, 1, 3, 9';
        expect(
          values(`array<${kind}> a = array.from(${ranked})
empty = array.new<${kind}>()
plot(${arrayCall('percentrank', 'a', 'index=0')})
plot(${arrayCall('percentrank', 'a', 'index=1')})
plot(${arrayCall('percentrank', 'a', 'index=3')})
plot(${arrayCall('percentrank', 'empty', 'index=0')})`),
        ).toEqual([66.66666666666667, 25, 100, null]);
      });
      it(`array.standardize ${kind} empty input remains empty (${method ? 'method' : 'namespace'}), partial rank1217`, () => {
        expect(
          values(`empty = array.new<${kind}>()
result = ${arrayCall('standardize', 'empty')}
plot(array.size(empty))
plot(array.size(result))`),
        ).toEqual([0, 0]);
      });
    }
  }
});

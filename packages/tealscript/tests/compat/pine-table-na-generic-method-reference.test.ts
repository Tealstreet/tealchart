import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const nested of [false, true]) {
  for (const methodDelete of [false, true]) {
    it(`generic receiver values ${nested ? 'nested' : 'returned'} ${methodDelete ? 'method' : 'namespace'} deletion`, () => {
      const declaration = nested
        ? 'elementMissing(values) => na(array.get(values,0))\nmapMissing(source) => elementMissing(source.values())'
        : 'tableValues(source) => source.values()';
      const reading = nested ? 'mapMissing(refs)' : 'na(array.get(tableValues(refs),0))';
      const result = runCompatScript(
        `//@version=6
indicator("Generic method map values")
${declaration}
var t=table.new(position.top_left,1,1)
refs=map.new<string,table>()
map.put(refs,"key",t)
if bar_index==1
    ${methodDelete ? 't.delete()' : 'table.delete(t)'}
plot(na(t)?1:0,"direct")
plot(${reading}?1:0,"reference")`,
        { bars: compatibilityBars.slice(0, 3) },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'direct').values).toEqual([0, 1, 1]);
      expect(getPlot(result, 'reference').values).toEqual([0, 1, 1]);
    });
  }
}

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, functions571/572.
// Corpus v56:1452/1536 uses explicit matrix IDs in namespace calls alongside a variable named matrix.
describe('corpus matrix namespace arguments', () => {
  for (const version of [5, 6]) {
    for (const named of [false, true]) {
      it(`preserves explicit matrix IDs in v${version} ${named ? 'named' : 'positional'} calls`, () => {
        const get = named ? 'matrix.get(id=other, row=1, column=0)' : 'matrix.get(other, 1, 0)';
        const set = named ? 'matrix.set(id=other, row=1, column=0, value=17)' : 'matrix.set(other, 1, 0, 17)';
        const result = runCompatScript(`//@version=${version}
indicator("Matrix namespace")
var matrix<float> matrix = na
if barstate.isfirst
    matrix := matrix.new<float>(2, 1, 9)
var other = matrix.new<float>(2, 1, 3)
${set}
plot(${get}, "explicit")
plot(matrix.get(1, 0), "receiver")
`);
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'explicit').values).toEqual(Array(12).fill(17));
        expect(getPlot(result, 'receiver').values).toEqual(Array(12).fill(9));
      });
    }
  }
});

import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  {
    family: 'label',
    constructor: 'label.new(2,13,"seed",size=7)',
    setter: 'set_size',
    parameter: 'size',
    field: 'size',
    coordinates: { x: 2, y: 13 },
  },
  {
    family: 'box',
    constructor: 'box.new(2,13,5,-7,text="seed",text_size=7)',
    setter: 'set_text_size',
    parameter: 'text_size',
    field: 'textSize',
    coordinates: { left: 2, top: 13, right: 5, bottom: -7 },
  },
] as const;

// v6 label/box constructors and size setters accept positive integer text sizes.
// Copies retain these fields independently, including subsequent symbolic sizes.
describe('Drawing copies retain numeric text-size snapshots', () => {
  for (const item of cases)
    for (const method of [false, true]) {
      it(`${item.family}, method=${method}: separates constructor and series-size snapshots`, () => {
        const call = (id: string, name: string, args = '') =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
        const script = `//@version=6
indicator("Copy numeric sizes")
var source=${item.constructor}
var older=${call('source', 'copy')}
var ${item.family} newer=na
if bar_index==1
    ${call('source', item.setter, `${item.parameter}=7+bar_index*12`)}
    newer:=${call('source', 'copy')}
if bar_index==2
    ${call('source', item.setter, '7+bar_index*12')}
    ${call('older', item.setter, 'size.small')}
    ${call('newer', item.setter, `${item.parameter}=23`)}
plot(${call('source', 'get_text')}=="seed"?1:0,"source text")
plot(${call('older', 'get_text')}=="seed"?1:0,"older text")
plot(na(newer)?-1:${call('newer', 'get_text')}=="seed"?1:0,"newer text")
plot(array.size(${item.family}.all),"count")`;
        for (const count of [1, 2, 3]) {
          const result = runCompatScript(script, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(getPlot(result, 'source text').values).toEqual([1, 1, 1].slice(0, count));
          expect(getPlot(result, 'older text').values).toEqual([1, 1, 1].slice(0, count));
          expect(getPlot(result, 'newer text').values).toEqual([-1, 1, 1].slice(0, count));
          expect(getPlot(result, 'count').values).toEqual([2, 3, 3].slice(0, count));
          const drawings = result.drawings.filter((drawing) => drawing.type === item.family);
          expect(drawings).toHaveLength(count === 1 ? 2 : 3);
          expect(new Set(drawings.map((drawing) => drawing.id)).size).toBe(drawings.length);
          const sizes = count === 1 ? ['7', '7'] : count === 2 ? ['19', '7', '19'] : ['31', 'small', '23'];
          drawings.forEach((drawing, index) =>
            expect(drawing).toMatchObject({
              ...item.coordinates,
              text: 'seed',
              [item.field]: sizes[index],
            }),
          );
        }
      });
    }
});

import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  {
    family: 'line',
    constructor: 'line.new(1,13,4,-7,color=#123456)',
    setter: 'set_x1',
    getter: 'get_x1',
    colorSetter: 'set_color',
    coordinate: 'x1',
    color: 'color',
  },
  {
    family: 'label',
    constructor: 'label.new(1,13,"copy",color=#123456)',
    setter: 'set_x',
    getter: 'get_x',
    colorSetter: 'set_color',
    coordinate: 'x',
    color: 'color',
  },
  {
    family: 'box',
    constructor: 'box.new(1,13,4,-7,bgcolor=#123456)',
    setter: 'set_left',
    getter: 'get_left',
    colorSetter: 'set_bgcolor',
    coordinate: 'left',
    color: 'bgcolor',
  },
] as const;

// v6 reference copy [856/883/904]: each call clones the object and returns a new handle.
describe('Drawing copies from one written UDF call are distinct snapshots', () => {
  for (const item of cases) {
    for (const method of [false, true]) {
      it(`${item.family} repeated UDF copies retain individual coordinates and appearance, method=${method}`, () => {
        const call = (id: string, name: string, args = '') =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
        const source = `//@version=6
indicator("Repeated UDF copies")
clone(${item.family} value) => ${call('value', 'copy')}
var original=${item.constructor}
var ${item.family} first=na
var ${item.family} second=na
var ${item.family} third=na
if bar_index==1
    for i=0 to 1
        copied=clone(original)
        ${call('copied', item.setter, 'i+5')}
        if i==0
            first:=copied
        else
            second:=copied
    ${call('first', item.colorSetter, '#654321')}
if bar_index==2
    third:=clone(first)
    ${call('first', item.setter, '9')}
    ${call('first', item.colorSetter, '#abcdef')}
    ${call('original', item.setter, '7')}
plot(${call('original', item.getter)},"source")
plot(${call('first', item.getter)},"first")
plot(${call('second', item.getter)},"second")
plot(${call('third', item.getter)},"third")
plot(array.size(${item.family}.all),"count")`;
        for (const count of [2, 3]) {
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'source').values).toEqual([1, 1, 7].slice(0, count));
          expect(getPlot(result, 'first').values).toEqual([null, 5, 9].slice(0, count));
          expect(getPlot(result, 'second').values).toEqual([null, 6, 6].slice(0, count));
          expect(getPlot(result, 'third').values).toEqual([null, null, 5].slice(0, count));
          expect(getPlot(result, 'count').values).toEqual([1, 3, 4].slice(0, count));
          const drawings = result.drawings.filter((drawing) => drawing.type === item.family);
          expect(drawings).toHaveLength(count === 2 ? 3 : 4);
          expect(new Set(drawings.map((drawing) => drawing.id)).size).toBe(drawings.length);
          const expected =
            count === 2
              ? [
                  [1, '#123456'],
                  [5, '#654321'],
                  [6, '#123456'],
                ]
              : [
                  [7, '#123456'],
                  [9, '#abcdef'],
                  [6, '#123456'],
                  [5, '#654321'],
                ];
          drawings.forEach((drawing, index) =>
            expect(drawing).toMatchObject({ [item.coordinate]: expected[index][0], [item.color]: expected[index][1] }),
          );
        }
      });
    }
  }
});

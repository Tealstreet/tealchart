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

// v6 reference [856/883/904]: copies clone objects and return new handles.
// Deleting a source must not retire its independently stored copy.
describe('Drawing copy independence across source deletion', () => {
  for (const item of cases) {
    for (const method of [false, true]) {
      it(`${item.family} descendants survive deleting their sources, method=${method}`, () => {
        const call = (id: string, name: string, args = '') =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
        const script = `//@version=6
indicator("Copies after deletion")
var source=${item.constructor}
var copied=${call('source', 'copy')}
var ${item.family} descendant=na
var ${item.family} third=na
var ${item.family} missingCopy=na
if bar_index==1
    ${call('source', 'delete')}
    missingCopy:=${call('source', 'copy')}
    ${call('copied', item.setter, '5')}
    descendant:=${call('copied', 'copy')}
    ${call('copied', item.colorSetter, '#654321')}
if bar_index==2
    ${call('copied', 'delete')}
    missingCopy:=${call('copied', 'copy')}
    ${call('descendant', item.setter, '8')}
    ${call('descendant', item.colorSetter, '#abcdef')}
    third:=${call('descendant', 'copy')}
plot(${call('source', item.getter)},"source")
plot(${call('copied', item.getter)},"copy")
plot(${call('descendant', item.getter)},"descendant")
plot(${call('third', item.getter)},"third")
plot(na(missingCopy)?1:0,"missing copy")
plot(array.size(${item.family}.all),"count")`;
        for (const count of [2, 3]) {
          const result = runCompatScript(script, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(result.profile.swallowedErrors ?? []).toEqual([]);
          expect(getPlot(result, 'source').values).toEqual([1, null, null].slice(0, count));
          expect(getPlot(result, 'copy').values).toEqual([1, 5, null].slice(0, count));
          expect(getPlot(result, 'descendant').values).toEqual([null, 5, 8].slice(0, count));
          expect(getPlot(result, 'third').values).toEqual([null, null, 8].slice(0, count));
          expect(getPlot(result, 'missing copy').values).toEqual([1, 1, 1].slice(0, count));
          expect(getPlot(result, 'count').values).toEqual([2, 2, 2].slice(0, count));
          const drawings = result.drawings.filter((drawing) => drawing.type === item.family);
          expect(drawings).toHaveLength(2);
          expect(new Set(drawings.map((drawing) => drawing.id)).size).toBe(2);
          const color = count === 2 ? '#654321' : '#abcdef';
          expect(drawings[0]).toMatchObject({ [item.coordinate]: count === 2 ? 5 : 8, [item.color]: color });
          expect(drawings[1]).toMatchObject({
            [item.coordinate]: count === 2 ? 5 : 8,
            [item.color]: count === 2 ? '#123456' : '#abcdef',
          });
        }
      });
    }
  }
});

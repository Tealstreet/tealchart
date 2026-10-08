import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  { family: 'line', setter: 'set_x1', getter: 'get_x1', coordinate: 'x1', color: 'color' },
  { family: 'label', setter: 'set_x', getter: 'get_x', coordinate: 'x', color: 'color' },
  { family: 'box', setter: 'set_left', getter: 'get_left', coordinate: 'left', color: 'bgcolor' },
] as const;

// Drawing copy clones the referenced object; array slots and UDT fields hold IDs.
// Replacing those stored IDs does not redirect copies made from their old referents.
describe('Drawing copies snapshot references retrieved from containers', () => {
  for (const item of cases)
    for (const method of [false, true]) {
      it(`${item.family}, method=${method}: isolates array and UDT field copy operands`, () => {
        const create = (x: number) =>
          item.family === 'label'
            ? `label.new(${x},13,"seed",color=#123456)`
            : item.family === 'line'
              ? `line.new(${x},13,17,-7,color=#123456)`
              : `box.new(${x},13,17,-7,bgcolor=#123456)`;
        const call = (id: string, name: string, args = '') =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
        const script = `//@version=6
indicator("Stored drawing copy references")
type Holder
    ${item.family} drawing
var source=${create(1)}
var refs=array.new<${item.family}>(1,source)
var holder=Holder.new(source)
var ${item.family} fromArray=na
var ${item.family} fromField=na
if bar_index==1
    fromArray:=${call('array.get(refs,0)', 'copy')}
    fromField:=${call('holder.drawing', 'copy')}
    ${call('fromArray', item.setter, '5')}
    ${call('fromField', item.setter, '7')}
if bar_index==2
    array.set(refs,0,${create(11)})
    holder.drawing:=${create(13)}
    ${call('source', item.setter, '9')}
plot(${call('source', item.getter)},"source")
plot(${call('array.get(refs,0)', item.getter)},"array reference")
plot(${call('holder.drawing', item.getter)},"field reference")
plot(${call('fromArray', item.getter)},"array copy")
plot(${call('fromField', item.getter)},"field copy")
plot(array.size(${item.family}.all),"count")`;
        for (const count of [1, 2, 3]) {
          const result = runCompatScript(script, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(getPlot(result, 'source').values).toEqual([1, 1, 9].slice(0, count));
          expect(getPlot(result, 'array reference').values).toEqual([1, 1, 11].slice(0, count));
          expect(getPlot(result, 'field reference').values).toEqual([1, 1, 13].slice(0, count));
          expect(getPlot(result, 'array copy').values).toEqual([null, 5, 5].slice(0, count));
          expect(getPlot(result, 'field copy').values).toEqual([null, 7, 7].slice(0, count));
          expect(getPlot(result, 'count').values).toEqual([1, 3, 5].slice(0, count));
          const drawings = result.drawings.filter((drawing) => drawing.type === item.family);
          const coordinates = count === 1 ? [1] : count === 2 ? [1, 5, 7] : [9, 5, 7, 11, 13];
          expect(drawings).toHaveLength(coordinates.length);
          expect(new Set(drawings.map((drawing) => drawing.id)).size).toBe(drawings.length);
          drawings.forEach((drawing, index) =>
            expect(drawing).toMatchObject({ [item.coordinate]: coordinates[index], [item.color]: '#123456' }),
          );
        }
      });
    }
});

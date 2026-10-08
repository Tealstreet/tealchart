import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const firstTime = compatibilityBars[0].time;
const secondTime = compatibilityBars[1].time;
const cases = [
  {
    family: 'line',
    constructor: `line.new(${firstTime},13,${secondTime},-7,xloc=xloc.bar_time)`,
    getter: 'get_x1',
    copiedLocation: '1,4,xloc.bar_index',
    sourceLocation: '7,9,xloc.bar_index',
    snapshot: { x1: firstTime, x2: secondTime, y1: 13, y2: -7 },
    copiedCoordinates: { x1: 1, x2: 4 },
    sourceCoordinates: { x1: 7, x2: 9 },
  },
  {
    family: 'label',
    constructor: `label.new(${firstTime},13,"anchor",xloc=xloc.bar_time,yloc=yloc.abovebar)`,
    getter: 'get_x',
    copiedLocation: '1,xloc.bar_index',
    sourceLocation: '7,xloc.bar_index',
    snapshot: { x: firstTime, y: 13, text: 'anchor', yloc: 'abovebar' },
    copiedCoordinates: { x: 1, yloc: 'price' },
    sourceCoordinates: { x: 7, yloc: 'belowbar' },
  },
  {
    family: 'box',
    constructor: `box.new(${firstTime},13,${secondTime},-7,xloc=xloc.bar_time)`,
    getter: 'get_left',
    copiedLocation: '1,4,xloc.bar_index',
    sourceLocation: '7,9,xloc.bar_index',
    snapshot: { left: firstTime, right: secondTime, top: 13, bottom: -7 },
    copiedCoordinates: { left: 1, right: 4 },
    sourceCoordinates: { left: 7, right: 9 },
  },
] as const;

// v6 reference: copy [856/883/904], set_xloc [875/893/916], set_yloc [917].
describe('Drawing copies preserve coordinate modes and isolate later mode changes', () => {
  for (const item of cases) {
    for (const method of [false, true]) {
      it(`${item.family} preserves time anchors before independent index changes, method=${method}`, () => {
        const call = (id: string, name: string, args = '') =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
        const source = `//@version=6
indicator("Copy anchor modes")
var original=${item.constructor}
var ${item.family} copied=na
if bar_index==1
    copied:=${call('original', 'copy')}
if bar_index==2
    ${call('copied', 'set_xloc', item.copiedLocation)}
    ${item.family === 'label' ? call('copied', 'set_yloc', 'yloc.price') : ''}
if bar_index==3
    ${call('original', 'set_xloc', item.sourceLocation)}
    ${item.family === 'label' ? call('original', 'set_yloc', 'yloc.belowbar') : ''}
plot(${call('original', item.getter)},"source x")
plot(${call('copied', item.getter)},"copy x")
plot(array.size(${item.family}.all),"count")`;
        for (const count of [2, 3, 4]) {
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'source x').values).toEqual([firstTime, firstTime, firstTime, 7].slice(0, count));
          expect(getPlot(result, 'copy x').values).toEqual([null, firstTime, 1, 1].slice(0, count));
          expect(getPlot(result, 'count').values).toEqual([1, 2, 2, 2].slice(0, count));
          const drawings = result.drawings.filter((drawing) => drawing.type === item.family);
          expect(drawings).toHaveLength(2);
          const [original, copied] = drawings;
          expect(original).toMatchObject({
            ...item.snapshot,
            ...(count === 4 ? item.sourceCoordinates : {}),
            xloc: count === 4 ? 'bar_index' : 'bar_time',
          });
          expect(copied).toMatchObject({
            ...item.snapshot,
            ...(count >= 3 ? item.copiedCoordinates : {}),
            xloc: count >= 3 ? 'bar_index' : 'bar_time',
          });
          expect(original.id).not.toBe(copied.id);
        }
      });
    }
  }
});

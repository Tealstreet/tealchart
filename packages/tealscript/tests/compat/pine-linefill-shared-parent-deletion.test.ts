import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: v6 linefill.new [905] parent-deletion remarks and delete [906].
describe('Linefill deletion with a shared parent', () => {
  for (const sharedPosition of ['first', 'second'] as const) {
    for (const method of [false, true]) {
      it(`removes all remaining dependents of the ${sharedPosition} parent, method=${method}`, () => {
        const fill = (other: string, color: string) =>
          sharedPosition === 'first'
            ? `linefill.new(shared,${other},${color})`
            : `linefill.new(${other},shared,${color})`;
        const removeFill = (id: string) => (method ? `${id}.delete()` : `linefill.delete(${id})`);
        const removeLine = method ? 'shared.delete()' : 'line.delete(shared)';
        const result = runCompatScript(
          `//@version=6
indicator("Shared parent deletion")
var shared=line.new(0,13,1,-7)
var a=line.new(0,19,1,-23)
var b=line.new(0,31,1,-37)
var c=line.new(0,41,1,-43)
var independentFirst=line.new(0,47,1,-53)
var independentSecond=line.new(0,59,1,-61)
var explicitlyDeleted=${fill('a', '#123456')}
var dependentFirst=${fill('b', '#234567')}
var independent=linefill.new(independentFirst,independentSecond,#654321)
var dependentSecond=${fill('c', '#345678')}
if bar_index==1
    ${removeFill('explicitlyDeleted')}
if bar_index==2
    ${removeLine}
if bar_index==3
    ${removeLine}
    ${removeFill('dependentFirst')}
    ${removeFill('dependentSecond')}
plot(array.size(linefill.all),title="fills")
plot(array.size(line.all),title="lines")
plot(array.indexof(linefill.all,explicitlyDeleted)>=0?1:0,title="explicit")
plot(array.indexof(linefill.all,dependentFirst)>=0?1:0,title="first")
plot(array.indexof(linefill.all,dependentSecond)>=0?1:0,title="second")
plot(array.indexof(linefill.all,independent)>=0?1:0,title="independent")
plot(line.get_y1(a),title="a")
plot(line.get_y1(b),title="b")
plot(line.get_y1(c),title="c")
plot(line.get_y1(linefill.get_line1(independent)),title="independentFirst")
plot(line.get_y1(linefill.get_line2(independent)),title="independentSecond")`,
          { bars: compatibilityBars.slice(0, 4) },
        );
        expect(result.errors).toEqual([]);
        for (const [title, values] of [
          ['fills', [4, 3, 1, 1]],
          ['lines', [6, 6, 5, 5]],
          ['explicit', [1, 0, 0, 0]],
          ['first', [1, 1, 0, 0]],
          ['second', [1, 1, 0, 0]],
          ['independent', [1, 1, 1, 1]],
          ['a', [19, 19, 19, 19]],
          ['b', [31, 31, 31, 31]],
          ['c', [41, 41, 41, 41]],
          ['independentFirst', [47, 47, 47, 47]],
          ['independentSecond', [59, 59, 59, 59]],
        ] as const) {
          expect(getPlot(result, title).values, title).toEqual(values);
        }
        const fills = result.drawings?.filter((drawing) => drawing.type === 'linefill');
        expect(fills).toHaveLength(1);
        expect(fills?.[0]).toMatchObject({ color: '#654321' });
        expect(result.drawings?.filter((drawing) => drawing.type === 'line')).toHaveLength(5);
      });
    }
  }
});

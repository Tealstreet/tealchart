import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference v6 .all entries 183/184/186: index zero is the oldest current object.
// Copies 856/883/904 create another object; setters move coordinates, and deletes remove the specified ID.
// https://www.tradingview.com/pine-script-reference/v6/#var_line.all
const bars = compatibilityBars.slice(0, 4);

describe('Drawing oldest-object enumeration across mutation and later copying', () => {
  for (const family of ['line', 'label', 'box'] as const) {
    for (const method of [false, true]) {
      it(`${family}, ${method ? 'method' : 'namespace'}: copying and moving do not replace the oldest ID`, () => {
        const create = (x: number) =>
          family === 'label'
            ? `label.new(${x},-7,"keep")`
            : family === 'line'
              ? `line.new(${x},-7,${x + 1},13)`
              : `box.new(${x},13,${x + 1},-7)`;
        const setter = family === 'line' ? 'set_x1' : family === 'label' ? 'set_x' : 'set_left';
        const move = (id: string, x: number) => (method ? `${id}.${setter}(${x})` : `${family}.${setter}(${id},${x})`);
        const copy = method ? 'oldest.copy()' : `${family}.copy(id=oldest)`;
        const remove = method ? 'oldest.delete()' : `${family}.delete(id=oldest)`;
        const getter = family === 'line' ? 'get_x1' : family === 'label' ? 'get_x' : 'get_left';
        const result = runCompatScript(
          `//@version=6
indicator("Oldest drawing across copy")
var oldest=${create(20)}
var ${family} middle=na
var ${family} newer=na
var ${family} duplicate=na
if bar_index==1
    middle:=${create(3)}
    newer:=${create(15)}
if bar_index==2
    ${move('oldest', 30)}
    duplicate:=${copy}
    ${move('duplicate', 7)}
if bar_index==3
    ${remove}
plot(${family}.${getter}(array.get(${family}.all,0)),"oldest x")
plot(array.size(${family}.all),"count")
plot(bar_index>=2?(array.indexof(${family}.all,duplicate)>=0?1:0):-1,"copy present")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'oldest x').values).toEqual([20, 20, 30, 3]);
        expect(getPlot(result, 'count').values).toEqual([1, 3, 4, 3]);
        expect(getPlot(result, 'copy present').values).toEqual([-1, -1, 1, 1]);
      });
    }
  }
});

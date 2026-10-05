import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: official pine-v6-reference-v1.json (2026-10-03). Numbers are
// zero-based entries[] offsets. Function/variable URLs use #fun_<name> and
// #var_<name> at https://www.tradingview.com/pine-script-reference/v6/.
const bars = compatibilityBars.slice(0, 1);
const firstTime = 1_700_000_000_000;
const secondTime = firstTime + 60_000;
const changedTime = firstTime + 120_000;

describe('Official Pine v6 drawing coordinate state', () => {
  // Point setters [1151-1155], constructors [885, 912, 858], point.new [1150].
  // Time/index differ by orders of magnitude; endpoint prices have opposite
  // signs. Verify unchanged corners too, rejecting wrong x field, wrong corner,
  // ignored price and accidental reset of the entire drawing.
  for (const test of [
    {
      name: 'line.set_first_point',
      entry: 1151,
      source: `id = line.new(${firstTime}, 13, ${secondTime}, -7, xloc=xloc.bar_time)`,
      fields: { type: 'line', x1: changedTime, y1: 19, x2: secondTime, y2: -7, xloc: 'bar_time' },
    },
    {
      name: 'line.set_second_point',
      entry: 1152,
      source: `id = line.new(${firstTime}, 13, ${secondTime}, -7, xloc=xloc.bar_time)`,
      fields: { type: 'line', x1: firstTime, y1: 13, x2: changedTime, y2: 19, xloc: 'bar_time' },
    },
    {
      name: 'label.set_point',
      entry: 1153,
      source: `id = label.new(${firstTime}, -7, "keep", xloc=xloc.bar_time)`,
      fields: { type: 'label', x: changedTime, y: 19, text: 'keep', xloc: 'bar_time' },
    },
    {
      name: 'box.set_top_left_point',
      entry: 1154,
      source: `id = box.new(${firstTime}, 13, ${secondTime}, -7, xloc=xloc.bar_time)`,
      fields: { type: 'box', left: changedTime, top: 19, right: secondTime, bottom: -7, xloc: 'bar_time' },
    },
    {
      name: 'box.set_bottom_right_point',
      entry: 1155,
      source: `id = box.new(${firstTime}, 13, ${secondTime}, -7, xloc=xloc.bar_time)`,
      fields: { type: 'box', left: firstTime, top: 13, right: changedTime, bottom: 19, xloc: 'bar_time' },
    },
  ]) {
    it(`${test.name} selects time in the current xloc mode [${test.entry}, 1150]`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Time point setter")
${test.source}
${test.name}(id, chart.point.new(${changedTime}, 3, 19))`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings?.[0]).toMatchObject(test.fields);
    });
  }

  // Getter entries [899,901], [928], [860,861] say current/last xloc; setters
  // [893,916,875] update x and mode together. Two mode switches and different
  // endpoints reject constructor-mode caching, partial updates and swapping.
  for (const test of [
    {
      name: 'line',
      entry: '893, 899, 901',
      source: 'id = line.new(4, 13, 1, -7)',
      timeArgs: `${firstTime}, ${secondTime}, xloc.bar_time`,
      indexArgs: '3, 2, xloc.bar_index',
      getters: ['line.get_x1', 'line.get_x2'],
      times: [firstTime, secondTime],
      indices: [3, 2],
    },
    {
      name: 'label',
      entry: '916, 928',
      source: 'id = label.new(4, -7, "keep")',
      timeArgs: `${firstTime}, xloc.bar_time`,
      indexArgs: '3, xloc.bar_index',
      getters: ['label.get_x'],
      times: [firstTime],
      indices: [3],
    },
    {
      name: 'box',
      entry: '875, 860, 861',
      source: 'id = box.new(4, 13, 1, -7)',
      timeArgs: `${firstTime}, ${secondTime}, xloc.bar_time`,
      indexArgs: '3, 2, xloc.bar_index',
      getters: ['box.get_left', 'box.get_right'],
      times: [firstTime, secondTime],
      indices: [3, 2],
    },
  ]) {
    it(`${test.name} getters follow successive set_xloc calls [${test.entry}]`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Last xloc")
${test.source}
${test.name}.set_xloc(id, ${test.timeArgs})
${test.getters.map((getter, i) => `plot(${getter}(id), title="time${i}")`).join('\n')}
${test.name}.set_xloc(id, ${test.indexArgs})
${test.getters.map((getter, i) => `plot(${getter}(id), title="index${i}")`).join('\n')}`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      test.times.forEach((value, i) => expect(getPlot(result, `time${i}`).values).toEqual([value]));
      test.indices.forEach((value, i) => expect(getPlot(result, `index${i}`).values).toEqual([value]));
    });
  }

  // table.cell [1030] remarks: the last change is reflected in the table.
  // Nonmonotonic signed text values reject first, maximum and accumulation.
  it('table.cell displays the last change across bars [1030]', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Last table cell")
var t = table.new(position.top_right, 2, 3)
value = array.get(array.from(21, -9, 5), bar_index)
table.cell(t, 1, 2, str.tostring(value))`,
      { bars: compatibilityBars.slice(0, 3) },
    );
    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    const drawing = result.drawings?.[0];
    if (drawing?.type !== 'table') throw new Error('Expected table');
    expect(drawing.cells).toHaveLength(1);
    expect(drawing.cells[0]).toMatchObject({ column: 1, row: 2, text: '5' });
  });
});

describe('Official Pine v6 read-only drawing arrays', () => {
  // .all remarks [183-187,203] specify read-only without diagnostic wording.
  // Checking the captured alias rejects a mutable copy; no getter follows clear,
  // so an empty-array accessor error cannot masquerade as a refusal.
  for (const test of [
    { name: 'line', entry: 184, constructor: 'line.new(4, -7, 1, 13)' },
    { name: 'label', entry: 183, constructor: 'label.new(4, -7, "keep")' },
    { name: 'box', entry: 186, constructor: 'box.new(4, 13, 1, -7)' },
    { name: 'table', entry: 187, constructor: 'table.new(position.top_right, 2, 3)' },
    {
      name: 'polyline',
      entry: 203,
      constructor: 'polyline.new(array.from(chart.point.from_index(4, -7), chart.point.from_index(1, 13)))',
    },
    {
      name: 'linefill',
      entry: 185,
      constructor: 'linefill.new(line.new(4, -7, 1, 13), line.new(4, 19, 1, -3), color.red)',
    },
  ]) {
    it(
      `${test.name}.all rejects mutation of its captured array [${test.entry}]`,
      () => {
        const result = runCompatScript(
          `//@version=6
indicator("Read-only drawing IDs")
a = ${test.constructor}
b = ${test.name === 'table' ? 'table.new(position.top_left, 2, 3)' : test.constructor}
ids = ${test.name}.all
array.clear(ids)
plot(array.size(ids), title="captured")`,
          { bars },
        );
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(result.drawings?.filter((drawing) => drawing.type === test.name)).toHaveLength(2);
        if (result.errors.length > 0) {
          expect(result.plots).toEqual([]);
        } else {
          expect(getPlot(result, 'captured').values).toEqual([2]);
        }
      },
    );
  }
});

// .all remarks [184]: read-only IDs; array.copy makes an independent array.
describe('Drawing ID array mutation paths', () => {
  for (const mutation of [
    'array.set(ids, 0, b)',
    'array.push(ids, a)',
    'array.pop(ids)',
    'array.shift(ids)',
    'array.unshift(ids, b)',
    'array.insert(ids, 1, a)',
    'array.remove(ids, 0)',
    'array.fill(ids, b)',
    'array.concat(ids, array.from(a))',
    'array.sort(ids, order.descending)',
    'array.reverse(ids)',
    'view = array.slice(ids, 0, 1)\narray.clear(view)',
  ]) {
    it(`refuses ${mutation} while permitting mutation of an explicit copy`, () => {
      const result = runCompatScript(`//@version=6
indicator("Read-only drawing mutation")
a = line.new(4, -7, 1, 13)
b = line.new(1, 19, 3, -3)
ids = line.all
editable = array.copy(ids)
array.clear(editable)
plot(array.size(editable), title="copy")
plot(array.size(ids), title="original")
${mutation}
plot(99, title="unreachable")`, { bars });
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'copy').values).toEqual([0]);
      expect(getPlot(result, 'original').values).toEqual([2]);
      expect(result.errors).toHaveLength(1);
      expect(result.plots.map((plot) => plot.title)).toEqual(['copy', 'original']);
      expect(result.drawings?.filter((drawing) => drawing.type === 'line')).toHaveLength(2);
    });
  }

  it('preserves read-only drawing IDs in a collection history snapshot', () => {
    const result = runCompatScript(`//@version=6
indicator("Read-only drawing history")
var a = line.new(4, -7, 1, 13)
var b = line.new(1, 19, 3, -3)
ids = line.all
if bar_index > 0
    previous = ids[1]
    array.clear(previous)
plot(array.size(ids), title="count")`, { bars: compatibilityBars.slice(0, 2) });
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(getPlot(result, 'count').values).toEqual([2]);
    expect(result.drawings?.filter((drawing) => drawing.type === 'line')).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic';

// Each citation lists entries in https://www.tradingview.com/pine-script-reference/v6/.
// Entries28/53 define history and missing values; entries12/14/459/460/464 define the transported kinds.
const bars = [11, 23, 37, 53].map((close, i) => ({
  time: i * 60000,
  open: close,
  high: close + 2,
  low: close - 3,
  close,
  volume: 7 + i,
}));
const tests = [
  ...[
    {
      rank: 1838,
      type: 'array<float>',
      init: 'array.from(close, -close)',
      read: 'array.get(past, 1)',
      citation: 459,
      values: [-1, -11, -23, -37],
    },
    {
      rank: 1839,
      type: 'matrix<float>',
      init: 'matrix.new<float>(1, 2, close)',
      read: 'matrix.get(past, 0, 1)',
      citation: 460,
      values: [-1, 11, 23, 37],
    },
    {
      rank: 1840,
      type: 'map<string, float>',
      init: 'map.new<string, float>()',
      extra: 'map.put(current, "x", close)',
      read: 'map.get(past, "x")',
      citation: 464,
      values: [-1, 11, 23, 37],
    },
  ].map((x) => ({
    rank: x.rank,
    name: x.type + ' unavailable and prior contents',
    citation: [28, 53, x.citation],
    body: `${x.type} current = ${x.init}\n${x.extra ?? ''}\npast = current[1]\nplot(na(past) ? 1 : 0)\nplot(na(past) ? -1 : ${x.read})`,
    expected: [[1, 0, 0, 0], x.values],
  })),
  {
    rank: 1841,
    name: 'drawing IDs all families unavailable history',
    citation: [28, 53, 454, 455, 456, 457, 458, 465],
    body: `l = line.new(bar_index, high, bar_index + 1, low)\nb = box.new(bar_index, high, bar_index + 1, low)\nt = label.new(bar_index, close)\np = polyline.new(array.from(chart.point.from_index(bar_index,close),chart.point.from_index(bar_index+1,close+1)))\nl2 = line.new(bar_index, low, bar_index + 1, high)\nf = linefill.new(l,l2,color.red)\nvar table tb = table.new(position.top_right,1,1)\nplot(na(l[1]) ? 1 : 0)\nplot(na(b[1]) ? 1 : 0)\nplot(na(t[1]) ? 1 : 0)\nplot(na(p[1]) ? 1 : 0)\nplot(na(f[1]) ? 1 : 0)\nplot(na(tb[1]) ? 1 : 0)`,
    expected: Array.from({ length: 6 }, () => [1, 0, 0, 0]),
  },
  {
    rank: 1842,
    name: 'UDT missing ID and earlier object instance',
    citation: [14, 28, 53],
    body: `type Sample\n    float value\nid = Sample.new(close)\npast = id[1]\nplot(na(past) ? 1 : 0)\nplot(na(past) ? -1 : past.value)`,
    expected: [
      [1, 0, 0, 0],
      [-1, 11, 23, 37],
    ],
  },
  {
    rank: 1843,
    name: 'prior array instance differs from current element index',
    citation: [28, 459],
    body: `a = array.from(close,-close)\npast = a[1]\nplot(na(past) ? -1 : array.get(past,0))\nplot(array.get(a,1))`,
    expected: [
      [-1, 11, 23, 37],
      [-11, -23, -37, -53],
    ],
  },
  {
    rank: 1846,
    name: 'v6 history object then member direct parenthesized syntax',
    citation: [14, 28],
    body: `type Sample\n    float value\nid = Sample.new(close)\nplot(na(id[1]) ? -1 : (id[1]).value)`,
    expected: [[-1, 11, 23, 37]],
  },
];

describe('history value kinds and prior instance transport', () => {
  for (const test of tests) {
    it(`rank${test.rank}: ${test.name} (reference entries${test.citation.join(',')})`, () => {
      const source = `//@version=6\nindicator("History transport")\n${test.body}`;
      const ast = parse(source);
      expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual(test.expected);
    });
  }
});

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = Array.from({ length: 16 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 10,
}));
const sources: Record<string, string> = {
  'array-fill-range--1-2-v6-v1':
    '//@version=6\nindicator("V7 array-fill-range--1-2-v6-v1")\na = array.from(1,2,3)\nif bar_index == 3\n    array.fill(a,9,-1,2)\nplot(array.get(a,0),"FIRST")\nplot(array.get(a,1),"SECOND")\nplot(array.get(a,2),"THIRD")\n',
  'array-fill-range-0-5-v6-v1':
    '//@version=6\nindicator("V7 array-fill-range-0-5-v6-v1")\na = array.from(1,2,3)\nif bar_index == 3\n    array.fill(a,9,0,5)\nplot(array.get(a,0),"FIRST")\nplot(array.get(a,1),"SECOND")\nplot(array.get(a,2),"THIRD")\n',
  'array-fill-range-2-1-v6-v1':
    '//@version=6\nindicator("V7 array-fill-range-2-1-v6-v1")\na = array.from(1,2,3)\nif bar_index == 3\n    array.fill(a,9,2,1)\nplot(array.get(a,0),"FIRST")\nplot(array.get(a,1),"SECOND")\nplot(array.get(a,2),"THIRD")\n',
};
const run = (name: string) => executeScript(parse(sources[name]), bars);
// Native v7 RE10045 establishes rejected endpoints; post-error mutation remains unobserved.
describe('native array fill ranges', () => {
  it.each([
    ['array-fill-range--1-2-v6-v1', '-1'],
    ['array-fill-range-0-5-v6-v1', '5'],
  ])('rejects %s at captured endpoints', (name, index) => {
    const r = run(name);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].message).toContain('Index ' + index);
    expect(r.plots[0].values).toEqual([1, 1, 1]);
  });
  it('keeps reversed range no-op', () => {
    const r = run('array-fill-range-2-1-v6-v1');
    expect(r.errors).toEqual([]);
    expect(r.plots[0].values).toEqual(Array(16).fill(1));
  });
});

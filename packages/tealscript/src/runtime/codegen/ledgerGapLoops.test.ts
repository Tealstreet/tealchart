import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const bars = [1, 2].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
const execute = (body: string, version = 6) =>
  executeScript(parse(`//@version=${version}\nindicator("ledger loops")\n${body}\n`), bars);
const mapSetup = 'm = map.new<string, int>()\nmap.put(m, "A", 1)\nmap.put(m, "B", 2)\n';

describe('ledger gaps 161–165: loops (official loops manual and for...in remarks)', () => {
  it('161: v5 fixes the end boundary while v6 reevaluates it', () => {
    const body = 'end = 3\ncount = 0\nfor i = 0 to end\n    count += 1\n    end := 0\nplot(count)';
    expect(execute(body, 5).plots[0].values).toEqual([4, 4]);
    expect(execute(body, 6).plots[0].values).toEqual([1, 1]);
  });
  it.each([5, 6])('162: an na end prevents iteration in v%i', (version) => {
    const result = execute('int end = na\ncount = 0\nfor i = 0 to end\n    count += 1\nplot(count)', version);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([0, 0]);
  });
  it('163: counter shadows an outer name and is unavailable after the loop', () => {
    expect(
      execute('i = 9\ncount = 0\nfor i = 1 to 2\n    count += i\nplot(i)\nplot(count)').plots.map((p) => p.values),
    ).toEqual([
      [9, 9],
      [3, 3],
    ]);
    expect(
      errors('//@version=6\nindicator("scope")\nfor i = 1 to 2\n    x = i\nplot(i)').some(
        (d) => d.message.includes('i') && d.code === 'unknown-identifier',
      ),
    ).toBe(true);
  });
  it('164: rejects a single-variable direct map loop', () => {
    expect(
      errors(`//@version=6\nindicator("map")\n${mapSetup}for value in m\n    log.info(str.tostring(value))`).some(
        (d) => d.message.includes('map') && d.message.includes('pair'),
      ),
    ).toBe(true);
  });
  it('164: paired map iteration preserves insertion order', () => {
    const result = execute(
      mapSetup + 'result = 0\nfor [key, value] in m\n    result := result * 10 + value\nplot(result)',
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([12, 12]);
  });
  it.each(['map.put(m, "C", 3)', 'map.remove(m, key)', 'map.clear(m)'])(
    '165: refuses map size mutation: %s',
    (mutation) => {
      const result = execute(mapSetup + `for [key, value] in m\n    ${mutation}\nplot(map.size(m))`);
      expect(result.errors.some((e) => e.message.toLowerCase().includes('map') && e.message.includes('size'))).toBe(
        true,
      );
    },
  );
  it('165: permits replacing an existing value and modifying a map via its keys array', () => {
    const result = execute(
      mapSetup +
        'for [key, value] in m\n    map.put(m, key, value + 1)\nfor key in map.keys(m)\n    map.remove(m, key)\nplot(map.size(m))',
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([0, 0]);
  });
  it('165: catches an alias mutation inside a UDF before a break', () => {
    const result = execute(
      'grow(map<string, int> target) =>\n    map.put(target, "C", 3)\n' +
        mapSetup +
        'alias = m\nfor [key, value] in m\n    grow(alias)\n    break\nplot(map.size(m))',
    );
    expect(result.errors.some((e) => e.message.includes('Map cannot change size'))).toBe(true);
  });
  it('165: releases nested iteration guards when breaking', () => {
    const result = execute(
      mapSetup +
        'for [key, value] in m\n    for [innerKey, innerValue] in m\n        break\n    break\nmap.put(m, "C", 3)\nplot(map.size(m))',
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([3, 3]);
  });
  it('165: iterating a copy permits resizing the original', () => {
    const result = execute(mapSetup + 'for [key, value] in map.copy(m)\n    map.remove(m, key)\nplot(map.size(m))');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([0, 0]);
  });
});

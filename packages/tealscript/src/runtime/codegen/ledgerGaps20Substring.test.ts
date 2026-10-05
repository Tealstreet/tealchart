import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [1, 2].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const run = (body: string) => executeScript(parse(`//@version=6\nindicator("substring bounds")\n${body}`), bars);

// Current strings manual, "Locating and retrieving substrings": invalid begin
// errors; end before begin errors; absent/out-of-length end includes the tail.
describe('ledger771–772: documented substring bounds', () => {
  it.each([
    'str.substring("abcd", -1)',
    'str.substring(source="abcd", begin_pos=-1, end_pos=2)',
    'str.substring("abcd", bar_index - 1)',
    'str.substring("abcd", 5)',
    'str.substring("abcd", 3, 1)',
    'str.substring(end_pos=1, source="abcd", begin_pos=3)',
    'str.substring("abcd", 2, bar_index)',
  ])('rejects invalid bounds %s', (expression) => {
    const result = run(`plot(str.length(${expression}))`);
    expect(result.errors.some((error) => error.message.includes('str.substring'))).toBe(true);
    expect(result.errors[0]).toEqual(expect.objectContaining({ code: 'runtime.error' }));
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  });
  it('preserves equal, omitted, out-of-length and zero-based bounds', () => {
    const result = run(
      'plot(str.substring("abcd", 1, 3) == "bc" ? 1 : 0)\nplot(str.substring("abcd", 2, 2) == "" ? 1 : 0)\nplot(str.substring("abcd", 1) == "bcd" ? 1 : 0)\nplot(str.substring("abcd", 1, 20) == "bcd" ? 1 : 0)\nplot(str.substring("abcd", 0, 1) == "a" ? 1 : 0)\nplot(str.substring("abcd", 4) == "" ? 1 : 0)',
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual(Array.from({ length: 6 }, () => [1, 1]));
  });
  it('an NA beginning denotes zero', () => {
    const result = run('int begin = na\nplot(str.substring("abcd", begin, 2) == "ab" ? 1 : 0)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
  });
});

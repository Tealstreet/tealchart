import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

const cases = [
  ['persistent-while', `var bool result = while false\n    true\nplot(result == false ? 0 : 1, "Result")`, 0],
  [
    'UDF-while-tail',
    `getResult() =>\n    while false\n        true\nresult = getResult()\nplot(result == false ? 0 : 1, "Result")`,
    0,
  ],
  [
    'UDF-tuple-tail',
    `pair() => [7, true]\n[number, flag] = while false\n    pair()\nplot(na(number) ? 1 : 0, "Number")\nplot(flag == false ? 0 : 1, "Flag")`,
    [1, 0],
  ],
  [
    'evaluated-false-before-break',
    `result = for i = 0 to 2\n    if i == 1\n        break\n    false\nplot(result == false ? 0 : 1, "Result")`,
    0,
  ],
  ['evaluated-true-tail', `result = for i = 0 to 2\n    true\nplot(result == true ? 1 : 0, "Result")`, 1],
  ['while-bool-zero', `result = while false\n    true\nplot(result == false ? 0 : 1, "Result")`, 0],
  [
    'for-bool-na',
    `int endpoint = na\nresult = for i = 0 to endpoint\n    true\nplot(result == false ? 0 : 1, "Result")`,
    0,
  ],
  [
    'for-in-bool-empty',
    `values = array.new<int>()\nresult = for value in values\n    true\nplot(result == false ? 0 : 1, "Result")`,
    0,
  ],
  ['while-bool-break-first', `result = while true\n    break\n    true\nplot(result == false ? 0 : 1, "Result")`, 0],
  [
    'while-tuple-zero',
    `[number, flag] = while false\n    [7, true]\nplot(na(number) ? 1 : 0, "Number")\nplot(flag == false ? 0 : 1, "Flag")`,
    [1, 0],
  ],
  [
    'for-tuple-zero',
    `int endpoint = na\n[number, flag] = for i = 0 to endpoint\n    [7, true]\nplot(na(number) ? 1 : 0, "Number")\nplot(flag == false ? 0 : 1, "Flag")`,
    [1, 0],
  ],
  [
    'while-bool-assignment',
    `bool result = true\nresult := while false\n    true\nplot(result == false ? 0 : 1, "Result")`,
    0,
  ],
] as const;

// Official v6 for/for...in/while specifies false for unevaluated bool returns.
describe('Pine unevaluated loop boolean defaults', () => {
  it.each(cases)('%s', (_, body, expected) => {
    const r = runCompatScript('//@version=6\nindicator("Loop defaults")\n' + body);
    expect(r.errors).toEqual([]);
    const results = Array.isArray(expected) ? expected : [expected];
    expect(r.plots.map((p) => p.values)).toEqual(results.map((v) => Array(12).fill(v)));
  });
  it('preserves v5 unavailable boolean results', () => {
    const r = runCompatScript(
      '//@version=5\nindicator("Legacy loop")\nresult = while false\n    true\nplot(na(result) ? 1 : 0)',
    );
    expect(r.errors).toEqual([]);
    expect(r.plots[0].values).toEqual(Array(12).fill(1));
  });
});

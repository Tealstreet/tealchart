import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [11, 4, 9, 2].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100 + index,
}));

function values(body: string): Array<Array<number | null>> {
  const program = parse(`//@version=6\nindicator("Execution model")\n${body}\n`);
  expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeScript(program, bars);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('ledger gaps 45: historical execution and regular declarations', () => {
  it('1761 executes each historical bar once in chronological order', () => {
    expect(
      values(`var int visits = 0
var int sequence = 0
visits += 1
sequence := sequence * 10 + bar_index + 1
plot(visits)
plot(sequence)
plot(time)
plot(close)`),
    ).toEqual([
      [1, 2, 3, 4],
      [1, 12, 123, 1234],
      [60_000, 120_000, 180_000, 240_000],
      [11, 4, 9, 2],
    ]);
  });

  it('1762 retains observations made before reassignment', () => {
    expect(
      values(`value = bar_index
before = value
value := value + 10
after = value
value := value * 2
plot(before)
plot(after)
plot(value)`),
    ).toEqual([
      [0, 1, 2, 3],
      [10, 11, 12, 13],
      [20, 22, 24, 26],
    ]);
  });

  it('1794 reinitializes a regular loop-local variable on every iteration', () => {
    expect(
      values(`int total = 0
for i = 1 to 3
    int localValue = 0
    localValue += i
    total += localValue
plot(total)`),
    ).toEqual([[6, 6, 6, 6]]);
  });

  it('1795 reinitializes a tuple declaration on every bar after reassignment', () => {
    expect(
      values(`pair() => [bar_index, bar_index + 10]
[left, right] = pair()
before = left
left := left + 100
plot(before)
plot(left)
plot(right)`),
    ).toEqual([
      [0, 1, 2, 3],
      [100, 101, 102, 103],
      [10, 11, 12, 13],
    ]);
  });

  // ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries[30], reassignment example.
  it('1796 updates the existing outer variable from a nested scope', () => {
    expect(
      values(`int target = 1
if true
    target := target + 2
    if true
        target += 4
plot(target)`),
    ).toEqual([[7, 7, 7, 7]]);
  });

  // ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries[30], local-scope example.
  // Ranks1679/1798: https://www.tradingview.com/pine-script-docs/language/variable-declarations/#scopes
  it('1798 permits inner scopes to read earlier outer declarations', () => {
    expect(
      values(`int outerValue = 9
int result = 0
if true
    int innerValue = outerValue + 3
    if true
        result := innerValue + outerValue
plot(result)
plot(outerValue)`),
    ).toEqual([
      [21, 21, 21, 21],
      [9, 9, 9, 9],
    ]);
  });

  // Ranks1679/1798: entries[30] distinguishes local declaration from outer reassignment.
  it('1798 keeps a shadowed local container separate from its outer namesake', () => {
    expect(
      values(`int namedValue = 9
int result = 0
if true
    int namedValue = 17
    namedValue += 3
    result := namedValue
plot(result)
plot(namedValue)`),
    ).toEqual([
      [20, 20, 20, 20],
      [9, 9, 9, 9],
    ]);
  });

  it('1798 resolves reads before a local declaration to the outer container', () => {
    expect(
      values(`int namedValue = 9
int result = 0
if true
    result := namedValue
    int namedValue = 17
    result += namedValue
plot(result)
plot(namedValue)`),
    ).toEqual([
      [26, 26, 26, 26],
      [9, 9, 9, 9],
    ]);
  });

  it('1798 keeps outer history separate from local declarations and assignments', () => {
    expect(
      values(`int namedValue = bar_index + 9
int result = 0
if true
    int namedValue = 17
    namedValue += 3
    result := namedValue
plot(result)
plot(namedValue)
plot(namedValue[1])`),
    ).toEqual([
      [20, 20, 20, 20],
      [9, 10, 11, 12],
      [null, 9, 10, 11],
    ]);
  });

  it('1798 keeps local loop declarations separate from a global regular variable', () => {
    expect(
      values(`int namedValue = 9
int result = 0
for i = 1 to 3
    int namedValue = i * 2
    result += namedValue
plot(result)
plot(namedValue)`),
    ).toEqual([
      [12, 12, 12, 12],
      [9, 9, 9, 9],
    ]);
  });

  it('1798 keeps a regular local declaration separate from a persistent global', () => {
    expect(
      values(`var int namedValue = 9
int result = 0
if true
    int namedValue = 17
    namedValue += 3
    result := namedValue
plot(result)
plot(namedValue)`),
    ).toEqual([
      [20, 20, 20, 20],
      [9, 9, 9, 9],
    ]);
  });
  it('1798 resolves a shadow initializer against the earlier outer declaration', () => {
    expect(
      values(`int namedValue = 9
int result = 0
if true
    int namedValue = namedValue + 1
    result := namedValue
plot(result)
plot(namedValue)`),
    ).toEqual([
      [10, 10, 10, 10],
      [9, 9, 9, 9],
    ]);
  });

  it('1798 preserves both earlier containers when nested local shadows initialize', () => {
    expect(
      values(`int namedValue = 9
int result = 0
if true
    int namedValue = namedValue + 1
    if true
        int namedValue = namedValue + 2
        result := namedValue
    result += namedValue
plot(result)
plot(namedValue)`),
    ).toEqual([
      [22, 22, 22, 22],
      [9, 9, 9, 9],
    ]);
  });
  it('1798 uses the active local scalar when a shadow is passed to SMA', () => {
    expect(
      values(`float namedValue = close * 10
float result = na
if true
    float namedValue = close
    result := ta.sma(namedValue, 2)
plot(result)
plot(namedValue)`),
    ).toEqual([
      [null, 7.5, 6.5, 5.5],
      [110, 40, 90, 20],
    ]);
  });
});

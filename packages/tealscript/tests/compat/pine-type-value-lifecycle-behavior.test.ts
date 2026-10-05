import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { getPlot } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// Ledger: type-qualifier-system-v1. Narrow cases do not certify sibling objects.
const closes = [5, -3, 0, 9, 2, -7];
const bars: Bar[] = closes.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close + 1, low: close - 1, close, volume: 10,
}));

function run(body: string, inputs?: Map<string, unknown>) {
  const result = executeScript(parse('//@version=6\nindicator("Value lifecycle")\n' + body), bars, inputs);
  expect(result.errors).toEqual([]);
  return result;
}

// Reference keyword/var example: var a=close keeps first bar's close; reassignment
// remains possible. Nonmonotonic bars reject min/max/last/zero initialization.
// RED: emitter var initialization guard became unconditional; failed/pass.
it('var initializes only once but can later be reassigned [keyword/var]', () => {
  const result = run('var first = close\nvar changed = close\nif bar_index == 3\n    changed := close\nplot(first, title="First")\nplot(changed, title="Changed")');
  expect(getPlot(result, 'First').values).toEqual([5, 5, 5, 5, 5, 5]);
  expect(getPlot(result, 'Changed').values).toEqual([5, 5, 5, 9, 9, 9]);
});

// Reference function/input.float returns input float; linked manual #input says
// settings establish values before execution and they remain fixed throughout.
// Distinct overrides reject default-only and one-bar-delayed initialization.

// RED: emitter emitInputCall returned defval instead of ctx.input; failed/pass.
it('input settings apply before the first bar and stay fixed for the run [function/input.float]', () => {
  for (const configured of [-11.25, 3.5]) {
    const result = run('value = input.float(2.5, "Configured")\nplot(value, title="Value")', new Map([['input_Configured', configured]]));
    expect(getPlot(result, 'Value').values).toEqual(Array(6).fill(configured));
  }
});

// Reference variable/close describes current close; type/series values may change.
// RED: emitter builtin series reads used offset 1 instead of 0; failed/pass.
it('series values expose each current bar rather than a frozen or lagged value [variable/close, type/series]', () => {
  expect(getPlot(run('plot(close, title="Value")'), 'Value').values).toEqual(closes);
});

// Reference type/array and function/array.copy; linked type manual
// #value-vs-reference-types says assignment aliases the object and reassignment
// changes only the variable's ID. Mutation and rebinding distinguish both cases.


// RED: emitter cloned array identifiers on value reads; failed, restored pass.
it('ordinary reference assignment aliases the array while reassignment changes only one ID [type/array]', () => {
  const result = run('original = array.from(close)\nalias = original\narray.set(alias, 0, close + 10)\nplot(array.get(original, 0), title="Shared")\noriginal := array.from(close - 20)\nplot(array.get(original, 0), title="Rebound")\nplot(array.get(alias, 0), title="Alias")');
  expect(getPlot(result, 'Shared').values).toEqual([15, 7, 10, 19, 12, 3]);
  expect(getPlot(result, 'Rebound').values).toEqual([-15, -23, -20, -11, -18, -27]);
  expect(getPlot(result, 'Alias').values).toEqual([15, 7, 10, 19, 12, 3]);
});

// Reference function/array.copy description and return: creates a copy.
// Both mutation directions reject a cloned wrapper sharing the original payload.
// RED: emitter array.copy returned the original ID; failed, restored pass.
it('array.copy creates independent element storage [function/array.copy]', () => {
  const result = run('original = array.from(close)\ncopied = array.copy(original)\narray.set(original, 0, close + 10)\nplot(array.get(copied, 0), title="Before")\narray.set(copied, 0, close - 20)\nplot(array.get(original, 0), title="Original")\nplot(array.get(copied, 0), title="Copy")');
  expect(getPlot(result, 'Before').values).toEqual(closes);
  expect(getPlot(result, 'Original').values).toEqual([15, 7, 10, 19, 12, 3]);
  expect(getPlot(result, 'Copy').values).toEqual([-15, -23, -20, -11, -18, -27]);
});

// Reference type/bool (linked manual #bool) and operator/[]: missing boolean
// history in v6 is false. Comparing with false rejects merely coercing NaN in a
// ternary, which would look correct while the stored history stayed undefined.

// Natural RED: bool history is NaN on bar zero. TYPE-BOOL-MISSING-HISTORY.
// Inverse GREEN: isolated emitter uses false for missing typed bool history.
it('unavailable v6 bool history is false [type/bool, operator/[]]', () => {
  const result = run('value = bar_index == 2\nplot(value[1] == false ? 1 : 0, title="Value")');
  expect(getPlot(result, 'Value').values).toEqual([1, 1, 1, 0, 1, 1]);
});

// Reference keyword/if detailedDesc lists omitted-else defaults; type/bool's
// linked manual specifically assigns false to inactive bool-returning structures.
// No analogous string test: reference/manual authorities conflict for strings.

// Natural RED: omitted else returns NaN. TYPE-BOOL-INACTIVE-CONDITIONAL.
// Inverse GREEN: isolated emitter initializes bool-valued if defaults to false.
it('an inactive bool-valued if without else returns false [keyword/if, type/bool]', () => {
  const result = run('value = if bar_index == 2\n    true\nplot(value == false ? 1 : 0, title="Value")');
  expect(getPlot(result, 'Value').values).toEqual([1, 1, 0, 1, 1, 1]);
});

// Reference operator/[] and function/na: numeric missing history remains unavailable.
// RED: bool history normalization was applied to every type; failed, restored passed.
it('numeric history remains unavailable instead of becoming false [operator/[], function/na, type/float]', () => {
  const result = run('float value = close\nplot(na(value[1]) ? 1 : 0, title="Value")');
  expect(getPlot(result, 'Value').values).toEqual([1, 0, 0, 0, 0, 0]);
});

// Reference keyword/if and type/float linked manual: numeric inactive returns na.
// RED: omitted-else false default was applied to every type; failed, restored passed.
it('an inactive float-valued if stays unavailable [keyword/if, type/float, function/na]', () => {
  const result = run('float value = if bar_index == 2\n    7.0\nplot(na(value) ? 1 : 0, title="Value")');
  expect(getPlot(result, 'Value').values).toEqual([1, 1, 0, 1, 1, 1]);
});

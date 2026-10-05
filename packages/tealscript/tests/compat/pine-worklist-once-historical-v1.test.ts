import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = Array.from({ length: 6 }, (_, i) => ({ time: i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));

// Reference kw_once: omitted condition true; first closed true execution deactivates.
for (const version of [5, 6]) {
  it(`v${version} omitted and explicit true activate once, while delayed false waits`, () => {
    const result = executeScript(parse(`//@version=${version}
indicator("Once historical activation")
var int omitted = 0
var int explicit = 0
var int delayed = 0
var int never = 0
once
    omitted += 1
once true
    explicit += 1
once bar_index >= 2
    delayed += 1
once false
    never += 1
plot(omitted, "omitted")
plot(explicit, "explicit")
plot(delayed, "delayed")
plot(never, "never")`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual([Array(6).fill(1), Array(6).fill(1), [0, 0, 1, 1, 1, 1], Array(6).fill(0)]);
  });
}

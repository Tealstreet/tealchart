import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = Array.from({ length: 802 }, (_, index) => ({
  time: (index + 1) * 120_000,
  open: index + 1,
  high: index + 2,
  low: index,
  close: index + 1,
  volume: 10,
}));

const source = `//@version=6
indicator("Historical reload witness", max_lines_count=5)
var int count = 0
var samples = array.new_int()
count += 1
array.push(samples, count)
plot(count, "Count")
plot(array.size(samples), "Samples")
depth = bar_index > 700 ? 600 : 1
plot(close[depth], "Past")
if barstate.islast
    line.new(bar_index, count, bar_index + 1, array.get(samples, 0))
`;

function run(maxBarsBack?: number) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const OriginalScript = compiled.ScriptClass;
  let constructions = 0;
  compiled.ScriptClass = class extends OriginalScript {
    constructor(...args: ConstructorParameters<typeof OriginalScript>) {
      super(...args);
      constructions += 1;
    }
  };
  const result = executeCompiled(compiled, bars, undefined, { maxBarsBack });
  if (!result) throw new Error('Missing compiled result');
  return { result, constructions };
}

// https://www.tradingview.com/pine-script-docs/language/execution-model/#historical-buffers
describe('rank1785 historical enlargement reload', () => {
  it('recreates the script and resets persistent collections, plots and drawing IDs', () => {
    const restarted = run();
    const sized = run(800);
    expect(restarted.constructions).toBeGreaterThan(1);
    expect(sized.constructions).toBe(1);
    expect(restarted.result.errors).toEqual([]);
    expect(sized.result.errors).toEqual([]);
    expect(restarted.result.plots).toEqual(sized.result.plots);
    expect(restarted.result.drawings).toEqual(sized.result.drawings);
    expect(restarted.result.drawings).toHaveLength(1);
    expect(restarted.result.plots[0].values).toEqual(bars.map((_, index) => index + 1));
    expect(restarted.result.plots[1].values).toEqual(bars.map((_, index) => index + 1));
    expect(restarted.result.plots[2].values[701]).toBe(102);
  });
});

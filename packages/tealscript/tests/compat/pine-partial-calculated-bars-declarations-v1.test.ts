import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// entries[476], indicator.args calc_bars_count: const int; zero starts at dataset first bar.
const bars = Array.from({ length: 5 }, (_, index) => ({
  time: (index + 1) * 60_000,
  open: index,
  high: index + 2,
  low: index - 1,
  close: index + 1,
  volume: 10,
}));

function run(count: string) {
  return executeScript(
    parse(`//@version=6
indicator("Declaration history", calc_bars_count=${count})
var float total=0
total += close
plot(total)
plot(bar_index)
plot(close[1])`),
    bars,
  );
}

describe('PARTIAL calculated-bars declaration boundaries', () => {
  it.each(['0', '8'])('uses the available dataset for count %s with a positive selection control', (count) => {
    const result = run(count);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [1, 3, 6, 10, 15],
      [0, 1, 2, 3, 4],
      [null, 1, 2, 3, 4],
    ]);
    expect(run('3').plots.map((plot) => plot.values)).toEqual([
      [null, null, 3, 7, 12],
      [null, null, 0, 1, 2],
      [null, null, null, 3, 4],
    ]);
  });

  it('evaluates a const integer expression before selecting and rebasing history', () => {
    const result = run('1 + 2');
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [null, null, 3, 7, 12],
      [null, null, 0, 1, 2],
      [null, null, null, 3, 4],
    ]);
  });

  it('resolves a named const integer before selecting history, rank1782', () => {
    const program = parse(`//@version=6
const int BASE = 1
const int COUNT = BASE + 2
indicator("Named declaration history", calc_bars_count=COUNT)
plot(bar_index)
plot(close)
plot(close[1])`);
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [null, null, 0, 1, 2],
      [null, null, 3, 4, 5],
      [null, null, null, 3, 4],
    ]);
  });
});

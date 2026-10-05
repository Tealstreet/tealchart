import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const tuple = '[7, 3.0, true, #123456, "alpha"]';
const names = ['count', 'level', 'enabled', 'shade', 'caption'];
const kinds = ['int', 'float', 'bool', 'color', 'string'];
const program = (body: string) => parse(`//@version=6\nindicator("Tuple element types")\n${body}`);

// https://www.tradingview.com/pine-script-docs/language/type-system/#tuples
// Rank1866: each tuple element has its own inferred type and binding position.
describe('worklist 1866 heterogeneous tuple inference', () => {
  it.each([tuple, 'values()'])('infers each element type from %s', (initializer) => {
    const result = checkProgram(program(`values() => ${tuple}\n[${names.join(', ')}] = ${initializer}`));
    expect(result.diagnostics).toEqual([]);
    expect(names.map((name) => result.symbols.find((symbol) => symbol.name === name)?.type?.kind)).toEqual(kinds);
  });

  it('keeps inferred types in declaration order', () => {
    const result = checkProgram(program('[caption, shade, enabled, level, count] = ["alpha", #123456, true, 3.0, 7]'));
    expect(result.diagnostics).toEqual([]);
    expect(names.map((name) => result.symbols.find((symbol) => symbol.name === name)?.type?.kind)).toEqual(kinds);
  });

  it.each([tuple, 'values()'])('preserves compiled element values from %s', (initializer) => {
    const ast = program(`values() => ${tuple}
[${names.join(', ')}] = ${initializer}
plot(count, "Count")
plot(level, "Level")
plot(enabled ? 1 : 0, "Enabled")
plot(shade == #123456 ? 1 : 0, "Color")
plot(caption == "alpha" ? 1 : 0, "Caption")`);
    expect(checkProgram(ast).diagnostics).toEqual([]);
    const bars = [0, 1, 2].map((index) => ({
      time: (index + 1) * 60_000,
      open: 10,
      high: 12,
      low: 8,
      close: 11,
      volume: 100,
    }));
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    for (const [title, value] of [
      ['Count', 7],
      ['Level', 3],
      ['Enabled', 1],
      ['Color', 1],
      ['Caption', 1],
    ] as const) {
      expect(result.plots.find((plot) => plot.title === title)?.values).toEqual([value, value, value]);
    }
  });
});

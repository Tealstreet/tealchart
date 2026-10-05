import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const qualifierArguments = {
  const: ['7', '7.75'],
  input: ['input.int(7)', 'input.float(7.75)'],
  simple: ['simpleInt', 'simpleFloat'],
  series: ['bar_index', 'close'],
} as const;

describe('ledger gaps 81–83 and 90–97: numeric cast overload contracts', () => {
  for (const [ranks, cast, strongest] of [
    ['81', 'float', 'simple'],
    ['82–83', 'float', 'series'],
    ['90–91', 'int', 'simple'],
    ['92–93', 'int', 'input'],
    ['94–95', 'int', 'const'],
    ['96–97', 'int', 'series'],
  ] as const) {
    it(`ranks ${ranks}: ${cast} accepts int/float arguments through ${strongest} and preserves the argument qualifier`, () => {
      for (const [qualifier, expressions] of Object.entries(qualifierArguments)) {
        for (const expression of expressions) {
          const checked = checkProgram(
            parse(`//@version=6
indicator("Cast qualifiers")
simple int simpleInt = 7
simple float simpleFloat = 7.75
converted = ${cast}(x = ${expression})
plot(converted)
`),
          );
          expect(checked.diagnostics).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'converted')?.type).toEqual({
            kind: cast,
            qualifier,
          });
        }
        if (qualifier === strongest) break;
      }
      for (const invalid of ['true', '\"7\"', '#123456']) {
        const checked = checkProgram(
          parse(`//@version=6
indicator("Invalid numeric cast")
converted = ${cast}(x = ${invalid})
plot(converted)
`),
        );
        expect(checked.diagnostics).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(`${cast} x`) }),
          ]),
        );
      }
    });
  }
});

describe('ledger gaps 86–89: int truncation and unavailable values', () => {
  for (const [rank, qualifier] of [
    [86, 'simple'],
    [87, 'input'],
    [88, 'const'],
    [89, 'series'],
  ] as const) {
    it(`rank ${rank}: int casts ${qualifier} na to na and truncates both signs toward zero`, () => {
      const declarations =
        qualifier === 'input'
          ? 'absent = input.float(float(na), "Absent")\npositive = input.float(3.75, "Positive")\nnegative = input.float(-3.75, "Negative")'
          : `${qualifier} float absent = na\n${qualifier} float positive = 3.75\n${qualifier} float negative = -3.75`;
      const source = `//@version=6
indicator("Unavailable int cast")
${declarations}
missing = int(absent)
up = int(positive)
down = int(x = negative)
plot(missing, "missing")
plot(na(missing) ? 1 : 0, "missing flag")
plot(up, "positive")
plot(down, "negative")
`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics).toEqual([]);
      for (const name of ['missing', 'up', 'down']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'int', qualifier });
      }
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'missing').values).toEqual(Array(12).fill(null));
      expect(getPlot(result, 'missing flag').values).toEqual(Array(12).fill(1));
      expect(getPlot(result, 'positive').values).toEqual(Array(12).fill(3));
      expect(getPlot(result, 'negative').values).toEqual(Array(12).fill(-3));
    });
  }

  it('rank 85: unavailable int history is na, then yields committed integer values', () => {
    const source = `//@version=6
indicator("Integer history")
value = int(close)
prior = value[2]
plot(prior, "history")
plot(na(prior) ? 1 : 0, "missing flag")
`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'history').values).toEqual([null, null, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111]);
    expect(getPlot(result, 'missing flag').values).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.repeat';
const slots = ['source', 'repeat', 'separator'] as const;
const qualifiers = ['input', 'simple', 'series'] as const;

function certify(slot: (typeof slots)[number] | undefined, qualifier: 'const' | (typeof qualifiers)[number]) {
  const source =
    slot === 'source' && qualifier === 'input'
      ? 'input.string("a")'
      : slot === 'source' && qualifier === 'series'
        ? 'bar_index % 2 == 0 ? "a" : "b"'
        : '"a"';
  const repeat =
    slot === 'repeat' && qualifier === 'input'
      ? 'input.int(2)'
      : slot === 'repeat' && qualifier === 'series'
        ? 'bar_index % 3 + 1'
        : '2';
  const separator =
    slot === 'separator' && qualifier === 'input'
      ? 'input.string("|")'
      : slot === 'separator' && qualifier === 'series'
        ? 'bar_index % 2 == 0 ? "|" : ":"'
        : '"|"';
  const expected =
    qualifier !== 'series'
      ? ['a|a', 'a|a', 'a|a']
      : slot === 'source'
        ? ['a|a', 'b|b', 'a|a']
        : slot === 'repeat'
          ? ['a', 'a|a', 'a|a|a']
          : ['a|a', 'a:a', 'a|a'];
  const script = `//@version=6
indicator("Repeat overload qualifier")
${slot === 'source' ? qualifier : 'const'} string sourceValue = ${source}
${slot === 'repeat' ? qualifier : 'const'} int repeatCount = ${repeat}
${slot === 'separator' ? qualifier : 'const'} string separatorValue = ${separator}
repeatedValue = str.repeat(separator=separatorValue, source=sourceValue, repeat=repeatCount)
positionalValue = str.repeat(sourceValue, repeatCount, separatorValue)
expectedValue = bar_index == 0 ? ${JSON.stringify(expected[0])} : bar_index == 1 ? ${JSON.stringify(expected[1])} : ${JSON.stringify(expected[2])}
plot(repeatedValue == expectedValue ? 1 : 0, "named")
plot(positionalValue == expectedValue ? 1 : 0, "positional")`;
  const checked = checkProgram(parse(script));
  expect(
    checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    citation,
  ).toEqual([]);
  for (const name of ['repeatedValue', 'positionalValue']) {
    expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toEqual({
      kind: 'string',
      qualifier,
    });
  }
  const result = runCompatScript(script, { bars: compatibilityBars.slice(0, 3) });
  expect(result.errors, citation).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
  for (const name of ['named', 'positional']) {
    expect(getPlot(result, name).values, citation).toEqual([1, 1, 1]);
  }
}

describe('str.repeat explicit qualifier overloads [functions:322-325]', () => {
  it('keeps all-constant inputs const [functions:322]', () => certify(undefined, 'const'));
  for (const slot of slots) {
    for (const qualifier of qualifiers) {
      it(`${slot} selects the ${qualifier} result overload`, () => certify(slot, qualifier));
    }
  }
});

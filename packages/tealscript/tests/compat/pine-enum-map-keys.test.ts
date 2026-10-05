import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = compatibilityBars.slice(0, 3);
const enumSource = `enum symbols
    aapl = "NASDAQ:AAPL"
    tsla = "NASDAQ:TSLA"
    amzn = "NASDAQ:AMZN"`;

function errors(source: string) {
  return checkProgram(parse(`//@version=6\nindicator("Enum map keys")\n${enumSource}\n${source}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

describe('Pine maps with enum keys', () => {
  // https://www.tradingview.com/pine-script-reference/v6/#enum
  it('accepts enum map annotations and constructors and preserves distinct keys', () => {
    const source = `//@version=6
indicator("Enum map keys")
${enumSource}
map<symbols, float> data = map.new<symbols, float>()
data.put(symbols.aapl, 10)
data.put(symbols.tsla, 20)
data.put(symbols.amzn, 30)
data.put(symbols.aapl, close)
plot(data.get(symbols.aapl), title="Apple")
plot(data.get(symbols.tsla) + data.get(symbols.amzn), title="Others")
plot(data.size(), title="Size")
`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'Apple').values).toEqual([102, 105, 107]);
    expect(getPlot(result, 'Others').values).toEqual([50, 50, 50]);
    expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
  });

  it('accepts exported imported enums as map key types', () => {
    const libraries = new Map([
      [
        'Test/Symbols/1',
        parse(`library("Symbols")
export enum symbols
    aapl = "NASDAQ:AAPL"
    tsla = "NASDAQ:TSLA"
`),
      ],
    ]);
    const source = `//@version=6
indicator("Imported enum map")
import Test/Symbols/1 as lib
map<lib.symbols, float> data = map.new<lib.symbols, float>()
data.put(lib.symbols.aapl, close)
data.put(lib.symbols.tsla, 7)
plot(data.get(lib.symbols.aapl) + data.get(lib.symbols.tsla), title="Result")
`;
    expect(
      checkProgram(parse(source), { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    ).toEqual([]);
    const result = runCompatScript(source, { bars, engineOptions: { libraries } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Result').values).toEqual([109, 112, 114]);
  });

  // Maps of other collections requires a UDT wrapper; direct nesting is invalid.
  it('refuses direct nested collections while retaining enum key support', () => {
    const diagnostics = errors(`array<map<symbols, float>> data = array.new<map<symbols, float>>()
map<string, map<symbols, float>> nested = map.new<string, map<symbols, float>>()
`);
    expect(diagnostics).toHaveLength(4);
    for (const diagnostic of diagnostics) {
      expect(diagnostic).toMatchObject({
        code: 'invalid-type-template',
        message: expect.stringContaining('collections cannot directly contain other collections'),
      });
    }
    expect(
      errors(`type Wrapper
    map<symbols, float> data
array<Wrapper> rows = array.new<Wrapper>()
map<string, Wrapper> nested = map.new<string, Wrapper>()`),
    ).toEqual([]);
  });

  it('accepts and executes enum maps nested through UDT fields', () => {
    const source = `//@version=6
indicator("Wrapped enum maps")
${enumSource}
type Wrapper
    map<symbols, float> data
array<Wrapper> rows = array.new<Wrapper>()
map<string, Wrapper> nested = map.new<string, Wrapper>()
data = map.new<symbols, float>()
data.put(symbols.aapl, close)
wrapped = Wrapper.new(data)
rows.push(wrapped)
nested.put("last", wrapped)
plot(rows.first().data.get(symbols.aapl), title="Array")
plot(nested.get("last").data.get(symbols.aapl), title="Map")
`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'Array').values).toEqual([102, 105, 107]);
    expect(getPlot(result, 'Map').values).toEqual([102, 105, 107]);
  });

  it('keeps enum map assignment and key compatibility checks enabled', () => {
    const diagnostics = errors(`map<symbols, float> data = map.new<symbols, float>()
map<string, float> strings = map.new<string, float>()
map<symbols, float> wrong = strings
data.put("NASDAQ:AAPL", 1)
`);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['type-mismatch', 'type-mismatch']);
  });

  it.each(['label', 'array<float>', 'Pivot', 'Missing'])('continues rejecting %s map keys', (keyType) => {
    const diagnostics = errors(`type Pivot
    float price
map<${keyType}, float> data = map.new<${keyType}, float>()`);
    const keyErrors = diagnostics.filter((diagnostic) => diagnostic.code === 'invalid-type-template');
    expect(keyErrors).toHaveLength(keyType === 'array<float>' ? 4 : 2);
    expect(keyErrors.filter((diagnostic) => diagnostic.message.startsWith('Map key type must be'))).toHaveLength(2);
    if (keyType === 'array<float>') {
      expect(
        keyErrors.filter((diagnostic) => diagnostic.message.includes('collections cannot directly contain')),
      ).toHaveLength(2);
    }
  });
});

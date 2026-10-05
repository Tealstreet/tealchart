import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { InMemoryRequestDatafeed, seedRequestSymbol } from '../requestDatafeed';

const bars = Array.from({ length: 50 }, (_, index) => ({
  time: (index + 1) * 120_000,
  open: index + 1,
  high: index + 2,
  low: index,
  close: index + 1,
  volume: 100,
}));
const datafeed = new InMemoryRequestDatafeed([
  { symbol: 'ALT', timeframe: '2', bars },
  { symbol: 'TEST', timeframe: '2', bars },
  { symbol: 'TEST', timeframe: '1', bars },
  { symbol: seedRequestSymbol('sample', 'TEST'), timeframe: '2', bars },
]);
const options = { requestDatafeed: datafeed, runtime: { timeframe: { period: '2' } } };

describe('request context identity', () => {
  it.each([
    ['security', 'request.security("TEST", "2", readExternal())', 'value'],
    ['security_lower_tf', 'request.security_lower_tf("TEST", "1", readExternal())', 'array.get(value, 0)'],
    ['seed', 'request.seed("sample", "TEST", readExternal())', 'value'],
  ])('%s counts a changing captured global as one expression', (name, request, output) => {
    const result = executeScript(parse(`//@version=6
indicator("Stable request expression", dynamic_requests=false)
external = request.security("ALT", "2", close)
readExternal() => external
value = ${request}
plot(${output}, "Value")
`), bars, undefined, options);

    expect(result.errors).toEqual([]);
    // Seed publishes closed requested bars, leaving the fixture's first bar
    // unavailable. Later captured values must remain fresh in all three paths.
    expect(result.plots[0]?.values).toEqual(bars.map((bar, index) => name === 'seed' && index === 0 ? null : bar.close));
  });

  it('counts a changing UDF argument in the same call scope once', () => {
    const result = executeScript(parse(`//@version=6
indicator("Stable request scope")
wrapped(series float value) => request.security("TEST", "2", value + 0)
plot(wrapped(bar_index + 1), "Value")
`), bars, undefined, options);

    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual(bars.map((bar) => bar.close));
  });

  it('still limits distinct dynamic symbols to forty contexts', () => {
    const result = executeScript(parse(`//@version=6
indicator("Dynamic request contexts")
symbol = "S" + str.tostring(bar_index)
plot(request.security(symbol, "2", close, ignore_invalid_symbol=true))
`), bars, undefined, options);

    expect(result.errors[0]?.message).toContain('Too many unique request.* contexts');
  });

  it('still counts distinct UDF call scopes with the same captured value', () => {
    const calls = Array.from({ length: 41 }, (_, index) => `value${index} = wrapped(1)`).join('\n');
    const result = executeScript(parse(`//@version=6
indicator("Distinct request scopes")
wrapped(series float value) => request.security("TEST", "2", value + 0)
${calls}
plot(value40)
`), bars.slice(0, 1), undefined, options);

    expect(result.errors[0]?.message).toContain('Too many unique request.* contexts');
  });
});

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const calls = [
  ['tickerid', 'ticker.modify(value)', 'ticker.modify(tickerid=value)'],
  ['session', 'ticker.modify("NASDAQ:AAPL", value)', 'ticker.modify(session=value, tickerid="NASDAQ:AAPL")'],
  ['adjustment', 'ticker.modify("NASDAQ:AAPL", session.regular, value)', 'ticker.modify(adjustment=value, tickerid="NASDAQ:AAPL")'],
] as const;

// Reference entries 716/717 select simple/series returns; both explicitly
// specify syminfo.session as the omitted session default.
describe('batch2 ticker.modify result overload and session default', () => {
  for (const [slot, positional, named] of calls) {
    for (const [binding, call] of [['positional', positional], ['named', named]]) {
      for (const qualifier of ['const', 'input', 'simple', 'series']) {
        it(`${slot} ${binding} ${qualifier} selects its documented result overload`, () => {
          const value = slot === 'tickerid' ? '"NASDAQ:AAPL"' : slot === 'session' ? '"regular"' : '"splits"';
          const declaration = qualifier === 'input'
            ? `value = input.string(${value})`
            : `${qualifier} string value = ${value}`;
          const check = checkProgram(parse(`//@version=6
indicator("Modify result")
${declaration}
inferred = ${call}
simple string result = inferred`));
          expect(check.symbols.find((symbol) => symbol.name === 'inferred')?.type).toMatchObject({
            kind: 'string', qualifier: qualifier === 'series' ? 'series' : 'simple',
          });
          const errors = check.diagnostics.filter((d) => d.severity === 'error');
          if (qualifier === 'series') expect(errors).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
          else expect(errors).toEqual([]);
        });
      }
    }
  }

  it('preserves an imported callable named ticker.modify', () => {
    const library = parse(`//@version=6
library("TickerShadow")
export modify(string id) => "library"`);
    const check = checkProgram(parse(`//@version=6
indicator("Imported modify")
import PineTests/TickerShadow/1 as ticker
series string id = "NASDAQ:AAPL"
simple string result = ticker.modify(id)`), { libraries: new Map([['PineTests/TickerShadow/1', library]]) });
    expect(check.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('preserves a receiver method with an unobscured namespace', () => {
    const check = checkProgram(parse(`//@version=6
indicator("Receiver modify")
type Holder
    string name
method modify(Holder this, string id) => "method"
holder = Holder.new("custom")
series string id = "NASDAQ:AAPL"
simple string result = holder.modify(id)`));
    expect(check.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  const bars = compatibilityBars.slice(0, 3);
  const feed = () => new InMemoryRequestDatafeed([
    { symbol: 'NASDAQ:AAPL', timeframe: '1', bars: bars.map((bar) => ({ ...bar, close: 20 })), syminfo: { session: 'regular' } },
    { symbol: 'NASDAQ:AAPL|session=extended', timeframe: '1', bars: bars.map((bar) => ({ ...bar, close: 40 })), syminfo: { session: 'extended' } },
    { symbol: 'OUTER', timeframe: '1', bars: bars.map((bar) => ({ ...bar, close: 70 })), syminfo: { session: 'extended' } },
  ]);
  for (const chartSession of ['regular', 'extended']) {
    const originalSession = chartSession === 'regular' ? 'extended' : 'regular';
    for (const explicit of [false, true]) {
      it(`${explicit ? 'explicit override' : 'omitted session'} selects the dataset for chart ${chartSession}`, () => {
        const source = `//@version=6
indicator("Modify session")
original = ticker.new("NASDAQ", "AAPL", session.${originalSession})
modified = ticker.modify(original${explicit ? `, session=session.${originalSession}` : ''})
plot(request.security(modified, "1", close, lookahead=barmerge.lookahead_on), title="Selected")`;
        const result = runCompatScript(source, { bars, engineOptions: {
          runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'CHART', session: chartSession } },
          requestDatafeed: feed(),
        } });
        expect(result.errors).toEqual([]);
        const selectedSession = explicit ? originalSession : chartSession;
        expect(getPlot(result, 'Selected').values).toEqual(bars.map(() => selectedSession === 'regular' ? 20 : 40));
      });
    }
  }

  it('uses requested context session for a modified ticker inside a nested request', () => {
    const result = runCompatScript(`//@version=6
indicator("Requested modify session")
value = request.security("OUTER", "1", request.security(ticker.modify("NASDAQ:AAPL"), "1", close, lookahead=barmerge.lookahead_on), lookahead=barmerge.lookahead_on)
plot(value, title="Selected")`, { bars, engineOptions: {
      runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'CHART', session: 'regular' } },
      requestDatafeed: feed(),
    } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Selected').values).toEqual(bars.map(() => 40));
  });
});

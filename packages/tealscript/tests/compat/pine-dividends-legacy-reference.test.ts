import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { collectCompiledRequestDataQueryCollection } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';
import { bars, provider } from './pine-ledger-gaps-28-request-fixtures';

// Current v5 migration dividends()->request.dividends(), v6 field domain.
describe('ledger1096-1097 dividends member migration', () => {
  it.each([3, 4])('routes the version%s alias to the provider with named fields', (version) => {
    const { feed } = provider();
    const source = `//@version=${version}\nstudy("legacy")\nplot(dividends(ticker="NASDAQ:MAIN", field=dividends.net), "net")\nplot(dividends("NASDAQ:MAIN", dividends.gross), "gross")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars, engineOptions: { requestDatafeed: feed } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'net').values).toEqual([2, 2, 2]);
    expect(getPlot(result, 'gross').values).toEqual([3, 3, 3]);
  });
  it.each([5, 6])('refuses the removed global alias in version%s', (version) => {
    expect(
      checkProgram(
        parse(`//@version=${version}\nindicator("legacy")\nplot(dividends("NASDAQ:MAIN", dividends.gross))`),
      ).diagnostics.some((d) => d.severity === 'error'),
    ).toBe(true);
  });
  it.each([4, 6])('refuses an invalid literal field in version%s', (version) => {
    const call = version === 4 ? 'dividends' : 'request.dividends';
    expect(
      checkProgram(
        parse(
          `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("field")\nplot(${call}("NASDAQ:MAIN", "invalid"))`,
        ),
      ).diagnostics.some((d) => d.severity === 'error'),
    ).toBe(true);
  });
  it('preloads a static legacy provider query and discovers dynamic routing', () => {
    const fixed = collectCompiledRequestDataQueryCollection(
      parse('//@version=4\nstudy("preload")\nplot(dividends("NASDAQ:MAIN", dividends.gross))'),
    );
    expect(fixed.queries).toEqual([
      { kind: 'corporate_action', query: { kind: 'dividends', ticker: 'NASDAQ:MAIN', currency: undefined, time: 0 } },
    ]);
    expect(fixed.hasUnpreloadableQueries).toBe(false);
    const dynamic = collectCompiledRequestDataQueryCollection(
      parse('//@version=4\nstudy("dynamic")\nplot(dividends("NASDAQ:T" + tostring(bar_index), dividends.gross))'),
    );
    expect(dynamic.hasUnpreloadableQueries).toBe(true);
  });
  it('preserves local function shadowing without requesting corporate data', () => {
    const source =
      '//@version=4\nstudy("shadow")\ndividends(string ticker, string field) => 9\nplot(dividends("NASDAQ:MAIN", "custom"), "out")';
    const { feed, queries } = provider();
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars, engineOptions: { requestDatafeed: feed } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'out').values).toEqual([9, 9, 9]);
    expect(queries).toEqual([]);
    expect(collectCompiledRequestDataQueryCollection(parse(source)).queries).toEqual([]);
  });
});

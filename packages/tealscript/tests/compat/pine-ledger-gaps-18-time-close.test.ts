import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

describe('ledger18 time_close migration slots', () => {
  for (const version of [3, 4]) {
    it(`v${version} binds time_close resolution to the selected timeframe`, () => {
      const source = `//@version=${version}\nstudy("time close slot")\nplot(time_close(resolution="5"), title="named")\nplot(time_close("5"), title="positional")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'named').values).toEqual(getPlot(result, 'positional').values);
      expect(getPlot(result, 'named').values[0]).toBe(1_700_000_100_000);
    });
  }
  for (const version of [5, 6]) {
    it(`v${version} accepts timeframe and rejects resolution`, () => {
      const modern = `//@version=${version}\nindicator("modern time")\nplot(time_close(timeframe="5"), title="close")`;
      expect(checkProgram(parse(modern)).diagnostics).toEqual([]);
      expect(getPlot(runCompatScript(modern), 'close').values[0]).toBe(1_700_000_100_000);
      expect(checkProgram(parse(`//@version=${version}\nindicator("old time")\nplot(time_close(resolution="5"))`)).diagnostics.length).toBeGreaterThan(0);
    });
  }
});

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { corporateActionRequestKey, InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { getPlot, runCompatScript } from './fixtures';

const bars = Array.from({ length: 6 }, (_, i) => ({
  time: 1700000000000 + i * 60000,
  open: 10,
  high: 10,
  low: 10,
  close: 10,
  volume: 1,
}));

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json: request.dividends gaps argument.
// Default gaps_off carries the last event; gaps_on publishes only a new event.
describe('PARTIAL request and time boundaries', () => {
  it('distinguishes omitted dividend gaps from explicit sparse event publication, ranks1740/1741', () => {
    const feed = new InMemoryRequestDatafeed(
      [],
      [
        {
          family: 'dividends',
          key: corporateActionRequestKey('NASDAQ:AAPL', 'dividends.gross', 'USD'),
          points: [
            { time: bars[2]!.time, value: 7 },
            { time: bars[4]!.time, value: 3 },
          ],
        },
      ],
    );
    const result = runCompatScript(
      `//@version=6
indicator("Gaps")
plot(request.dividends("NASDAQ:AAPL", dividends.gross, currency="USD"), "Default")
plot(request.dividends("NASDAQ:AAPL", dividends.gross, gaps=barmerge.gaps_off, currency="USD"), "Off")
plot(request.dividends("NASDAQ:AAPL", dividends.gross, gaps=barmerge.gaps_on, currency="USD"), "On")`,
      { bars, engineOptions: { requestDatafeed: feed } },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Default').values).toEqual([null, null, 7, 7, 3, 3]);
    expect(getPlot(result, 'Off').values).toEqual([null, null, 7, 7, 3, 3]);
    expect(getPlot(result, 'On').values).toEqual([null, null, 7, null, 3, null]);
  });

  // pine-v6-reference-v1.json: timeframe.in_seconds timeframe argument; minute strings have no unit suffix.
  it('converts lower, interior and upper valid minute strings, rank1753', () => {
    const result = executeCompiled(
      tryCompile(
        parse(`//@version=6
indicator("Minutes")
plot(timeframe.in_seconds("1"))
plot(timeframe.in_seconds("17"))
plot(timeframe.in_seconds("1440"))`),
      ),
      bars.slice(0, 1),
    );
    expect(result!.plots.map((p) => p.values)).toEqual([[60], [1020], [86400]]);
  });

  // pine-v6-reference-v1.json: time session argument; the v5 migration changes omitted days from weekdays to all days.
  // https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#changed-the-default-session-days-for-time-and-time_close
  it('distinguishes Saturday and Sunday bare-session defaults across v4/v5, rank1755', () => {
    const days = [8, 9, 10, 11].map((day) => ({
      time: Date.UTC(2024, 2, day, 12),
      open: 10,
      high: 10,
      low: 10,
      close: 10,
      volume: 1,
    }));
    for (const version of [4, 5]) {
      const result = executeCompiled(
        tryCompile(
          parse(
            `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Days")\nplot(na(time("60", "0900-1700", "Etc/UTC")) ? 0 : 1)`,
          ),
        ),
        days,
      );
      expect(result!.plots[0]!.values).toEqual(version === 4 ? [1, 0, 0, 1] : [1, 1, 1, 1]);
    }
  });
});

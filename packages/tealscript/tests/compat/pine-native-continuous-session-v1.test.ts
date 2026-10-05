import type { Bar } from '../../src/runtime';

import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const times = [
  Date.UTC(2026, 7, 31, 0),
  Date.UTC(2026, 7, 31, 23, 58),
  Date.UTC(2026, 8, 1, 0),
  Date.UTC(2026, 8, 1, 23, 58),
  Date.UTC(2026, 8, 2, 0),
  Date.UTC(2026, 8, 2, 0, 2),
];
const bars: Bar[] = times.map((time, i) => ({ time, open: 10 + i, high: 11 + i, low: i, close: 10 + i, volume: 100 }));
const runtime = {
  syminfo: { tickerid: 'BINANCE:BTCUSDT', prefix: 'BINANCE', ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
  timeframe: { period: '2', multiplier: 2, isintraday: true, isminutes: true },
};
const expected = {
  FIRST: [1, 0, 1, 0, 1, 0],
  FIRST_REGULAR: [1, 0, 1, 0, 1, 0],
  LAST: [0, 1, 0, 1, 0, 1],
  LAST_REGULAR: [0, 1, 0, 1, 0, 1],
  PREVIOUS_HIGH: [null, null, 12, 12, 14, 14],
  PREVIOUS_LOW: [null, null, 0, 0, 2, 2],
};

for (const version of [5, 6]) {
  describe(`Native continuous session v${version}`, () => {
    const source = fs.readFileSync(
      new URL(`../../oracle-probes/v5/corpus-continuous-session-boundaries-v${version}-v1.pine`, import.meta.url),
      'utf8',
    );
    for (const [title, values] of Object.entries(expected)) {
      it(`${title} follows captured UTC daily sessions`, () => {
        const compiled = tryCompile(parse(source));
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars, new Map(), { runtime });
        expect(result?.errors).toEqual([]);
        expect(result?.plots.find((plot) => plot.title === title)?.values).toEqual(values);
      });
    }
  });
}

const flagsSource = `//@version=6
indicator("Session cycle controls")
plot(session.isfirstbar ? 1 : 0, "first")
plot(session.isfirstbar_regular ? 1 : 0, "first_regular")
plot(session.islastbar ? 1 : 0, "last")
plot(session.islastbar_regular ? 1 : 0, "last_regular")`;

function flags(times: number[], session: { regular: string; timezone?: string; closedDates?: string[] }) {
  const compiled = tryCompile(parse(flagsSource));
  expect(compiled.success).toBe(true);
  const result = executeCompiled(
    compiled,
    times.map((time, i) => ({ ...bars[i % bars.length], time })),
    new Map(),
    { runtime: { ...runtime, session } },
  );
  expect(result?.errors).toEqual([]);
  return Object.fromEntries(result!.plots.map((plot) => [plot.title, plot.values]));
}

describe('Session boundary preservation controls', () => {
  it('does not create a boundary within one continuous session', () => {
    expect(
      flags([Date.UTC(2026, 8, 1, 0), Date.UTC(2026, 8, 1, 0, 2), Date.UTC(2026, 8, 1, 0, 4)], { regular: '24x7' }),
    ).toEqual({ first: [1, 0, 0], first_regular: [1, 0, 0], last: [0, 0, 1], last_regular: [0, 0, 1] });
  });

  it('retains inactive-bar transitions for a bounded market session', () => {
    expect(
      flags(
        [
          Date.UTC(2026, 8, 1, 9, 28),
          Date.UTC(2026, 8, 1, 9, 30),
          Date.UTC(2026, 8, 1, 15, 58),
          Date.UTC(2026, 8, 1, 16),
        ],
        { regular: '0930-1600', timezone: 'Etc/UTC' },
      ),
    ).toEqual({ first: [0, 1, 0, 0], first_regular: [0, 1, 0, 0], last: [0, 0, 1, 0], last_regular: [0, 0, 1, 0] });
  });

  it('retains explicit exchange closures', () => {
    expect(
      flags([Date.UTC(2026, 8, 1, 0), Date.UTC(2026, 8, 2, 0), Date.UTC(2026, 8, 3, 0)], {
        regular: '24x7',
        closedDates: ['2026-09-02'],
      }),
    ).toEqual({ first: [1, 0, 1], first_regular: [1, 0, 1], last: [1, 0, 1], last_regular: [1, 0, 1] });
  });
});

describe('Configured continuous session cycle controls', () => {
  it('uses the configured exchange timezone across daylight saving', () => {
    const times = [
      Date.UTC(2024, 2, 9, 4, 58),
      Date.UTC(2024, 2, 9, 5),
      Date.UTC(2024, 2, 10, 5),
      Date.UTC(2024, 2, 11, 4),
    ];
    expect(flags(times, { regular: '0000-0000:1234567', timezone: 'America/New_York' })).toEqual({
      first: [1, 1, 1, 1],
      first_regular: [1, 1, 1, 1],
      last: [1, 1, 1, 1],
      last_regular: [1, 1, 1, 1],
    });
  });

  it('keeps a non-midnight continuous session anchor across midnight', () => {
    const times = [
      Date.UTC(2026, 8, 1, 16, 58),
      Date.UTC(2026, 8, 1, 17),
      Date.UTC(2026, 8, 2, 0),
      Date.UTC(2026, 8, 2, 16, 58),
    ];
    expect(flags(times, { regular: '1700-1700:1234567' })).toEqual({
      first: [1, 1, 0, 0],
      first_regular: [1, 1, 0, 0],
      last: [1, 0, 0, 1],
      last_regular: [1, 0, 0, 1],
    });
  });
});

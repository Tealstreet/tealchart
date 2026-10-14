import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import type { Bar } from '../../src/runtime/context';

// Exact v53/v54 sources and plotted INPUT_VOLUME feeds; TA live-state values are a separate facet.
const captured = [
  {
    "id": 93,
    "source": "//@version=6\nindicator(\"V53 Accdist variable missing inputs\", calc_bars_count=32)\nvar int sample = 0\npricesMissing = na(high) or na(low) or na(close)\nvolumeMissing = na(volume)\ninputMissing = pricesMissing or volumeMissing\nrangeValue = high - low\naccdistValue = ta.accdist\nif barstate.isconfirmed\n    log.info(\"sample={0}; range={1}; volume={2}; priceNA={3}; volumeNA={4}; accdist={5}\", sample, str.tostring(rangeValue), str.tostring(volume), str.tostring(pricesMissing), str.tostring(volumeMissing), str.tostring(accdistValue))\nplot(pricesMissing ? 1 : 0, \"PRICE_NA\")\nplot(volumeMissing ? 1 : 0, \"VOLUME_NA\")\nplot(inputMissing ? 1 : 0, \"ELIGIBLE_MISSING_INPUT\")\nplot(volumeMissing and not pricesMissing and rangeValue != 0 ? 1 : 0, \"MISSING_VOLUME_NONZERO_RANGE\")\nplot(not inputMissing and inputMissing[1] and rangeValue != 0 ? 1 : 0, \"FINITE_NONFLAT_AFTER_MISSING\")\nplot(rangeValue, \"INPUT_RANGE\")\nplot(accdistValue, \"ACCDIST_VARIABLE\")\nplot(na(accdistValue) ? 1 : 0, \"ACCDIST_NA\")\nplot(nz(accdistValue, 123456.0), \"ACCDIST_NZ_SENTINEL\")\nplot(accdistValue[1], \"PREVIOUS_ACCDIST\")\nplot(open, \"INPUT_OPEN\")\nplot(high, \"INPUT_HIGH\")\nplot(low, \"INPUT_LOW\")\nplot(close, \"INPUT_CLOSE\")\nplot(volume, \"INPUT_VOLUME\")\nplot(sample, \"SAMPLE_INDEX\")\nplot(bar_index, \"SOURCE_INDEX\")\nplot(time, \"SOURCE_TIME\")\nsample += 1\n",
    "sourceSHA256": "bf0179164612da5f01b553094752177a39137170608065ac3dc53c9cd993c07a",
    "captureSHA256": "253f7acb6835b75ad5fbc052d9babcaf9cf35866864030c0e5e1e9f8fb82cbc9",
    "observer": "FINITE_NONFLAT_AFTER_MISSING",
    "bars": [
      [
        1791348720,
        102.062,
        102.07,
        102.061,
        102.065,
        null
      ],
      [
        1791348840,
        102.066,
        102.071,
        102.062,
        102.064,
        null
      ],
      [
        1791348960,
        102.067,
        102.067,
        102.056,
        102.06,
        null
      ],
      [
        1791349080,
        102.059,
        102.07,
        102.055,
        102.067,
        null
      ],
      [
        1791349200,
        102.068,
        102.075,
        102.065,
        102.072,
        null
      ],
      [
        1791349320,
        102.075,
        102.08,
        102.068,
        102.07,
        null
      ],
      [
        1791349440,
        102.071,
        102.071,
        102.06,
        102.064,
        null
      ],
      [
        1791349560,
        102.065,
        102.066,
        102.058,
        102.064,
        null
      ],
      [
        1791349680,
        102.061,
        102.073,
        102.061,
        102.068,
        null
      ],
      [
        1791349800,
        102.066,
        102.072,
        102.06,
        102.062,
        null
      ],
      [
        1791349920,
        102.064,
        102.079,
        102.06,
        102.076,
        null
      ],
      [
        1791350040,
        102.074,
        102.089,
        102.073,
        102.083,
        null
      ],
      [
        1791350160,
        102.086,
        102.086,
        102.07,
        102.075,
        null
      ],
      [
        1791350280,
        102.078,
        102.078,
        102.071,
        102.076,
        null
      ],
      [
        1791350400,
        102.079,
        102.087,
        102.074,
        102.084,
        null
      ],
      [
        1791350520,
        102.088,
        102.088,
        102.078,
        102.081,
        null
      ],
      [
        1791350640,
        102.081,
        102.087,
        102.074,
        102.08,
        null
      ],
      [
        1791350760,
        102.084,
        102.091,
        102.079,
        102.083,
        null
      ],
      [
        1791350880,
        102.088,
        102.099,
        102.083,
        102.094,
        null
      ],
      [
        1791351000,
        102.098,
        102.101,
        102.093,
        102.098,
        null
      ],
      [
        1791351120,
        102.1,
        102.101,
        102.089,
        102.091,
        null
      ],
      [
        1791351240,
        102.089,
        102.096,
        102.086,
        102.091,
        null
      ],
      [
        1791351360,
        102.095,
        102.095,
        102.089,
        102.09,
        null
      ],
      [
        1791351480,
        102.095,
        102.097,
        102.089,
        102.092,
        null
      ],
      [
        1791351600,
        102.095,
        102.096,
        102.088,
        102.088,
        null
      ],
      [
        1791351720,
        102.09,
        102.092,
        102.078,
        102.079,
        null
      ],
      [
        1791351840,
        102.083,
        102.083,
        102.065,
        102.068,
        null
      ],
      [
        1791351960,
        102.07,
        102.073,
        102.064,
        102.068,
        null
      ],
      [
        1791352080,
        102.067,
        102.074,
        102.062,
        102.072,
        null
      ],
      [
        1791352200,
        102.077,
        102.08,
        102.069,
        102.071,
        null
      ],
      [
        1791352320,
        102.07,
        102.076,
        102.067,
        102.073,
        null
      ],
      [
        1791352440,
        102.075,
        102.075,
        102.058,
        102.061,
        0
      ]
    ]
  },
  {
    "id": 142,
    "source": "//@version=6\nindicator(\"V54 obv-implicit-feed-hole-state\", calc_bars_count=32)\nvar int sample = 0\nohlcMissing = na(high) or na(low) or na(close)\nvolumeMissing = na(volume)\nrawIncrement = math.sign(ta.change(close)) * volume\nvalue = ta.obv\ncandidateCum = ta.cum(rawIncrement)\nplot(open, \"INPUT_OPEN\")\nplot(high, \"INPUT_HIGH\")\nplot(low, \"INPUT_LOW\")\nplot(close, \"INPUT_CLOSE\")\nplot(volume, \"INPUT_VOLUME\")\nplot(na(high) ? 1 : 0, \"HIGH_NA\")\nplot(na(low) ? 1 : 0, \"LOW_NA\")\nplot(na(close) ? 1 : 0, \"CLOSE_NA\")\nplot(ohlcMissing ? 1 : 0, \"OHLC_MISSING\")\nplot(volumeMissing ? 1 : 0, \"VOLUME_MISSING\")\nplot(not ohlcMissing and not volumeMissing and (ohlcMissing[1] or volumeMissing[1]) ? 1 : 0, \"FINITE_RECOVERY\")\nplot(rawIncrement, \"MODEL_RAW_INCREMENT\")\nplot(value, \"OBV\")\nplot(na(value) ? 1 : 0, \"OBV_NA\")\nplot(nz(value, 123456.0), \"OBV_NZ_SENTINEL\")\nplot(candidateCum, \"MODEL_CUM_INCREMENT\")\nplot(sample, \"SAMPLE_INDEX\")\nplot(bar_index, \"SOURCE_INDEX\")\nplot(time, \"SOURCE_TIME\")\nsample += 1\n",
    "sourceSHA256": "432792295426c82dce7f8907fcbd106f4c0dc29247aa954051730a5afd38400b",
    "captureSHA256": "0955f78179bee215492bd12f4945e5f509e66ee18e73678f49c1785ad6ce1f55",
    "observer": "FINITE_RECOVERY",
    "bars": [
      [
        1791347160,
        102.07,
        102.093,
        102.07,
        102.089,
        null
      ],
      [
        1791347280,
        102.093,
        102.093,
        102.083,
        102.083,
        null
      ],
      [
        1791347400,
        102.084,
        102.084,
        102.077,
        102.077,
        null
      ],
      [
        1791347520,
        102.078,
        102.081,
        102.073,
        102.078,
        null
      ],
      [
        1791347640,
        102.075,
        102.081,
        102.074,
        102.076,
        null
      ],
      [
        1791347760,
        102.078,
        102.081,
        102.075,
        102.079,
        null
      ],
      [
        1791347880,
        102.078,
        102.081,
        102.073,
        102.075,
        null
      ],
      [
        1791348000,
        102.073,
        102.077,
        102.072,
        102.074,
        null
      ],
      [
        1791348120,
        102.077,
        102.08,
        102.074,
        102.076,
        null
      ],
      [
        1791348240,
        102.077,
        102.082,
        102.071,
        102.071,
        null
      ],
      [
        1791348360,
        102.074,
        102.076,
        102.067,
        102.07,
        null
      ],
      [
        1791348480,
        102.072,
        102.072,
        102.06,
        102.067,
        null
      ],
      [
        1791348600,
        102.068,
        102.068,
        102.059,
        102.062,
        null
      ],
      [
        1791348720,
        102.062,
        102.07,
        102.061,
        102.065,
        null
      ],
      [
        1791348840,
        102.066,
        102.071,
        102.062,
        102.064,
        null
      ],
      [
        1791348960,
        102.067,
        102.067,
        102.056,
        102.06,
        null
      ],
      [
        1791349080,
        102.059,
        102.07,
        102.055,
        102.067,
        null
      ],
      [
        1791349200,
        102.068,
        102.075,
        102.065,
        102.072,
        null
      ],
      [
        1791349320,
        102.075,
        102.08,
        102.068,
        102.07,
        null
      ],
      [
        1791349440,
        102.071,
        102.071,
        102.06,
        102.064,
        null
      ],
      [
        1791349560,
        102.065,
        102.066,
        102.058,
        102.064,
        null
      ],
      [
        1791349680,
        102.061,
        102.073,
        102.061,
        102.068,
        null
      ],
      [
        1791349800,
        102.066,
        102.072,
        102.06,
        102.062,
        null
      ],
      [
        1791349920,
        102.064,
        102.079,
        102.06,
        102.076,
        null
      ],
      [
        1791350040,
        102.074,
        102.089,
        102.073,
        102.083,
        null
      ],
      [
        1791350160,
        102.086,
        102.086,
        102.07,
        102.075,
        null
      ],
      [
        1791350280,
        102.078,
        102.078,
        102.071,
        102.076,
        null
      ],
      [
        1791350400,
        102.079,
        102.087,
        102.074,
        102.084,
        null
      ],
      [
        1791350520,
        102.088,
        102.088,
        102.078,
        102.081,
        null
      ],
      [
        1791350640,
        102.081,
        102.087,
        102.074,
        102.08,
        null
      ],
      [
        1791350760,
        102.084,
        102.091,
        102.079,
        102.083,
        null
      ],
      [
        1791350880,
        102.088,
        102.091,
        102.083,
        102.091,
        0
      ]
    ]
  }
] as const;

function run(source: string, bars: Bar[]) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { realtimeLastBar: { isNew: true } });
  if (!result) throw new Error('No compiled result');
  return result;
}

const bars: Bar[] = Array.from({ length: 32 }, (_, index) => ({
  time: (index + 1) * 120000, open: index + 10, high: index + 12, low: index + 9,
  close: index + 11, volume: index === 31 ? 0 : Number.NaN,
}));

function fixtureSource(body: string) { return `//@version=6\nindicator("Static history")\n${body}`; }

describe('static literal history first reached on a live bar', () => {
  it.each(captured)('completes captured recovery observer $observer', fixture => {
    expect(createHash('sha256').update(fixture.source).digest('hex')).toBe(fixture.sourceSHA256);
    const feed = fixture.bars.map(([time, open, high, low, close, volume]) => ({
      time: time * 1000, open, high, low, close, volume: volume ?? Number.NaN,
    }));
    const result = run(fixture.source, feed);
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(result.plots.find(plot => plot.title === fixture.observer)?.values).toEqual([
      ...Array<number>(31).fill(0), 1,
    ]);
    expect(result.plots.find(plot => plot.title === 'SOURCE_INDEX')?.values).toEqual(
      Array.from({ length: 32 }, (_, index) => index),
    );
  });

  it.each([
    ['boolean', 'missing = na(volume)\nplot(not missing and missing[1] ? 1 : 0, "Past")', 1],
    ['numeric', 'value = close * 2\nplot(barstate.isrealtime ? value[1] : na, "Past")', 82],
    ['builtin', 'plot(barstate.isrealtime ? close[1] : na, "Past")', 41],
    ['computed price', 'plot(barstate.isrealtime ? hl2[1] : na, "Past")', 40.5],
  ])('provisions %s literal demand before first live execution', (_, body, expected) => {
    const result = run(fixtureSource(body), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.at(-1)).toBe(expected);
  });

  it('retains an independent first-live dynamic no-growth refusal', () => {
    const result = run(fixtureSource('value = close * 2\ndepth = bar_index > 20 ? 1 : 0\nplot(barstate.isrealtime ? value[depth] : na, "Past")'), bars);
    expect(result.errors[0]?.message).toBe('Historical offset 1 exceeds max_bars_back 0');
  });

  it('does not provision another series from a literal demand', () => {
    const result = run(fixtureSource('value = close * 2\nplot(barstate.isrealtime ? value[1] : na, "Past")\ndepth = bar_index > 20 ? 1 : 0\nplot(barstate.isrealtime ? open[depth] : na, "Dynamic")'), bars);
    expect(result.plots[0].values.at(-1)).toBe(82);
    expect(result.errors[0]?.message).toBe('Historical offset 1 exceeds max_bars_back 0');
  });

  it('keeps a dynamic live jump beyond a known literal demand refused', () => {
    const result = run(fixtureSource('value = close * 2\nplot(value[1], "Past")\ndepth = barstate.ishistory ? 1 : 2\nplot(value[depth], "Dynamic")'), bars);
    expect(result.errors[0]?.message).toBe('Historical offset 2 exceeds max_bars_back 1');
  });

  it('keeps a missing-volume live row short-circuited', () => {
    const result = run(fixtureSource('missing = na(volume)\nplot(not missing and missing[1] ? 1 : 0, "Past")'), bars.map(bar => ({ ...bar, volume: Number.NaN })));
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(Array<number>(32).fill(0));
  });
});

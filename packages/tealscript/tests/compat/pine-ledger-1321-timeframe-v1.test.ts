import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, functions203/204.
const errors = (body: string) => checkProgram(parse(`//@version=6\nindicator("Duration types")\n${body}`)).diagnostics.filter((d) => d.severity === 'error');

describe('ledger1340–1346 timeframe.from_seconds', () => {
  // Ranks1340/1341: both overloads require int seconds; series int remains admitted.
  it.each(['positional', 'named'])('refuses float seconds with %s binding', (binding) => {
    for (const seconds of ['60', 'input.int(60)', 'simpleSeconds', 'bar_index + 60']) {
      expect(errors(`simple int simpleSeconds = 60\np = timeframe.from_seconds(${seconds})`)).toEqual([]);
    }
    const argument = binding === 'named' ? 'seconds=60.0' : '60.0';
    expect(errors(`p = timeframe.from_seconds(${argument})`)).toContainEqual(expect.objectContaining({
      code: 'type-mismatch', message: expect.stringContaining('integer'),
    }));
  });

  // Rank1346: functions203 returns simple string; functions204 returns series string.
  it('preserves the series-argument return qualifier', () => {
    expect(errors('simple string p = timeframe.from_seconds(60)')).toEqual([]);
    expect(errors('series string p = timeframe.from_seconds(bar_index + 60)')).toEqual([]);
    expect(errors('simple string p = timeframe.from_seconds(bar_index + 60)')).toContainEqual(expect.objectContaining({
      code: 'qualifier-mismatch',
    }));
  });

});

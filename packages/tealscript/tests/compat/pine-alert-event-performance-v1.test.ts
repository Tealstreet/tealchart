import type { AlertFrequency } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { ExecutionContext } from '../../src/runtime/context';

// Evidence: ~/cs/docs/tealscript-parity-archive/performance-udf-invocation-27-v1/.
// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// entries[409..411] alert.freq_* and entries[1016] alert.freq; timing is an engine budget.
function recordAlerts(frequency: AlertFrequency): number {
  const context = new ExecutionContext();
  const started = process.cpuUsage();
  for (let bar = 0; bar < 8_000; bar++) {
    context.bar_index = bar;
    for (let stream = 0; stream < 8; stream++) {
      context.addAlertEvent(`fn_${stream}:alert`, 'signal', frequency);
    }
  }
  const elapsed = process.cpuUsage(started);
  expect(context.getAlerts()).toHaveLength(8);
  for (const alert of context.getAlerts()) {
    expect(alert.events).toHaveLength(8_000);
    expect(alert.values).toEqual(Array(8_000).fill(true));
  }
  return elapsed.user + elapsed.system;
}

describe('independent UDF alert stream performance', () => {
  it('preserves frequency admission, independent IDs and event membership after truncation', () => {
    const context = new ExecutionContext();
    context.bar_index = 2;
    context.addAlertEvent('a', 'all', 'all');
    context.addAlertEvent('a', 'once', 'once_per_bar');
    context.addAlertEvent('a', 'duplicate', 'once_per_bar');
    context.addAlertEvent('b', 'independent', 'once_per_bar');
    context.addAlertEvent('a', 'unconfirmed', 'once_per_bar_close');
    expect(context.getAlerts().map((alert) => alert.events.map((event) => event.message))).toEqual([
      ['all', 'once'],
      ['independent'],
    ]);
    context.bar_index = 0;
    context.addAlertEvent('a', 'earlier', 'once_per_bar');
    context.truncateAlerts(1);
    context.addAlertEvent('a', 'earlier duplicate', 'once_per_bar');
    expect(context.getAlerts().map((alert) => alert.events.map((event) => event.message))).toEqual([['earlier']]);
    context.bar_index = 2;
    context.barstate.isconfirmed = true;
    context.addAlertEvent('a', 'confirmed', 'once_per_bar_close');
    context.addAlertEvent('a', 'confirmed duplicate', 'once_per_bar_close');
    context.addAlertEvent('a', 'all after once', 'all');
    expect(
      context.getAlerts()[0].events.map(({ barIndex, message, frequency }) => ({ barIndex, message, frequency })),
    ).toEqual([
      { barIndex: 0, message: 'earlier', frequency: 'once_per_bar' },
      { barIndex: 2, message: 'confirmed', frequency: 'once_per_bar_close' },
      { barIndex: 2, message: 'all after once', frequency: 'all' },
    ]);
  });
  it('checks once-per-bar membership without repeatedly scanning historical events', () => {
    recordAlerts('all');
    const reference = recordAlerts('all');
    const actual = recordAlerts('once_per_bar');
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(actual / Math.max(reference, 50_000)).toBeLessThan(8);
    }
  });
});

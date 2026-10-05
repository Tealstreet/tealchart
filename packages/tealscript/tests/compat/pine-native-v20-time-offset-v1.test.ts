import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const bars = Array.from({ length: 6000 }, (_, index) => ({
  time: 1789948800000 + index * 60000,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 1,
}));
const options = {
  runtime: {
    syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC', session: '24x7', mintick: 0.01 },
    timeframe: { period: '1', multiplier: 1, isminutes: true, isintraday: true, isdaily: false },
  },
};

function capturedSource(name: string, sha256: string) {
  const source = readFileSync(new URL(`./fixtures/native-v20-time-offset-v1/${name}.pine`, import.meta.url), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
  return source;
}

// Capture 4b2a3a89d6: RE10002 for dynamic offsets; CE10041 for literal offsets.
describe('native v20 time offset boundaries', () => {
  it.each([
    ['5001', 'c645f961eb231c5468a87c7235c7fc509b9f14b2876faef52f7c0c7e4351073c', 5001, 5002],
    ['-501', '96c023344234935fa35ff27eabe2eab3e2a1ac4007440d2423ad52170615b4ad', -501, 3],
  ])('raises the captured dynamic %s error at the executing bar', (offset, sha256, value, barIndex) => {
    const ast = parse(capturedSource(`silent-s4-time-offset-${offset}-dynamic-v20-v1`, sha256));
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const execution = executeCompiledScript(ast, bars, new Map(), options);
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.reason);
    const message = `Error on bar ${barIndex}: Invalid value of the 'bars_back' argument (${value}) in the 'time' function. It must be in the range [-500..5000].`;
    expect(execution.result.errors).toEqual([
      {
        message,
        code: 'RE10002',
        barIndex,
        runtimeError: { message, code: 'RE10002', barIndex },
      },
    ]);
    expect(execution.result.plots.find((plot) => plot.title === 'TIME_RESULT_MS')?.values.slice(0, barIndex)).toEqual(
      bars.slice(0, barIndex).map((bar) => bar.time),
    );
    expect(execution.result.profile.swallowedErrors).toBeUndefined();
  });

  it.each([
    ['5001', '230df04438a5faaf8f8391e3d78e48f44c8c8b1b20517311558b8c6de60f03d8'],
    ['-501', 'b636d4afe508d79b91669c2c847b6d3953b2e52e8179465a662b4ce4ea443284'],
  ])('preserves the captured literal %s compile refusal', (offset, sha256) => {
    const ast = parse(capturedSource(`silent-s4-time-offset-${offset}-v20-v1`, sha256));
    const errors = checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('bars_back');
    expect(errors[0].message).toContain('between -500 and 5000');
  });

  it.each([
    ['5000', '976939a258be50abaf335616369e006540eadda889c04a62ded1d49efe6911de', 5000],
    ['-500', 'ec20585aa9cc2bea1a6ae749d8ffeb348b31bf4182a750281e07baef9aafe05f', -500],
  ])('preserves the valid captured %s boundary and projection', (offset, sha256, value) => {
    const ast = parse(capturedSource(`silent-s4-time-offset-${offset}-v20-v1`, sha256));
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const execution = executeCompiledScript(ast, bars, new Map(), options);
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors).toEqual([]);
    expect(execution.result.plots.find((plot) => plot.title === 'TIME_RESULT_MS')?.values).toEqual(
      bars.map((bar, index) => (index < value ? null : bar.time - value * 60000)),
    );
  });
});

import { expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { HistoryBufferSizing, isHistoryBufferResize } from '../../src/runtime/codegen/history';

// Execution-model historical buffers: repeated growth can still exhaust the supported history.
it('reports buffer exhaustion after several successful historical growth attempts', () => {
  const grew: number[] = [];
  const pending: number[] = [];
  const prototype = HistoryBufferSizing.prototype as unknown as {
    checkBuffer(sizing: { allocated: number }, offset: number, realtime: boolean): void;
    finishPass(): void;
  };
  const check = prototype.checkBuffer;
  const finish = prototype.finishPass;
  const demandSpy = vi.spyOn(prototype, 'checkBuffer').mockImplementation(function (this: HistoryBufferSizing, sizing, offset, realtime) {
    const before = sizing.allocated;
    check.call(this, sizing, offset, realtime);
    if (sizing.allocated > before) pending.push(offset);
  });
  // 383ca38340 commits batched growth at finishPass, after guarded reads collect demand.
  const finishSpy = vi.spyOn(prototype, 'finishPass').mockImplementation(function (this: HistoryBufferSizing) {
    try {
      finish.call(this);
    } catch (error) {
      if (isHistoryBufferResize(error)) grew.push(...pending.splice(0));
      throw error;
    }
  });
  try {
    const bars = Array.from({ length: 5_203 }, (_, index) => ({
      time: (index + 1) * 60_000, open: index + 1, high: index + 2, low: index, close: index + 1, volume: 100,
    }));
    const execution = executeCompiledScript(parse(`//@version=6
indicator("Repeated history growth")
value = close
offset = bar_index > 5100 ? 5001 : bar_index > 3500 ? 3000 : bar_index > 1800 ? 1500 : bar_index > 800 ? 700 : 1
plot(value[offset], "Past")`), bars);
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(grew).toEqual(expect.arrayContaining([700, 1_500, 3_000]));
    expect(execution.result.errors.map(error => error.message)).toEqual([
      expect.stringMatching(/Historical offset 5001 exceeds max_bars_back 5000/),
    ]);
    expect(execution.result.plots[0].values[801]).toBe(102);
    expect(execution.result.plots[0].values[1_801]).toBe(302);
    expect(execution.result.plots[0].values[3_501]).toBe(502);
  } finally {
    demandSpy.mockRestore();
    finishSpy.mockRestore();
  }
});

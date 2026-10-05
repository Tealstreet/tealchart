import { describe, expect, it, vi } from 'vitest';

import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { ExecutionContext } from '../../src/runtime/context';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const authority = 'https://www.tradingview.com/pine-script-docs/language/execution-model/#historical-buffers';

describe('Historical first-244-bar buffer discovery', () => {
  it('sets the initial allocation to the discovered minimum', () => {
    const history = new HistoryBufferSizing();
    const allocated = history.run(() => {
      for (let index = 0; index < 244; index++) {
        history.beginBar(index, false);
        history.check('close', 1, false, 499);
      }
      history.beginBar(244, false);
      return history.allocation('close', 499);
    });
    expect(allocated, authority).toBe(1);
  });
  it.each([100, 243])('finishes the discovery prefix for a deep sample on bar %i', (discoveryBar) => {
    let attempt = 0;
    const visited: number[][] = [];
    const originalRun = HistoryBufferSizing.prototype.run;
    vi.spyOn(HistoryBufferSizing.prototype, 'run').mockImplementation(function (this: HistoryBufferSizing, execute) {
      return originalRun.call(this, () => {
        attempt++;
        visited[attempt] = [];
        return execute();
      });
    });
    const advance = ExecutionContext.prototype.advanceBar;
    vi.spyOn(ExecutionContext.prototype, 'advanceBar').mockImplementation(function (this: ExecutionContext) {
      const result = advance.call(this);
      if (result) visited[attempt].push(this.bar_index);
      return result;
    });
    const bars = Array.from({ length: 650 }, (_, index) => ({
      ...compatibilityBars[0],
      time: (index + 1) * 60000,
      close: index + 1,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Discovery prefix")
offset = bar_index == ${discoveryBar} ? bar_index * 6 : 1
plot(close[offset], "Past")
`,
      { bars },
    );
    expect(result.errors, authority).toEqual([]);
    expect(visited[1], authority).toContain(244);
    expect(getPlot(result, 'Past').values[discoveryBar]).toBeNull();
    expect(getPlot(result, 'Past').values[649]).toBe(649);
  });
  it('retains the prefix samples when an explicit initial minimum is smaller', () => {
    const bars = Array.from({ length: 250 }, (_, index) => ({
      ...compatibilityBars[0],
      time: (index + 1) * 60000,
      close: index + 1,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Small minimum", max_bars_back=2)
offset = bar_index == 200 ? bar_index : 1
plot(close[offset], "Past")
`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past').values[200]).toBe(1);
    expect(getPlot(result, 'Past').values[249]).toBe(249);
  });
});

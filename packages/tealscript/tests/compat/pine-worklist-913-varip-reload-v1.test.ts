import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';
import { workerPlots } from './ledgerGaps24Worker';

it('reloads only closing-bar history without synthesizing discarded live updates', async () => {
  const body = 'varip int executions = 0\nexecutions += 1\nplot(executions, "executions")';
  const live = await workerPlots(body);
  expect(live('executions')).toEqual([1, 2, 3, 4, 5, 6]);
  const bars = [11, 12, 7].map((close, index) => ({
    time: Date.UTC(2026, 0, 1) + index * 60_000,
    open: 10,
    high: 13,
    low: 7,
    close,
    volume: 100,
  }));
  const reload = runCompatScript(`//@version=6\nindicator("Reload execution counts")\n${body}`, { bars });
  expect(reload.errors).toEqual([]);
  expect(getPlot(reload, 'executions').values).toEqual([1, 2, 3]);
});

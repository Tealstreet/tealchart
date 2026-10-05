import { expect, it } from 'vitest';

import { lifecycleBars, withLifecycleWorker } from './worklist-load-reload-fixture';

it.each([5, 6])('1767 v%i refresh replays final OHLC and resets tick-only observations', async (version) => {
  await withLifecycleWorker(async (worker, results) => {
    const source = `//@version=${version}
indicator("Refresh")
varip int visits = 0
visits += 1
plot(visits, "Visits")
plot(close, "Close")
plot(barstate.isrealtime ? 1 : 0, "Realtime")
plot(barstate.ishistory ? 1 : 0, "History")
if barstate.isrealtime
    label.new(bar_index, close, "Live")`;
    await worker.init('study', source, lifecycleBars([7, 3]));
    worker.updateBar(lifecycleBars([7, 3, 11])[2]!);
    worker.updateBar(lifecycleBars([7, 3, 12])[2]!);
    worker.updateBar(lifecycleBars([7, 3, 13])[2]!);
    worker.updateBar(lifecycleBars([7, 3, 13, 9])[3]!);
    expect(results.at(-1)?.plots[2]?.values).toContain(1);
    expect(results.at(-1)?.drawings.some((drawing) => drawing.type === 'label')).toBe(true);
    await worker.init('study', source, lifecycleBars([7, 3, 13, 9]));
    const output = results.at(-1)!;
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [1, 2, 3, 4],
      [7, 3, 13, 9],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
    ]);
    expect(output.drawings).toEqual([]);
    expect(output.metadata).toEqual({ generation: 2, requestId: 6, requestKind: 'full' });
    expect(output.declaration?.title).toBe('Refresh');
  });
});

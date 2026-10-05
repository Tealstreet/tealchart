import { expect, it } from 'vitest';

import { lifecycleBars, withLifecycleWorker } from './worklist-load-reload-fixture';

it.each([5, 6])('1765 v%i initial attachment publishes every bar through the public worker', async (version) => {
  await withLifecycleWorker(async (worker, results) => {
    const source = `//@version=${version}
indicator("Initial attachment")
factor = input.int(2, "Factor")
var float total = 0
total += close * factor
plot(total, "Total")
plot(ta.sma(close, 2), "Mean")
line.new(bar_index, close, bar_index + 1, total)`;
    await worker.init('study', source, lifecycleBars([7, 3, 11]));
    expect(results).toHaveLength(1);
    const output = results[0]!;
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [14, 20, 42],
      [null, 5, 7],
    ]);
    expect(output.plots.map((plot) => plot.title)).toEqual(['Total', 'Mean']);
    expect(
      output.drawings.filter((drawing) => drawing.type === 'line').map((line) => [line.x1, line.y1, line.y2]),
    ).toEqual([
      [0, 7, 14],
      [1, 3, 20],
      [2, 11, 42],
    ]);
    expect(output.inputs).toEqual([expect.objectContaining({ title: 'Factor', defval: 2 })]);
    expect(output.declaration?.title).toBe('Initial attachment');
    expect(output.metadata).toEqual({ generation: 1, requestId: 1, requestKind: 'full' });
  });
});

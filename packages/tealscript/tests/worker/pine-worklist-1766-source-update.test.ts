import { expect, it } from 'vitest';

import { lifecycleBars, withLifecycleWorker } from './worklist-load-reload-fixture';

it.each([5, 6])('1766 v%i source update replaces outputs and excludes a delayed previous result', async (version) => {
  await withLifecycleWorker(async (worker, results, messages, replay) => {
    await worker.init(
      'study',
      `//@version=${version}
indicator("Previous")
oldFactor = input.int(2, "Old factor")
plot(close * oldFactor, "Old plot")
label.new(bar_index, close, "Old")`,
      lifecycleBars([7, 3, 11]),
    );
    const previous = messages.find((message) => message.type === 'result')!;
    worker.updateBar(lifecycleBars([7, 3, 13])[2]!);
    const source = `//@version=${version}
indicator("Replacement")
factor = input.int(3, "New factor")
var float total = 0
total += close * factor
plot(total, "New total")
plot(ta.sma(close, 2), "New mean")
line.new(bar_index, close, bar_index + 1, total)`;
    await worker.init('study', source, lifecycleBars([4, 8]));
    expect(results).toHaveLength(3);
    const output = results.at(-1)!;
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [12, 36],
      [null, 6],
    ]);
    expect(output.plots.map((plot) => plot.title)).toEqual(['New total', 'New mean']);
    expect(output.inputs).toEqual([expect.objectContaining({ title: 'New factor', defval: 3 })]);
    expect(output.declaration?.title).toBe('Replacement');
    expect(output.drawings.map((drawing) => drawing.type)).toEqual(['line', 'line']);
    expect(
      output.drawings.filter((drawing) => drawing.type === 'line').map((line) => [line.x1, line.y1, line.y2]),
    ).toEqual([
      [0, 4, 12],
      [1, 8, 36],
    ]);
    expect(output.metadata).toEqual({ generation: 2, requestId: 3, requestKind: 'full' });
    replay(previous);
    expect(results).toHaveLength(3);
    expect(results.at(-1)).toBe(output);
  });
});

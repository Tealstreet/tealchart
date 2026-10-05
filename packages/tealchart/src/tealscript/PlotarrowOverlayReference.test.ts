import { createResultMessage, executeScript, parse, type PlotOutput } from '@tealstreet/tealscript';
import { expect, it } from 'vitest';

import { TealscriptManager } from './TealscriptManager';

// fun_plotarrow remarks[0]: use overlay=true on the indicator for the recommended chart placement.
it('retains the recommended overlay declaration and real compiled arrows through the host', async () => {
  const source = '//@version=6\nindicator("Arrows", overlay=true)\nplotarrow(close - open, title="Direction")';
  const result = executeScript(parse(source), [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 },
    { time: 2000, open: 11, high: 12, low: 9, close: 10, volume: 1 },
  ]);
  expect(result.errors).toEqual([]);
  expect(result.declaration?.overlay).toBe(true);
  expect(result.plots[0]?.type).toBe('plotarrow');
  expect(result.plots[0]?.values).toEqual([1, -1]);
  const worker = { onmessage: null as ((event: MessageEvent) => void) | null, onerror: null, postMessage() {}, terminate() {} };
  const updates: PlotOutput[][] = [];
  const manager = new TealscriptManager({ createWorker: () => worker as unknown as Worker, onPlotsUpdated: plots => updates.push(plots) });
  const ready = manager.addScript('arrows', source);
  worker.onmessage?.({ data: { type: 'ready' } } as MessageEvent);
  await ready;
  worker.onmessage?.({ data: createResultMessage('arrows', result) } as MessageEvent);
  expect(manager.getDeclaration('arrows')?.overlay).toBe(true);
  expect(updates[0]?.[0]).toMatchObject({ type: 'plotarrow', values: [1, -1], scriptId: 'arrows' });
  manager.dispose();
});

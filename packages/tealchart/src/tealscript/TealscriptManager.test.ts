import { describe, expect, it } from 'vitest';

import { createResultMessage, type DrawingOutput, type PlotOutput } from '@tealstreet/tealscript';

import { TealscriptManager } from './TealscriptManager';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe('TealscriptManager', () => {
  it('consumes bundled worker results through legacy update callbacks', async () => {
    const worker = new FakeWorker();
    const plot: PlotOutput = {
      id: 'plot_close',
      type: 'plot',
      title: 'Close',
      values: [100, 101],
      color: '#ffffff',
    };
    const drawing: DrawingOutput = {
      id: 'label_1',
      type: 'label',
      barIndex: 1,
      x: 1,
      y: 101,
      text: 'L',
      xloc: 'bar_index',
      yloc: 'price',
      style: 'label.style_label_down',
      color: '#000000',
      textColor: '#ffffff',
      size: 'normal',
    };
    const plotUpdates: PlotOutput[][] = [];
    const drawingUpdates: DrawingOutput[][] = [];

    const manager = new TealscriptManager({
      createWorker: () => worker as unknown as Worker,
      onPlotsUpdated: (plots) => plotUpdates.push(plots),
      onDrawingsUpdated: (drawings) => drawingUpdates.push(drawings),
    });

    const addScript = manager.addScript('study-1', 'indicator("T")');
    worker.emit({ type: 'ready' });
    await addScript;

    worker.emit(createResultMessage('study-1', {
      plots: [plot],
      drawings: [drawing],
      alerts: [],
      inputs: [],
      metadata: {
        generation: 1,
        requestId: 1,
      },
    }));

    expect(plotUpdates).toHaveLength(1);
    expect(drawingUpdates).toHaveLength(1);
    expect(plotUpdates[0]).toEqual([{ ...plot, scriptId: 'study-1' }]);
    expect(drawingUpdates[0]).toEqual([{ ...drawing, scriptId: 'study-1' }]);
  });
});

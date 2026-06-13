import type { UserDrawingState } from '../drawings';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { TealchartWidgetUI } from './TealchartWidgetUI';

vi.mock('../interaction/EventManager', () => ({
  EventManager: class {
    getIsDragging() {
      return false;
    }
    dispose() {}
  },
}));

function stubCanvasContext(): void {
  const mockCtx = {
    canvas: { width: 800, height: 600 },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    lineCap: 'butt',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: (text: string) => ({ width: text.length * 7 }),
    setLineDash: () => {},
    arc: () => {},
    clip: () => {},
    rect: () => {},
    roundRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    transform: () => {},
    setTransform: () => {},
    scale: () => {},
    translate: () => {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = (() => mockCtx) as any;
}

const drawingState: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: { drawingId: 'label' },
  draft: null,
  textEdit: {
    drawingId: 'label',
    value: 'Draft note',
    originalValue: 'Note',
    startedAt: 1,
  },
  drawings: [
    {
      id: 'label',
      kind: 'textLabel',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: {
        lineColor: '#f5c542',
        lineWidth: 1,
        lineStyle: 'solid',
        textColor: '#ffffff',
        fontSize: 14,
      },
      point: { time: 50, price: 50 },
      text: 'Note',
      textAlign: 'center',
    },
  ],
};

describe('TealchartWidgetUI user drawing text editor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('renders an editor for active text edits and dispatches edit commands', () => {
    stubCanvasContext();
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ui = new TealchartWidgetUI({
      container,
      chartKey: 'text-edit-ui',
      symbol: 'BTCUSDT',
      interval: '60',
      showTopBar: false,
      userDrawingState: drawingState,
      onUserDrawingTextEditChange: onChange,
      onUserDrawingTextEditCommit: onCommit,
      onUserDrawingTextEditCancel: onCancel,
    });

    ui.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    ui.setUserDrawingState(drawingState);

    const editor = document.querySelector<HTMLTextAreaElement>('textarea[data-tealchart-user-drawing-text-editor="true"]');
    expect(editor).not.toBeNull();
    expect(editor?.value).toBe('Draft note');
    expect(editor?.style.color).toBe('rgb(255, 255, 255)');

    editor!.value = 'Changed';
    editor!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith('Changed');

    editor!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onCommit).toHaveBeenCalledTimes(1);

    editor!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    ui.setUserDrawingState({ ...drawingState, textEdit: null });
    expect(document.querySelector('textarea[data-tealchart-user-drawing-text-editor="true"]')).toBeNull();
    ui.dispose();
  });

  it('renders an editor for callout text edits at the text anchor', () => {
    stubCanvasContext();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const calloutState: UserDrawingState = {
      ...drawingState,
      selection: { drawingId: 'callout' },
      textEdit: {
        drawingId: 'callout',
        value: 'Draft callout',
        originalValue: 'Callout',
        startedAt: 1,
      },
      drawings: [
        {
          id: 'callout',
          kind: 'callout',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#f5c542',
            lineWidth: 1,
            lineStyle: 'solid',
            textColor: '#ffffff',
            fontSize: 14,
          },
          points: [
            { time: 35, price: 65 },
            { time: 50, price: 50 },
          ],
          text: 'Callout',
          textAlign: 'center',
        },
      ],
    };
    const ui = new TealchartWidgetUI({
      container,
      chartKey: 'callout-text-edit-ui',
      symbol: 'BTCUSDT',
      interval: '60',
      showTopBar: false,
      userDrawingState: calloutState,
    });

    ui.setViewport({ startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 });
    ui.setUserDrawingState(calloutState);

    const editor = document.querySelector<HTMLTextAreaElement>('textarea[data-tealchart-user-drawing-text-editor="true"]');
    expect(editor).not.toBeNull();
    expect(editor?.value).toBe('Draft callout');
    expect(editor?.style.left).not.toBe('');
    expect(editor?.style.top).not.toBe('');
    ui.dispose();
  });
});

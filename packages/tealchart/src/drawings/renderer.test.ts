import type { CanvasContext } from '../rendering/CanvasContext';
import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawing, UserDrawingState, UserDrawingStyle } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { renderUserDrawing, renderUserDrawingLayer, renderUserDrawings } from './renderer';

class RecordingCanvasContext implements CanvasContext {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  font = '12px sans-serif';
  textAlign: CanvasTextAlign = 'left';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  lineDashOffset = 0;
  globalAlpha = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  readonly calls: string[] = [];
  private lineDash: number[] = [];
  private readonly stateStack: { globalAlpha: number; lineDash: number[] }[] = [];

  beginPath(): void {
    this.calls.push('beginPath');
  }
  moveTo(x: number, y: number): void {
    this.calls.push(`moveTo:${x},${y}`);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(`lineTo:${x},${y}`);
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.calls.push(`quadraticCurveTo:${cpx},${cpy},${x},${y}`);
  }
  arc(x: number, y: number, radius: number): void {
    this.calls.push(`arc:${x},${y},${radius}:${this.globalAlpha}`);
  }
  rect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`rect:${x},${y},${width},${height}`);
  }
  roundRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`roundRect:${x},${y},${width},${height}`);
  }
  closePath(): void {
    this.calls.push('closePath');
  }
  fill(): void {
    this.calls.push('fill');
  }
  stroke(): void {
    this.calls.push(`stroke:${this.strokeStyle}:${this.lineWidth}:${this.lineDash.join(',')}`);
  }
  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect:${x},${y},${width},${height}:${this.fillStyle}`);
  }
  strokeRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`strokeRect:${x},${y},${width},${height}:${this.strokeStyle}`);
  }
  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText:${text}:${x},${y}:${this.fillStyle}:${this.textAlign}`);
  }
  save(): void {
    this.stateStack.push({ globalAlpha: this.globalAlpha, lineDash: [...this.lineDash] });
    this.calls.push('save');
  }
  restore(): void {
    const previous = this.stateStack.pop();
    if (previous) {
      this.globalAlpha = previous.globalAlpha;
      this.lineDash = previous.lineDash;
    }
    this.calls.push('restore');
  }
  clip(): void {
    this.calls.push('clip');
  }
  scale(x: number, y: number): void {
    this.calls.push(`scale:${x},${y}`);
  }
  translate(x: number, y: number): void {
    this.calls.push(`translate:${x},${y}`);
  }
  setLineDash(segments: number[]): void {
    this.lineDash = segments;
    this.calls.push(`setLineDash:${segments.join(',')}`);
  }
  getLineDash(): number[] {
    return this.lineDash;
  }
  measureText(text: string): TextMetrics {
    return { width: text.length * 6 } as TextMetrics;
  }
}

const style: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 2,
  lineStyle: 'dashed',
  fillColor: 'rgba(245, 197, 66, 0.12)',
  textColor: '#111',
  fontSize: 12,
};

const space: DrawingCoordinateSpace = {
  viewport: {
    startTime: 0,
    endTime: 100,
    priceMin: 0,
    priceMax: 100,
  },
  pane: {
    id: 'main',
    top: 0,
    height: 100,
    bottom: 100,
    yMin: 0,
    yMax: 100,
  },
  chartLeft: 0,
  chartRight: 100,
};

const base = {
  paneId: 'main',
  visible: true,
  locked: false,
  createdAt: 1,
  updatedAt: 1,
  style,
};

describe('user drawing renderer', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('renders line drawings through CanvasContext', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'line',
      kind: 'trendLine',
      points: [
        { time: 0, price: 50 },
        { time: 100, price: 50 },
      ],
      extend: 'none',
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:0,50');
    expect(ctx.calls).toContain('lineTo:100,50');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4');
  });

  it('clips drawings to the pane chart area', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'ray',
      kind: 'ray',
      points: [
        { time: 50, price: 50 },
        { time: 100, price: 10 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls.slice(0, 4)).toEqual(['save', 'beginPath', 'rect:0,0,100,100', 'clip']);
  });

  it('renders filled rectangles', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'rect',
      kind: 'rectangle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillRect:10,10,80,80:rgba(245, 197, 66, 0.12)');
    expect(ctx.calls).toContain('strokeRect:10,10,80,80:#f5c542');
  });

  it('renders text labels with measured boxes', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'label',
      kind: 'textLabel',
      point: { time: 50, price: 50 },
      text: 'Note',
      textAlign: 'center',
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillRect:32,40,36,20:rgba(245, 197, 66, 0.12)');
    expect(ctx.calls).toContain('fillText:Note:50,50:#111:center');
  });

  it('skips invisible drawings and drawings without a pane space', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'line',
      kind: 'horizontalLine',
      price: 50,
      visible: false,
    };

    renderUserDrawing(ctx, drawing, space);
    renderUserDrawings(ctx, [{ ...drawing, visible: true, paneId: 'missing' }], new Map([[space.pane.id, space]]));

    expect(ctx.calls).toEqual([]);
  });

  it('renders state layers with draft opacity and selection handles', () => {
    const ctx = new RecordingCanvasContext();
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'trendLine',
      selection: { drawingId: 'line' },
      drawings: [
        {
          ...base,
          id: 'line',
          kind: 'trendLine',
          points: [
            { time: 0, price: 50 },
            { time: 100, price: 50 },
          ],
          extend: 'none',
        },
      ],
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 0, price: 20 }],
        style,
        startedAt: 2,
      },
    };

    renderUserDrawingLayer(ctx, state, new Map([[space.pane.id, space]]), {
      draftPreviewAnchor: { time: 100, price: 20 },
      draftOpacity: 0.5,
    });

    expect(ctx.calls).toContain('lineTo:100,80');
    expect(ctx.calls).toContain('arc:0,50,4:1');
    expect(ctx.calls).toContain('arc:100,50,4:1');
    expect(ctx.globalAlpha).toBe(1);
  });

  it('does not render selection handles for invisible drawings', () => {
    const ctx = new RecordingCanvasContext();
    const state: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      selection: { drawingId: 'hidden' },
      drawings: [
        {
          ...base,
          id: 'hidden',
          kind: 'trendLine',
          visible: false,
          points: [
            { time: 0, price: 50 },
            { time: 100, price: 50 },
          ],
          extend: 'none',
        },
      ],
      draft: null,
    };

    renderUserDrawingLayer(ctx, state, new Map([[space.pane.id, space]]));

    expect(ctx.calls).toEqual([]);
  });
});

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
    this.calls.push(`stroke:${this.strokeStyle}:${this.lineWidth}:${this.lineDash.join(',')}:${this.globalAlpha}`);
  }
  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect:${x},${y},${width},${height}:${this.fillStyle}:${this.globalAlpha}`);
  }
  strokeRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`strokeRect:${x},${y},${width},${height}:${this.strokeStyle}:${this.globalAlpha}`);
  }
  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText:${text}:${x},${y}:${this.fillStyle}:${this.textAlign}:${this.globalAlpha}:${this.font}`);
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
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders trend angle line and label through CanvasContext', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'angle',
      kind: 'trendAngle',
      points: [
        { time: 0, price: 50 },
        { time: 100, price: 100 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:0,50');
    expect(ctx.calls).toContain('lineTo:100,0');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
    expect(ctx.calls).toContain('fillText:26.6°:50,21:#111:center:1:12px sans-serif');
  });

  it('renders arrow line heads through CanvasContext', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'arrow',
      kind: 'arrowLine',
      style: { ...style, lineStyle: 'solid' },
      points: [
        { time: 0, price: 50 },
        { time: 100, price: 50 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:0,50');
    expect(ctx.calls).toContain('lineTo:100,50');
    expect(ctx.calls.filter((call) => call === 'lineTo:100,50')).toHaveLength(2);
    expect(ctx.calls).toContain('stroke:#f5c542:2::1');
  });

  it('renders arrow markers as filled CanvasContext polygons', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'marker',
      kind: 'arrowMarker',
      style: { ...style, fillColor: '#22c55e', lineStyle: 'solid' },
      points: [
        { time: 0, price: 50 },
        { time: 100, price: 50 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:100,50');
    expect(ctx.calls).toContain('closePath');
    expect(ctx.calls).toContain('fill');
    expect(ctx.fillStyle).toBe('#22c55e');
    expect(ctx.calls).toContain('stroke:#f5c542:2::1');
  });

  it('renders arrow marks as filled CanvasContext polygons', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'mark-up',
      kind: 'arrowMarkUp',
      style: { ...style, fillColor: '#22c55e', lineStyle: 'solid' },
      point: { time: 50, price: 50 },
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:50,50');
    expect(ctx.calls).toContain('lineTo:59,60.8');
    expect(ctx.calls).toContain('closePath');
    expect(ctx.calls).toContain('fill');
    expect(ctx.fillStyle).toBe('#22c55e');
    expect(ctx.calls).toContain('stroke:#f5c542:2::1');
  });

  it('renders horizontal rays from their anchor to the chart right edge', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'horizontal-ray',
      kind: 'horizontalRay',
      point: { time: 30, price: 70 },
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:30,30');
    expect(ctx.calls).toContain('lineTo:100,30');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders cross lines through the anchor across chart and pane bounds', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'cross-line',
      kind: 'crossLine',
      point: { time: 30, price: 70 },
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:0,30');
    expect(ctx.calls).toContain('lineTo:100,30');
    expect(ctx.calls).toContain('moveTo:30,0');
    expect(ctx.calls).toContain('lineTo:30,100');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders circles through CanvasContext arcs', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'circle',
      kind: 'circle',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('arc:50,50,40:1');
    expect(ctx.calls).toContain('fill');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders ellipses through CanvasContext transforms', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'ellipse',
      kind: 'ellipse',
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 30 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('save');
    expect(ctx.calls).toContain('translate:50,40');
    expect(ctx.calls).toContain('scale:40,30');
    expect(ctx.calls).toContain('arc:0,0,1:1');
    expect(ctx.calls).toContain('restore');
    expect(ctx.calls).toContain('fill');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders extended lines to chart bounds through CanvasContext', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'extended',
      kind: 'extendedLine',
      points: [
        { time: 25, price: 50 },
        { time: 75, price: 25 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:0,37.5');
    expect(ctx.calls).toContain('lineTo:100,87.5');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders info lines with shared measurement labels', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'info',
      kind: 'infoLine',
      points: [
        { time: 10_000, price: 50 },
        { time: 70_000, price: 75 },
      ],
    };

    renderUserDrawing(ctx, drawing, { ...space, viewport: { ...space.viewport, startTime: 0, endTime: 100_000 } });

    expect(ctx.calls).toContain('moveTo:10,50');
    expect(ctx.calls).toContain('lineTo:70,25');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
    expect(ctx.calls).toContain('fillText:+25.00 (+50.00%) / 1 minute:40,33.5:#111:center:1:12px sans-serif');
  });

  it('renders vertical extended lines to pane bounds through CanvasContext', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'extended',
      kind: 'extendedLine',
      points: [
        { time: 50, price: 25 },
        { time: 50, price: 75 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:50,0');
    expect(ctx.calls).toContain('lineTo:50,100');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
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

    expect(ctx.calls).toContain('fillRect:10,10,80,80:rgba(245, 197, 66, 0.12):1');
    expect(ctx.calls).toContain('strokeRect:10,10,80,80:#f5c542:1');
  });

  it('renders price ranges with a centered delta label', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'range',
      kind: 'priceRange',
      points: [
        { time: 10, price: 70 },
        { time: 90, price: 90 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillRect:10,10,80,20:rgba(245, 197, 66, 0.12):1');
    expect(ctx.calls).toContain('strokeRect:10,10,80,20:#f5c542:1');
    expect(ctx.calls).toContain('fillText:+20.00 (+28.57%):50,20:#111:center:1:12px sans-serif');
  });

  it('renders price range labels from visual low to high when anchors are reversed', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'range',
      kind: 'priceRange',
      points: [
        { time: 90, price: 90 },
        { time: 10, price: 70 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillText:+20.00 (+28.57%):50,20:#111:center:1:12px sans-serif');
  });

  it('renders date ranges with a centered duration label', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'date-range',
      kind: 'dateRange',
      points: [
        { time: 10_000, price: 90 },
        { time: 70_000, price: 10 },
      ],
    };

    renderUserDrawing(ctx, drawing, { ...space, viewport: { ...space.viewport, startTime: 0, endTime: 100_000 } });

    expect(ctx.calls).toContain('fillRect:10,0,60,100:rgba(245, 197, 66, 0.12):1');
    expect(ctx.calls).toContain('strokeRect:10,0,60,100:#f5c542:1');
    expect(ctx.calls).toContain('fillText:1 minute:40,50:#111:center:1:12px sans-serif');
  });

  it('renders date and price ranges with price and duration labels', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'date-price-range',
      kind: 'datePriceRange',
      points: [
        { time: 10_000, price: 90 },
        { time: 70_000, price: 10 },
      ],
    };

    renderUserDrawing(ctx, drawing, { ...space, viewport: { ...space.viewport, startTime: 0, endTime: 100_000 } });

    expect(ctx.calls).toContain('fillRect:10,10,60,80:rgba(245, 197, 66, 0.12):1');
    expect(ctx.calls).toContain('strokeRect:10,10,60,80:#f5c542:1');
    expect(ctx.calls).toContain('fillText:+80.00 (+800.00%):40,50:#111:center:1:12px sans-serif');
    expect(ctx.calls).toContain('fillText:1 minute:40,78:#111:center:1:12px sans-serif');
  });

  it('renders Fibonacci retracement levels with labels', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'fib',
      kind: 'fibRetracement',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:10,80');
    expect(ctx.calls).toContain('lineTo:90,80');
    expect(ctx.calls).toContain('moveTo:10,50');
    expect(ctx.calls).toContain('lineTo:90,50');
    expect(ctx.calls).toContain('moveTo:10,20');
    expect(ctx.calls).toContain('lineTo:90,20');
    expect(ctx.calls.filter((call) => call === 'stroke:#f5c542:2:6,4:1')).toHaveLength(9);
    expect(ctx.calls).toContain('fillText:0 20.00:14,78:#111:left:1:12px sans-serif');
    expect(ctx.calls).toContain('fillText:0.5 50.00:14,48:#111:left:1:12px sans-serif');
    expect(ctx.calls).toContain('fillText:1 80.00:14,18:#111:left:1:12px sans-serif');
  });

  it('renders Fibonacci extension levels with labels', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'fib-ext',
      kind: 'fibExtension',
      points: [
        { time: 10, price: 20 },
        { time: 90, price: 80 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:10,80');
    expect(ctx.calls).toContain('lineTo:90,80');
    expect(ctx.calls).toContain('moveTo:10,20');
    expect(ctx.calls).toContain('lineTo:90,20');
    expect(ctx.calls.filter((call) => call === 'stroke:#f5c542:2:6,4:1')).toHaveLength(9);
    expect(ctx.calls.some((call) => call.startsWith('fillText:1.272 96.32:14,1.'))).toBe(true);
    expect(ctx.calls).toContain('fillText:2.000 140.00:14,-42:#111:left:1:12px sans-serif');
  });

  it('renders path drawings as stroked polylines', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'path',
      kind: 'path',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:10,10');
    expect(ctx.calls).toContain('lineTo:50,50');
    expect(ctx.calls).toContain('lineTo:90,10');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders triangle drawings as filled closed polygons', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'triangle',
      kind: 'triangle',
      points: [
        { time: 10, price: 90 },
        { time: 50, price: 50 },
        { time: 90, price: 90 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:10,10');
    expect(ctx.calls).toContain('lineTo:50,50');
    expect(ctx.calls).toContain('lineTo:90,10');
    expect(ctx.calls).toContain('closePath');
    expect(ctx.calls).toContain('fill');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders parallel channels as filled closed polygons', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'channel',
      kind: 'parallelChannel',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:10,50');
    expect(ctx.calls).toContain('lineTo:90,50');
    expect(ctx.calls).toContain('lineTo:90,20');
    expect(ctx.calls).toContain('lineTo:10,20');
    expect(ctx.calls).toContain('closePath');
    expect(ctx.calls).toContain('fill');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('renders regression trends as filled closed channel polygons', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'regression',
      kind: 'regressionTrend',
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('moveTo:10,50');
    expect(ctx.calls).toContain('lineTo:90,50');
    expect(ctx.calls).toContain('lineTo:90,20');
    expect(ctx.calls).toContain('lineTo:10,20');
    expect(ctx.calls).toContain('closePath');
    expect(ctx.calls).toContain('fill');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
  });

  it('requires explicit fill colors for parallel channel fills', () => {
    const ctx = new RecordingCanvasContext();
    const { fillColor: _fillColor, ...styleWithoutFillColor } = style;
    const drawing: UserDrawing = {
      ...base,
      id: 'channel',
      kind: 'parallelChannel',
      style: styleWithoutFillColor,
      points: [
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('closePath');
    expect(ctx.calls).not.toContain('fill');
    expect(ctx.calls).toContain('stroke:#f5c542:2:6,4:1');
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

    expect(ctx.calls).toContain('fillRect:32,40,36,20:rgba(245, 197, 66, 0.12):1');
    expect(ctx.calls).toContain('fillText:Note:38,50:#111:left:1:12px sans-serif');
  });

  it('renders multiline text labels with one canvas text draw per line', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'label',
      kind: 'textLabel',
      point: { time: 50, price: 50 },
      text: 'Longer\nB',
      textAlign: 'right',
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillRect:26,31,48,38:rgba(245, 197, 66, 0.12):1');
    expect(ctx.calls).toContain('fillText:Longer:32,41:#111:left:1:12px sans-serif');
    expect(ctx.calls).toContain('fillText:B:62,59:#111:left:1:12px sans-serif');
  });

  it('renders text labels with configured font families', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'label',
      kind: 'textLabel',
      style: { ...style, fontFamily: 'monospace' },
      point: { time: 50, price: 50 },
      text: 'Note',
      textAlign: 'center',
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillText:Note:38,50:#111:left:1:12px monospace');
  });

  it('normalizes unsupported text label font families', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'label',
      kind: 'textLabel',
      style: { ...style, fontFamily: 'fantasy' },
      point: { time: 50, price: 50 },
      text: 'Note',
      textAlign: 'center',
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillText:Note:38,50:#111:left:1:12px sans-serif');
  });

  it('applies drawing style opacity while restoring canvas alpha', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'rect',
      kind: 'rectangle',
      style: { ...style, opacity: 0.5 },
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls).toContain('fillRect:10,10,80,80:rgba(245, 197, 66, 0.12):0.5');
    expect(ctx.calls).toContain('strokeRect:10,10,80,80:#f5c542:0.5');
    expect(ctx.globalAlpha).toBe(1);
  });

  it('suppresses fill and stroke draw calls from style visibility flags', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'rect',
      kind: 'rectangle',
      style: { ...style, fillVisible: false, lineVisible: false },
      points: [
        { time: 10, price: 90 },
        { time: 90, price: 10 },
      ],
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls.some((call) => call.startsWith('fillRect:'))).toBe(false);
    expect(ctx.calls.some((call) => call.startsWith('strokeRect:'))).toBe(false);
  });

  it('suppresses line drawing strokes from style visibility flags', () => {
    const ctx = new RecordingCanvasContext();
    const drawing: UserDrawing = {
      ...base,
      id: 'line',
      kind: 'trendLine',
      style: { ...style, lineVisible: false },
      points: [
        { time: 0, price: 50 },
        { time: 100, price: 50 },
      ],
      extend: 'none',
    };

    renderUserDrawing(ctx, drawing, space);

    expect(ctx.calls.some((call) => call.startsWith('stroke:'))).toBe(false);
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
      textEdit: null,
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
      textEdit: null,
    };

    renderUserDrawingLayer(ctx, state, new Map([[space.pane.id, space]]));

    expect(ctx.calls).toEqual([]);
  });
});

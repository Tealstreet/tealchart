/**
 * Performance benchmarks for TealchartRenderer
 *
 * Run with: cd packages/tealchart && yarn bench
 *
 * Uses Vitest bench API (already in devDependencies via vitest)
 */

import type { Bar, ChartPane, RenderOptions, UnifiedPaneLayout, Viewport } from '../types';

import { bench, describe } from 'vitest';

import { TealchartRenderer } from '../TealchartRenderer';
import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from '../types';

// ============================================================================
// Test Data Generators
// ============================================================================

function generateBars(count: number, basePrice = 50000): Bar[] {
  const bars: Bar[] = [];
  const interval = 60000; // 1 minute
  const startTime = Date.now() - count * interval;
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const volatility = basePrice * 0.001; // 0.1% volatility per bar
    const change = (Math.random() - 0.5) * 2 * volatility;
    price += change;

    const open = price;
    const close = price + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    bars.push({
      time: startTime + i * interval,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000,
    });
  }

  return bars;
}

function createViewport(bars: Bar[], visibleCount?: number): Viewport {
  const visible = visibleCount ?? bars.length;
  const slice = bars.slice(-visible);
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const bar of slice) {
    if (bar.low < minPrice) minPrice = bar.low;
    if (bar.high > maxPrice) maxPrice = bar.high;
  }

  const padding = (maxPrice - minPrice) * 0.05;

  return {
    startTime: slice[0].time,
    endTime: slice[slice.length - 1].time,
    priceMin: minPrice - padding,
    priceMax: maxPrice + padding,
  };
}

function createLayout(indicatorPanes = 0): UnifiedPaneLayout {
  const panes: ChartPane[] = [
    {
      id: 'main',
      type: 'main',
      heightRatio: indicatorPanes === 0 ? 1.0 : Math.max(0.4, 1 - indicatorPanes * 0.15),
      yMin: 0,
      yMax: 0,
      fixedRange: false,
    },
  ];

  for (let i = 0; i < indicatorPanes; i++) {
    panes.push({
      id: `indicator_${i}`,
      type: 'indicator',
      heightRatio: 0.15,
      yMin: 0,
      yMax: 100,
      fixedRange: true,
      indicatorIds: [`ind_${i}`],
    });
  }

  return { panes, timeAxisHeight: 30 };
}

// ============================================================================
// Canvas mock (minimal for benchmarking)
// ============================================================================

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const noop = () => {};
  const ctx = {
    canvas: { width, height },
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fill: noop,
    fillText: noop,
    strokeText: noop,
    measureText: (text: string) => ({ width: text.length * 7 }),
    setLineDash: noop,
    rect: noop,
    arc: noop,
    clip: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    createLinearGradient: () => ({
      addColorStop: noop,
    }),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineDashOffset: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D;

  return {
    getContext: () => ctx,
    width,
    height,
  } as unknown as HTMLCanvasElement;
}

// ============================================================================
// Static method benchmarks
// ============================================================================

describe('TealchartRenderer static methods', () => {
  const bars100 = generateBars(100);
  const bars1000 = generateBars(1000);
  const bars5000 = generateBars(5000);
  const bars10000 = generateBars(10000);

  bench('calculateViewport - 100 bars', () => {
    TealchartRenderer.calculateViewport(bars100);
  });

  bench('calculateViewport - 1,000 bars', () => {
    TealchartRenderer.calculateViewport(bars1000);
  });

  bench('calculateViewport - 5,000 bars', () => {
    TealchartRenderer.calculateViewport(bars5000);
  });

  bench('calculateViewport - 10,000 bars', () => {
    TealchartRenderer.calculateViewport(bars10000);
  });

  const indicatorValues100 = Array.from({ length: 100 }, () => Math.random() * 100);
  const indicatorValues1000 = Array.from({ length: 1000 }, () => Math.random() * 100);
  const indicatorValues10000 = Array.from({ length: 10000 }, () => Math.random() * 100);

  bench('calculateIndicatorRange - 100 values', () => {
    TealchartRenderer.calculateIndicatorRange(indicatorValues100);
  });

  bench('calculateIndicatorRange - 1,000 values', () => {
    TealchartRenderer.calculateIndicatorRange(indicatorValues1000);
  });

  bench('calculateIndicatorRange - 10,000 values', () => {
    TealchartRenderer.calculateIndicatorRange(indicatorValues10000);
  });
});

describe('computePanesLayout', () => {
  const canvas = createMockCanvas(1920, 1080);
  const options: RenderOptions = {
    ...DEFAULT_RENDER_OPTIONS,
    width: 1920,
    height: 1080,
  };
  const renderer = new TealchartRenderer(canvas, options);

  bench('no indicator panes', () => {
    const layout = createLayout(0);
    renderer.computePanesLayout(layout, 1080);
  });

  bench('2 indicator panes', () => {
    const layout = createLayout(2);
    renderer.computePanesLayout(layout, 1080);
  });

  bench('6 indicator panes', () => {
    const layout = createLayout(6);
    renderer.computePanesLayout(layout, 1080);
  });
});

describe('coordinate transforms', () => {
  const canvas = createMockCanvas(1920, 1080);
  const options: RenderOptions = {
    ...DEFAULT_RENDER_OPTIONS,
    width: 1920,
    height: 1080,
  };
  const renderer = new TealchartRenderer(canvas, options);
  const viewport: Viewport = {
    startTime: Date.now() - 3600000,
    endTime: Date.now(),
    priceMin: 49000,
    priceMax: 51000,
  };
  const layout = createLayout(0);

  bench('publicPriceToYWithLayout', () => {
    renderer.publicPriceToYWithLayout(50000, viewport, layout);
  });

  bench('publicYToPriceWithLayout', () => {
    renderer.publicYToPriceWithLayout(500, viewport, layout);
  });
});

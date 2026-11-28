// @vitest-environment jsdom

import type { UserDrawingState } from '../drawings';
import type { EventManagerCallbacks } from '../interaction/EventManager';
import type { Bar, PaneLayout } from '../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache, DEFAULT_CHART_SETTINGS, getChartStore } from '../state/chartState';
import { DEFAULT_MARGINS } from '../types';
import { TealchartWidgetUI } from './TealchartWidgetUI';

const events = vi.hoisted(() => ({ callbacks: null as EventManagerCallbacks | null }));

vi.mock('../interaction/EventManager', () => ({
  EventManager: class {
    constructor(_canvas: unknown, callbacks: EventManagerCallbacks) {
      events.callbacks = callbacks;
    }
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

describe('TealchartWidgetUI legend instrument precision', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  const ohlcValues = (container: HTMLElement) => ['O', 'H', 'L', 'C'].map((label) => {
    const element = [...container.querySelectorAll('span')].find((span) => span.textContent === label);
    return element?.nextElementSibling;
  });

  it.each([320, 375])('retains eight decimals on initial render, ticks and precision changes at %ipx', (width) => {
    stubCanvasContext();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, width, 240));
    const container = document.createElement('div');
    container.style.width = `${width}px`;
    document.body.appendChild(container);
    const ui = new TealchartWidgetUI({
      container, chartKey: `legend-precision-${width}`, symbol: 'PRECISE', interval: '60', showTopBar: false,
      renderOptions: { pricePrecision: 1 / 100_000_000 },
    });
    const bar: Bar = { time: 60_000, open: 1.23456789, high: 1.23456799, low: 1.23456701, close: 1.23456791, volume: 10 };
    try {
      ui.setBars([bar]);
      const elements = ohlcValues(container);
      expect(elements.map((element) => element?.textContent)).toEqual([
        '1.23456789', '1.23456799', '1.23456701', '1.23456791',
      ]);
      const tick = { ...bar, close: 1.23456792 };
      ui.updateBar(tick, [tick]);
      expect(ohlcValues(container)[3]).toBe(elements[3]);
      expect(elements[3]?.textContent).toBe('1.23456792');

      ui.setRenderOptions({ pricePrecision: 0.01 });
      expect(ohlcValues(container)).toEqual(elements);
      expect(elements.map((element) => element?.textContent)).toEqual(['1.23', '1.23', '1.23', '1.23']);
      ui.setSymbol('WHOLE');
      ui.setRenderOptions({ pricePrecision: 1 });
      expect(ohlcValues(container).map((element) => element?.textContent)).toEqual(['1', '1', '1', '1']);
      expect(bar.close).toBe(1.23456791);
      expect(tick.close).toBe(1.23456792);
    } finally {
      ui.dispose();
    }
  });

  it.each([
    [1e-6, 0.003533, 0.003534, 0.003532, '+0.000001 (0.03%)', '-0.000001 (-0.03%)'],
    [1, 59834, 59867, 59801, '+33 (0.06%)', '-33 (-0.06%)'],
    [undefined, 59834, 59867, 59801, '+33.00 (0.06%)', '-33.00 (-0.06%)'],
  ] as const)('formats the change at precision %s from %s to %s and %s', (pricePrecision, prevClose, close, tickClose, up, down) => {
    stubCanvasContext();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ui = new TealchartWidgetUI({
      container, chartKey: `legend-change-${pricePrecision}`, symbol: 'CHANGE', interval: '60', showTopBar: false,
      renderOptions: { pricePrecision },
    });
    const changeText = () => [...container.querySelectorAll('span')].find((span) => span.textContent?.endsWith('%)'))?.textContent;
    const previous: Bar = { time: 0, open: prevClose, high: prevClose, low: prevClose, close: prevClose, volume: 1 };
    const bar: Bar = { time: 60_000, open: close, high: close, low: close, close, volume: 1 };
    try {
      ui.setBars([previous, bar]);
      expect(changeText()).toBe(up);
      const tick = { ...bar, close: tickClose };
      ui.updateBar(tick, [previous, tick]);
      expect(changeText()).toBe(down);
    } finally {
      ui.dispose();
    }
  });

  it.each([
    [undefined, 1.23456789, '1.23'],
    [0.01, 1.2, '1.20'],
    [0.25, 1234.5, '1,234.50'],
    [1, 1234.5, '1,235'],
    [1e-8, 1e-8, '0.00000001'],
    [0, 1.23456789, '1.23'],
    [-1, 1.23456789, '1.23'],
    [NaN, 1.23456789, '1.23'],
    [Infinity, 1.23456789, '1.23'],
  ] as const)('formats precision %s and price %s as %s', (pricePrecision, price, expected) => {
    stubCanvasContext();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ui = new TealchartWidgetUI({
      container, chartKey: `legend-control-${pricePrecision}`, symbol: 'CONTROL', interval: '60', showTopBar: false,
      renderOptions: { pricePrecision },
    });
    try {
      ui.setBars([{ time: 60_000, open: price, high: price, low: price, close: price, volume: 10 }]);
      expect(ohlcValues(container).map((element) => element?.textContent)).toEqual(Array(4).fill(expected));
    } finally {
      ui.dispose();
    }
  });
});

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

describe('TealchartWidgetUI legend layout', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('updates numeric readouts on hover, leave, plot ticks, and metadata changes', () => {
    stubCanvasContext();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ui = new TealchartWidgetUI({ container, chartKey: 'readouts', symbol: 'TEST', interval: '60', showTopBar: false, showDataWindow: true });
    container.querySelector<HTMLDetailsElement>("[data-tealchart-data-window]")!.open = true;
    const bars = [1000, 2000, 10000].map((time) => ({ time, open: 1, high: 3, low: 1, close: 2, volume: 1 }));
    const indicators = [{ id: 'study', name: 'Study', isVisible: true, inputs: {} }];
    const output = { id: 'plot', scriptId: 'study', type: 'plot' as const, title: 'Signal', values: [10, 20, 30], color: '#ff0000', display: 6 };
    ui.setBars(bars);
    ui.setViewport({ startTime: 1000, endTime: 10000, priceMin: 0, priceMax: 40 });
    ui.setActiveIndicators(indicators, { study: { overlay: true, name: 'Study', precision: 1 } });
    ui.setPlots([output]);
    const status = () => container.querySelector('[data-indicator-values="study"]')?.textContent;
    const window = container.querySelector('[data-tealchart-data-window]')!;
    expect(status()).toBe('30.0');
    expect(window.textContent).toContain('Signal30.0');

    events.callbacks!.onCrossHairMoved!(DEFAULT_MARGINS.left, 100);
    expect(status()).toBe('10.0');
    expect(window.textContent).toContain('Signal10.0');
    ui.setPlots([{ ...output, values: [11, 20, 31] }]);
    expect(status()).toBe('11.0');
    events.callbacks!.onCrossHairVisibilityChange!(false);
    expect(status()).toBe('31.0');
    ui.setActiveIndicators(indicators, { study: { overlay: true, name: 'Study', format: 'percent', precision: 2 } });
    expect(status()).toBe('31.00%');
    expect(window.textContent).toContain('Signal31.00%');
    ui.setPlots([{ ...output, display: 2 }]);
    expect(status()).toBe('');
    expect(window.textContent).toContain('Signal30.00%');
    ui.dispose();
  });

  it('moves indicator pane legends right when drawing tools own the left rail', () => {
    stubCanvasContext();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ui = new TealchartWidgetUI({
      container,
      chartKey: 'indicator-pane-legend-left-rail',
      symbol: 'BTCUSDT',
      interval: '60',
    });
    const chartRoot = container.querySelector<HTMLElement>('[data-tealchart-root="true"]');
    const chartArea = chartRoot?.firstElementChild as HTMLElement | null;
    if (!chartArea) throw new Error('Expected chart area to mount');
    Object.defineProperty(chartArea, 'clientHeight', { configurable: true, value: 600 });

    const paneLayout: PaneLayout = {
      mainPaneHeight: 0.7,
      volumePaneHeight: 0,
      indicatorPanes: [
        { id: 'pane_1', heightRatio: 0.3, indicatorIds: ['rsi'], yMin: 0, yMax: 100, fixedRange: true },
      ],
    };

    ui.setPaneLayout(paneLayout);
    ui.setActiveIndicators(
      [{ id: 'rsi', name: 'RSI', isVisible: true, inputs: { length: 14 } }],
      {
        rsi: {
          overlay: false,
          name: 'RSI',
          inputs: { length: 14 },
        },
      },
    );

    const paneLegend = container.querySelector<HTMLElement>('[data-tealchart-indicator-pane-legend="pane_1"]');
    expect(paneLegend).not.toBeNull();
    expect(paneLegend?.style.left).toBe('12px');

    ui.setUserDrawingState({ ...drawingState, textEdit: null });
    expect(paneLegend?.style.left).toBe('70px');

    ui.dispose();
  });

  it('renders the settings gear as the axis corner cell, not a floating button', () => {
    // Placement is part of the feature. Floating it over the candles reads as a
    // FAB; TradingView puts it in the cell where the time and price axes meet,
    // so it is sized from the same margins the renderer uses.
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ui = new TealchartWidgetUI({
      container,
      chartKey: 'settings-gear-ui',
      symbol: 'BTCUSDT',
      interval: '60',
      showTopBar: false,
      chartSettingsContext: {
        getSettings: () => DEFAULT_CHART_SETTINGS,
        setSetting: () => undefined,
        setChartProperties: () => undefined,
        markLayoutDirty: () => undefined,
      },
    });
    void ui;

    const gear = container.querySelector<HTMLElement>('[data-tealchart-chart-settings-button]');
    expect(gear).not.toBeNull();
    expect(gear!.style.right).toBe('0px');
    expect(gear!.style.bottom).toBe('0px');
    // Square on the time-axis height so the glyph lands on the axis
    // intersection rather than half a price-axis in from the edge.
    expect(gear!.style.width).toBe(`${DEFAULT_MARGINS.bottom}px`);
    expect(gear!.style.height).toBe(`${DEFAULT_MARGINS.bottom}px`);
    expect(gear!.style.background).toBe('var(--tc-canvas-bg, var(--tealchart-chrome-bg, #131722))');
    expect(gear!.style.borderTop).toBe('1px solid var(--tc-border, rgba(255, 255, 255, 0.08))');
    expect(gear!.querySelector('svg')).not.toBeNull();

  });
});


it("hides overridden plot readouts together with the canvas output", () => {
  stubCanvasContext();
  const container = document.createElement("div");
  const ui = new TealchartWidgetUI({ container, chartKey: "hidden-readouts", symbol: "TEST", interval: "60", showTopBar: false, showDataWindow: true });
  ui.setBars([{ time: 1000, open: 1, high: 2, low: 1, close: 2, volume: 1 }]);
  const output = { id: "signal", type: "plot" as const, scriptId: "study", title: "Signal", values: [42], color: "red" };
  ui.setPlots([output]);
  ui.setActiveIndicators([{ id: "study", name: "Study", isVisible: true, inputs: {}, styleOverrides: [{ plotId: "signal", display: 0 }] }], { study: { overlay: true, name: "Study" } });
  expect(container.querySelector("[data-indicator-values] ")?.textContent).toBe("");
  expect(container.querySelector("[data-tealchart-data-window]")?.hasAttribute("hidden")).toBe(true);
  ui.dispose();
});


it("keeps Data Window opt-in while retaining default legend values", () => {
  stubCanvasContext();
  for (const enabled of [undefined, false, true]) {
    const container = document.createElement("div");
    const ui = new TealchartWidgetUI({ container, chartKey: "window-option-" + enabled, symbol: "TEST", interval: "60", showTopBar: false, showDataWindow: enabled });
    ui.setBars([{ time: 1000, open: 1, high: 2, low: 1, close: 2, volume: 1 }]);
    ui.setActiveIndicators([{ id: "study", name: "Study", isVisible: true, inputs: {} }], { study: { overlay: true, name: "Study" } });
    ui.setPlots([{ id: "signal", type: "plot", scriptId: "study", title: "Signal", values: [42], color: "red", precision: 0 }]);
    expect(Boolean(container.querySelector("[data-tealchart-data-window]"))).toBe(enabled === true);
    expect(container.querySelector("[data-indicator-values]")?.textContent).toBe("42");
    ui.dispose();
  }
});

it('keeps analysis controls opt-in and revokes callback ownership without recreating the chart', () => {
  stubCanvasContext();
  const container = document.createElement('div');
  document.body.append(container);
  const ui = new TealchartWidgetUI({ container, chartKey: 'analysis-controls', symbol: 'TEST', interval: '60', showTopBar: false, getAnalysisIdentity: () => 'TEST:60:1' });
  const handler = vi.fn();
  ui.setBars([{ time: 1000, open: 1, high: 2, low: 1, close: 2, volume: 1 }]);
  ui.setViewport({ startTime: 0, endTime: 2000, priceMin: 0, priceMax: 3 });
  expect(container.querySelector('button[aria-label="Analyze chart"]')).toBeNull();
  expect(ui.startAnalysisSelection()).toBe(false);
  ui.setAnalysisRequestHandler(handler);
  const analyze = container.querySelector<HTMLButtonElement>('button[aria-label="Analyze chart"]')!;
  const toolbar = analyze.parentElement!;
  expect(toolbar.style.left).toBe('78px');
  getChartStore('analysis-controls').uiPreferences.setKey('leftToolRailCollapsed', true);
  expect(toolbar.style.left).toBe('37px');
  getChartStore('analysis-controls').uiPreferences.setKey('leftToolRailCollapsed', false);
  expect(toolbar.style.left).toBe('78px');
  analyze.click();
  expect(handler).toHaveBeenLastCalledWith({ action: 'describe' });
  expect(ui.startAnalysisSelection()).toBe(true);
  ui.setAnalysisRequestHandler(undefined);
  const calls = handler.mock.calls.length;
  analyze.click();
  expect(handler).toHaveBeenCalledTimes(calls);
  expect(ui.startAnalysisSelection()).toBe(false);
  ui.setAnalysisRequestHandler(handler);
  ui.dispose();
  analyze.click();
  expect(handler).toHaveBeenCalledTimes(calls);
  clearChartStoreCache();
});

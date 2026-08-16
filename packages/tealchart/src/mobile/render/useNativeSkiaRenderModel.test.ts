import type { Bar, OrderLineRenderData, PositionLineRenderData, PriceLine } from '../../types';

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_RENDER_OPTIONS } from '../../types';
import { NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH } from '../utils/leftToolRailLayout';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { createNativeChartProjection } from './nativeProjection';
import { useNativeSkiaRenderModel } from './useNativeSkiaRenderModel';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useMemo: <T>(factory: () => T) => factory(),
  };
});

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 480,
    margins: { bottom: 32, left: 62, right: 76, top: 36 },
  },
  panes: [{ id: 'main', type: 'main', top: 36, height: 412, yMin: 62000, yMax: 66000 }],
});

const projection = createNativeChartProjection({
  frame,
  viewport: {
    startTime: 0,
    endTime: 2_700,
    priceMin: 62000,
    priceMax: 66000,
  },
});

const bars: Bar[] = [
  { time: 0, open: 63700, high: 63800, low: 63600, close: 63750, volume: 100 },
  { time: 900, open: 63750, high: 63900, low: 63650, close: 63850, volume: 200 },
  { time: 1_800, open: 63850, high: 64000, low: 63700, close: 63777, volume: 150 },
];

function createOrderLine(): OrderLineRenderData {
  return {
    id: 'adapter-order',
    orderId: 'adapter-order',
    price: 63500,
    quantity: '0.0003',
    quantityShort: '0.0003',
    text: 'Buy Limit',
    textShort: 'Buy',
    lineColor: '#18aee8',
    lineStyle: 2,
    lineWidth: 1,
    lineLength: 0,
    lineLengthUnit: 'percentage',
    extendLeft: false,
    editable: true,
    cancellable: true,
    cancelAsSubmit: false,
    bodyBackgroundColor: '#20242a',
    bodyTextColor: '#18aee8',
    bodyBorderColor: '#18aee8',
    bodyFont: '11px Arial',
    quantityBackgroundColor: '#18aee8',
    quantityTextColor: '#101418',
    quantityBorderColor: '#18aee8',
    quantityFont: '11px Arial',
    cancelButtonBackgroundColor: '#20242a',
    cancelButtonIconColor: '#18aee8',
    cancelButtonBorderColor: '#18aee8',
    tooltip: '',
    cancelTooltip: '',
    modifyTooltip: '',
    brackets: { takeProfit: 65000, stopLoss: 63000 },
    partialEnabled: true,
    callbacks: { onMove: () => undefined },
  };
}

function createPositionLine(): PositionLineRenderData {
  return {
    id: 'adapter-position',
    positionId: 'adapter-position',
    price: 63777,
    quantity: '0.0024',
    quantityShort: '0.0024',
    text: 'Long',
    textShort: 'Long',
    lineColor: '#18aee8',
    lineStyle: 0,
    lineWidth: 1,
    lineLength: 90,
    lineLengthUnit: 'percentage',
    extendLeft: true,
    bodyBackgroundColor: '#20242a',
    bodyTextColor: '#18aee8',
    bodyBorderColor: '#18aee8',
    bodyFont: '11px Arial',
    quantityBackgroundColor: '#18aee8',
    quantityTextColor: '#101418',
    quantityBorderColor: '#18aee8',
    quantityFont: '11px Arial',
    closeable: true,
    closeButtonBackgroundColor: '#20242a',
    closeButtonIconColor: '#18aee8',
    closeButtonBorderColor: '#18aee8',
    reversible: true,
    reverseButtonBackgroundColor: '#20242a',
    reverseButtonIconColor: '#18aee8',
    reverseButtonBorderColor: '#18aee8',
    tooltip: '',
    closeTooltip: '',
    reverseTooltip: '',
    protectTooltipText: '',
    pnl: '+$1.33 (+0.17%)',
    pnlShort: '+$1.33',
    profitState: 'positive',
    brackets: { takeProfit: 64600, stopLoss: 63200 },
    partialEnabled: false,
    positionData: null,
  };
}

describe('useNativeSkiaRenderModel', () => {
  it('assembles native bars, chrome, trading geometry, and price-axis sources together', () => {
    const extraPriceLine: PriceLine = {
      id: 'oracle',
      price: 63800,
      color: '#8b929f',
      lineStyle: 'solid',
      type: 'price',
      label: { primaryText: '63,800' },
      renderLineOnCanvas: true,
      showAxisTag: true,
    };
    const orderLine = createOrderLine();
    const positionLine = createPositionLine();

    const model = useNativeSkiaRenderModel({
      bars,
      frame,
      interval: '15',
      lineSnapshot: {
        orderLines: [orderLine],
        positionLines: [positionLine],
      },
      marginsBottom: 32,
      onIndicatorsClick: () => undefined,
      options: {
        ...DEFAULT_RENDER_OPTIONS,
        backgroundColor: '#101418',
        gridColor: '#222831',
        textColor: '#f0f3fa',
        upColor: '#12c48b',
        downColor: '#f04465',
        showVolume: true,
      },
      priceAxisTagHeight: 22,
      priceLines: [extraPriceLine],
      pricePrecision: 0.1,
      projection,
      showTopBar: true,
      supportedResolutions: ['1', '5', '15', '30', '60'],
      symbol: 'BTC-USD',
      topBarDefaultVisibleValues: new Set(['1', '5', '15', '30', '60']),
      topBarHeight: 36,
      tradeLabelHeight: 18,
      userDrawingActiveTool: 'select',
      userDrawingCommandAvailability: { canUndo: true, canRedo: true },
      volumeHeightRatio: 0.2,
    });

    expect(model.topBarLayout?.symbol.text).toBe('BTC-USD');
    expect(model.topBarLayout?.buttons.map((button) => button.text)).toEqual(
      expect.arrayContaining(['1m', '5m', '15m', '30m']),
    );
    expect(model.leftToolRailLayout?.items.length).toBeGreaterThan(0);
    expect(model.visibleBars.map((bar) => bar.time)).toEqual([0, 900, 1800]);
    expect(model.volumeHeight).toBe(82.4);
    expect(model.plotPrimitiveClip).toEqual({
      x: frame.contentLeft,
      y: frame.mainPane.top,
      width: frame.priceAxisRight - frame.contentLeft,
      height: frame.mainPane.height,
    });
    expect(model.tradeLineGeometries.map((geometry) => `${geometry.objectType}:${geometry.objectId}`)).toEqual([
      'order:adapter-order',
      'position:adapter-position',
    ]);
    expect(model.nativePriceLines.map((line) => line.id)).toEqual([
      'oracle',
      'adapter-order-tp',
      'adapter-order-sl',
      'adapter-position-tp',
      'adapter-position-sl',
      'last-trade',
    ]);
    expect(model.nativePriceLines.flatMap((line) => (line.nativeBracketRef ? [line.nativeBracketRef] : []))).toEqual([
      { objectType: 'order', objectId: 'adapter-order', bracketType: 'tp' },
      { objectType: 'order', objectId: 'adapter-order', bracketType: 'sl' },
      { objectType: 'position', objectId: 'adapter-position', bracketType: 'tp' },
      { objectType: 'position', objectId: 'adapter-position', bracketType: 'sl' },
    ]);
    expect(model.priceAxisTagSources.map((source) => source.tagId)).toEqual([
      'priceLine:oracle',
      'priceLine:adapter-order-tp',
      'priceLine:adapter-order-sl',
      'priceLine:adapter-position-tp',
      'priceLine:adapter-position-sl',
      'priceLine:last-trade',
      'order:adapter-order',
      'position:adapter-position',
    ]);
  });

  it('formats native last-trade axis labels from decimal-count precision', () => {
    const model = useNativeSkiaRenderModel({
      bars: [{ time: 0, open: 0.0684, high: 0.0688, low: 0.0682, close: 0.0686, volume: 100 }],
      frame,
      interval: '15',
      lineSnapshot: { orderLines: [], positionLines: [] },
      marginsBottom: 32,
      options: DEFAULT_RENDER_OPTIONS,
      priceAxisTagHeight: 22,
      pricePrecision: 4,
      projection,
      showTopBar: true,
      symbol: 'DOGE-USD',
      topBarDefaultVisibleValues: new Set(['1', '5', '15', '30', '60']),
      topBarHeight: 36,
      tradeLabelHeight: 18,
      volumeHeightRatio: 0.2,
    });

    expect(model.nativePriceLines.find((line) => line.id === 'last-trade')?.label.primaryText).toBe('0.0686');
  });

  it('returns inert drawing inputs when frame and projection are not ready', () => {
    const model = useNativeSkiaRenderModel({
      bars,
      frame: null,
      interval: '15',
      lineSnapshot: { orderLines: [], positionLines: [] },
      marginsBottom: 32,
      options: DEFAULT_RENDER_OPTIONS,
      priceAxisTagHeight: 22,
      pricePrecision: 0.1,
      projection: null,
      showTopBar: true,
      symbol: 'BTC-USD',
      topBarDefaultVisibleValues: new Set(['1', '5', '15', '30', '60']),
      topBarHeight: 36,
      tradeLabelHeight: 18,
      volumeHeightRatio: 0.2,
    });

    expect(model.topBarLayout).toBeNull();
    expect(model.leftToolRailLayout).toBeNull();
    expect(model.tradeLineGeometries).toEqual([]);
    expect(model.visibleBars).toEqual([]);
    expect(model.plotPrimitiveClip).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(model.volumeHeight).toBe(0);
  });

  it('separates requested top bar interval from the loaded bar render interval', () => {
    const model = useNativeSkiaRenderModel({
      bars,
      frame,
      interval: '15',
      lineSnapshot: { orderLines: [], positionLines: [] },
      marginsBottom: 32,
      options: DEFAULT_RENDER_OPTIONS,
      priceAxisTagHeight: 22,
      pricePrecision: 0.1,
      projection,
      showTopBar: true,
      symbol: 'BTC-USD',
      topBarDefaultVisibleValues: new Set(['1', '5', '15', '30', '60']),
      topBarHeight: 36,
      topBarInterval: '5',
      tradeLabelHeight: 18,
      volumeHeightRatio: 0.2,
    });

    const fiveMinuteButton = model.topBarLayout?.buttons.find((button) => button.interval === '5');
    const fifteenMinuteButton = model.topBarLayout?.buttons.find((button) => button.interval === '15');

    expect(fiveMinuteButton?.backgroundColor).toBeDefined();
    expect(fifteenMinuteButton?.backgroundColor).toBeUndefined();
    expect(model.visibleBars.map((bar) => bar.time)).toEqual([0, 900, 1800]);
  });

  it('carries collapsed left rail state into native overlay layout', () => {
    const model = useNativeSkiaRenderModel({
      bars,
      frame,
      interval: '15',
      leftToolRailCollapsed: true,
      lineSnapshot: { orderLines: [], positionLines: [] },
      marginsBottom: 32,
      options: DEFAULT_RENDER_OPTIONS,
      priceAxisTagHeight: 22,
      pricePrecision: 0.1,
      projection,
      showTopBar: true,
      symbol: 'BTC-USD',
      topBarDefaultVisibleValues: new Set(['1', '5', '15', '30', '60']),
      topBarHeight: 36,
      tradeLabelHeight: 18,
      volumeHeightRatio: 0.2,
    });

    expect(model.leftToolRailLayout?.collapsed).toBe(true);
    expect(model.leftToolRailLayout?.width).toBeGreaterThan(NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH);
    expect(model.leftToolRailLayout?.railRect).toEqual(expect.objectContaining({ x: 0 }));
    expect(model.leftToolRailLayout?.items[0]).toEqual(
      expect.objectContaining({ icon: 'chevronRight', kind: 'collapseToggle' }),
    );
  });
});

import type {
  IOrderLineAdapter,
  IPositionLineAdapter,
  TealstreetOrderLineExtensions,
  TealstreetPositionLineExtensions,
} from './types';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_TRADE_LINE_COLOR,
  DEFAULT_TRADE_LINE_LABEL_COLOR,
  DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
} from './constants';
import { clearChartStoreCache } from './state/chartState';
import { getTealchartApiLineRenderSnapshot, TealchartApi } from './TealchartApi';

afterEach(() => {
  clearChartStoreCache();
});

const srcRoot = resolve(__dirname);
const packageRoot = resolve(srcRoot, '..');
function readSource(relativePath: string): string {
  return readFileSync(resolve(srcRoot, relativePath), 'utf8');
}

function readPackageFile(relativePath: string): string {
  return readFileSync(resolve(packageRoot, relativePath), 'utf8');
}

function extractExportedInterface(source: string, interfaceName: string): string {
  const interfaceStart = source.indexOf(`export interface ${interfaceName}`);
  expect(interfaceStart, interfaceName).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf('{', interfaceStart);
  expect(bodyStart, interfaceName).toBeGreaterThanOrEqual(0);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(interfaceStart, index + 1);
      }
    }
  }

  throw new Error(`Could not find end of ${interfaceName}`);
}

function extractTopLevelFunctionNames(block: string): string[] {
  const names = new Set<string>();
  const methodPattern = /^\s{1,2}([A-Za-z_$][\w$]*)(?:<[^>]+>)?\s*\(/gm;
  for (const match of block.matchAll(methodPattern)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

const TRADINGVIEW_ORDER_LINE_METHODS = [
  'getBodyBackgroundColor',
  'getBodyBorderColor',
  'getBodyFont',
  'getBodyTextColor',
  'getCancelButtonBackgroundColor',
  'getCancelButtonBorderColor',
  'getCancelButtonIconColor',
  'getCancelTooltip',
  'getCancellable',
  'getEditable',
  'getExtendLeft',
  'getLineColor',
  'getLineLength',
  'getLineLengthUnit',
  'getLineStyle',
  'getLineWidth',
  'getModifyTooltip',
  'getPrice',
  'getQuantity',
  'getQuantityBackgroundColor',
  'getQuantityBorderColor',
  'getQuantityFont',
  'getQuantityTextColor',
  'getText',
  'getTooltip',
  'onCancel',
  'onModify',
  'onMove',
  'onMoving',
  'remove',
  'setBodyBackgroundColor',
  'setBodyBorderColor',
  'setBodyFont',
  'setBodyTextColor',
  'setCancelButtonBackgroundColor',
  'setCancelButtonBorderColor',
  'setCancelButtonIconColor',
  'setCancelTooltip',
  'setCancellable',
  'setEditable',
  'setExtendLeft',
  'setLineColor',
  'setLineLength',
  'setLineStyle',
  'setLineWidth',
  'setModifyTooltip',
  'setPrice',
  'setQuantity',
  'setQuantityBackgroundColor',
  'setQuantityBorderColor',
  'setQuantityFont',
  'setQuantityTextColor',
  'setText',
  'setTooltip',
].sort();

const TRADINGVIEW_POSITION_LINE_METHODS = [
  'getBodyBackgroundColor',
  'getBodyBorderColor',
  'getBodyFont',
  'getBodyTextColor',
  'getCloseButtonBackgroundColor',
  'getCloseButtonBorderColor',
  'getCloseButtonIconColor',
  'getCloseTooltip',
  'getExtendLeft',
  'getLineColor',
  'getLineLength',
  'getLineLengthUnit',
  'getLineStyle',
  'getLineWidth',
  'getPrice',
  'getProtectTooltip',
  'getQuantity',
  'getQuantityBackgroundColor',
  'getQuantityBorderColor',
  'getQuantityFont',
  'getQuantityTextColor',
  'getReverseButtonBackgroundColor',
  'getReverseButtonBorderColor',
  'getReverseButtonIconColor',
  'getReverseTooltip',
  'getText',
  'getTooltip',
  'onClose',
  'onModify',
  'onReverse',
  'remove',
  'setBodyBackgroundColor',
  'setBodyBorderColor',
  'setBodyFont',
  'setBodyTextColor',
  'setCloseButtonBackgroundColor',
  'setCloseButtonBorderColor',
  'setCloseButtonIconColor',
  'setCloseTooltip',
  'setExtendLeft',
  'setLineColor',
  'setLineLength',
  'setLineStyle',
  'setLineWidth',
  'setPrice',
  'setProtectTooltip',
  'setQuantity',
  'setQuantityBackgroundColor',
  'setQuantityBorderColor',
  'setQuantityFont',
  'setQuantityTextColor',
  'setReverseButtonBackgroundColor',
  'setReverseButtonBorderColor',
  'setReverseButtonIconColor',
  'setReverseTooltip',
  'setText',
  'setTooltip',
].sort();

const TRADINGVIEW_DATAFEED_CHART_METHODS = [
  'getBars',
  'resolveSymbol',
  'searchSymbols',
  'subscribeBars',
  'unsubscribeBars',
].sort();

const TRADINGVIEW_DATAFEED_QUOTES_METHODS = ['getQuotes', 'subscribeQuotes', 'unsubscribeQuotes'].sort();

const TRADINGVIEW_BUNDLE_ORDER_EXTENSION_METHODS = [
  'setCancelAsSubmit',
  'setTextShort',
  'setQuantityShort',
  'setBrackets',
  'setPartialEnabled',
  'onTPClick',
  'onTPMove',
  'onTPMoveEnd',
  'onSLClick',
  'onSLMove',
  'onSLMoveEnd',
].sort();

const TEALSTREET_SERIALIZABLE_ORDER_METHODS = [...TRADINGVIEW_BUNDLE_ORDER_EXTENSION_METHODS];
const TEALSTREET_ORDER_EXTENSION_METHODS = [...TEALSTREET_SERIALIZABLE_ORDER_METHODS, 'setPnlCalculator'].sort();

const TRADINGVIEW_BUNDLE_POSITION_EXTENSION_METHODS = [
  'setQuantityShort',
  'setPnl',
  'setPnlShort',
  'setProfitState',
  'setPositionData',
  'setBrackets',
  'setPartialEnabled',
  'onTPClick',
  'onTPMove',
  'onTPMoveEnd',
  'onSLClick',
  'onSLMove',
  'onSLMoveEnd',
].sort();

const TEALSTREET_SERIALIZABLE_POSITION_METHODS = [...TRADINGVIEW_BUNDLE_POSITION_EXTENSION_METHODS];
const TEALSTREET_POSITION_EXTENSION_METHODS = [...TEALSTREET_SERIALIZABLE_POSITION_METHODS, 'setPnlCalculator'].sort();

function hasOrderExtensions(adapter: IOrderLineAdapter): adapter is IOrderLineAdapter & TealstreetOrderLineExtensions {
  const record = adapter as unknown as Record<string, unknown>;
  return TEALSTREET_ORDER_EXTENSION_METHODS.every((method) => typeof record[method] === 'function');
}

function hasPositionExtensions(
  adapter: IPositionLineAdapter,
): adapter is IPositionLineAdapter & TealstreetPositionLineExtensions {
  const record = adapter as unknown as Record<string, unknown>;
  return TEALSTREET_POSITION_EXTENSION_METHODS.every((method) => typeof record[method] === 'function');
}

describe('imperative chart API contract', () => {
  it('keeps Tealchart line and datafeed interfaces aligned to TradingView declarations', () => {
    const tealchartTypes = readSource('types.ts');

    const tealchartOrder = extractExportedInterface(tealchartTypes, 'IOrderLineAdapter');
    const tealchartPosition = extractExportedInterface(tealchartTypes, 'IPositionLineAdapter');
    const tealchartDatafeedChart = extractExportedInterface(tealchartTypes, 'IDatafeedChartApi');
    const tealchartDatafeedQuotes = extractExportedInterface(tealchartTypes, 'IDatafeedQuotesApi');
    const tealchartOrderExtensionMethods = extractTopLevelFunctionNames(
      extractExportedInterface(tealchartTypes, 'TealstreetOrderLineExtensions'),
    );
    const tealchartPositionExtensionMethods = extractTopLevelFunctionNames(
      extractExportedInterface(tealchartTypes, 'TealstreetPositionLineExtensions'),
    );

    expect(extractTopLevelFunctionNames(tealchartOrder)).toEqual(TRADINGVIEW_ORDER_LINE_METHODS);
    expect(extractTopLevelFunctionNames(tealchartPosition)).toEqual(TRADINGVIEW_POSITION_LINE_METHODS);
    expect(extractTopLevelFunctionNames(tealchartDatafeedChart)).toEqual(TRADINGVIEW_DATAFEED_CHART_METHODS);
    expect(extractTopLevelFunctionNames(tealchartDatafeedQuotes)).toEqual(TRADINGVIEW_DATAFEED_QUOTES_METHODS);
    expect(tealchartOrderExtensionMethods).toEqual(TEALSTREET_ORDER_EXTENSION_METHODS);
    expect(tealchartPositionExtensionMethods).toEqual(TEALSTREET_POSITION_EXTENSION_METHODS);

    for (const method of TEALSTREET_ORDER_EXTENSION_METHODS) {
      expect(tealchartOrder, method).not.toContain(`${method}(`);
    }
    for (const method of TEALSTREET_POSITION_EXTENSION_METHODS) {
      expect(tealchartPosition, method).not.toContain(`${method}(`);
    }
  });

  it('keeps Tealstreet line extensions on the same imperative adapter objects', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const order = await api.createOrderLine();
    const position = await api.createPositionLine();

    expect(hasOrderExtensions(order)).toBe(true);
    expect(hasPositionExtensions(position)).toBe(true);

    if (!hasOrderExtensions(order) || !hasPositionExtensions(position)) return;

    expect(order.setText('Buy Limit').setQuantity('0.001').setLineLength(42, 'pixel')).toBe(order);
    expect(order.getText()).toBe('Buy Limit');
    expect(order.getQuantity()).toBe('0.001');
    expect(order.getLineLength()).toBe(42);
    expect(order.getLineLengthUnit()).toBe('pixel');

    expect(
      position
        .setText('Long')
        .setQuantity('0.001')
        .setPnl('$1.23')
        .setProtectTooltip('Protect')
        .setLineLength(64, 'percentage'),
    ).toBe(position);
    expect(position.getText()).toBe('Long');
    expect(position.getQuantity()).toBe('0.001');
    expect(position.getProtectTooltip()).toBe('Protect');
    expect(position.getLineLengthUnit()).toBe('percentage');
  });

  it('keeps order lines dashed by default while position lines stay solid', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const order = await api.createOrderLine();
    const position = await api.createPositionLine();

    expect(order.getLineStyle()).toBe(2);
    expect(position.getLineStyle()).toBe(0);
  });

  it('keeps default trading-line fills lower-glare with explicit segment separators', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    await api.createOrderLine({ text: 'Buy Limit', quantity: 0.001, cancellable: true });
    const position = await api.createPositionLine({ text: 'Long', quantity: 0.001 });
    position.onReverse(() => undefined).onClose(() => undefined);

    const { orderLines, positionLines } = getTealchartApiLineRenderSnapshot(api);
    const order = orderLines[0]!;
    const positionLine = positionLines[0]!;

    expect(order.lineColor).toBe(DEFAULT_TRADE_LINE_COLOR);
    expect(order.bodyBackgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(order.quantityBackgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(order.cancelButtonBackgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(order.bodyBorderColor).toBe(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR);
    expect(order.quantityBorderColor).toBe(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR);
    expect(order.cancelButtonBorderColor).toBe(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR);

    expect(positionLine.lineColor).toBe(DEFAULT_TRADE_LINE_COLOR);
    expect(positionLine.bodyBackgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(positionLine.quantityBackgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(positionLine.reverseButtonBackgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(positionLine.closeButtonBackgroundColor).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
    expect(positionLine.bodyBorderColor).toBe(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR);
    expect(positionLine.quantityBorderColor).toBe(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR);
    expect(positionLine.reverseButtonBorderColor).toBe(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR);
    expect(positionLine.closeButtonBorderColor).toBe(DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR);
  });

  it('keeps bridgeable adapter methods on the imperative line objects', async () => {
    const tradingViewOrderMethods = TRADINGVIEW_ORDER_LINE_METHODS.filter(
      (method) => method.startsWith('on') || method.startsWith('set'),
    );
    const tradingViewPositionMethods = TRADINGVIEW_POSITION_LINE_METHODS.filter(
      (method) => method.startsWith('on') || method.startsWith('set'),
    );
    const expectedOrderMethods = [
      ...new Set([...tradingViewOrderMethods, ...TRADINGVIEW_BUNDLE_ORDER_EXTENSION_METHODS]),
    ].sort();
    const expectedPositionMethods = [
      ...new Set([...tradingViewPositionMethods, ...TRADINGVIEW_BUNDLE_POSITION_EXTENSION_METHODS]),
    ].sort();

    expect(expectedOrderMethods).toContain('onMove');
    expect(expectedOrderMethods).toContain('setLineStyle');
    expect(expectedOrderMethods).toContain('setBrackets');
    expect(expectedPositionMethods).toContain('onReverse');
    expect(expectedPositionMethods).toContain('setProtectTooltip');
    expect(expectedPositionMethods).toContain('setBrackets');

    const api = new TealchartApi('BTCUSDT', '60');
    const order = await api.createOrderLine();
    const position = await api.createPositionLine();
    const orderRecord = order as unknown as Record<string, unknown>;
    const positionRecord = position as unknown as Record<string, unknown>;

    for (const method of expectedOrderMethods) {
      expect(typeof orderRecord[method], method).toBe('function');
    }

    for (const method of expectedPositionMethods) {
      expect(typeof positionRecord[method], method).toBe('function');
    }
  });

  it('keeps web action buttons vector-rendered from render data icon', () => {
    const source = readSource('interaction/PriceLineManager.ts');

    expect(source).toContain('button.icon,');
    expect(source).toContain('createCloseIcon(currentX, lineY, buttonWidth, button.iconColor)');
    expect(source).toContain('createReverseIcon(currentX, lineY, buttonWidth, button.iconColor)');
    expect(source).not.toContain("text: button.icon || '×'");
  });

  it('keeps SkiaTealchart line state off public props', () => {
    const source = readSource('SkiaTealchart.tsx');
    const propsBlock = source.match(/export interface SkiaTealchartProps \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(propsBlock).not.toContain('orderLines?:');
    expect(propsBlock).not.toContain('positionLines?:');
    expect(propsBlock).not.toContain('onOrderMove?:');
    expect(propsBlock).not.toContain('onOrderCancel?:');
    expect(propsBlock).not.toContain('onPositionClose?:');
    expect(propsBlock).not.toContain('onPositionReverse?:');
  });

  it('exposes TradingView-style chart access from the Skia handle', () => {
    const source = readSource('SkiaTealchart.tsx');
    const handleBlock = source.match(/export interface SkiaTealchartHandle \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(handleBlock).toContain('chart(index?: number): TealchartApi;');
    expect(handleBlock).toContain('activeChart(): TealchartApi;');
    expect(handleBlock).not.toContain('addTealscriptIndicator');
    expect(handleBlock).not.toContain('removeTealscriptIndicator');
  });

  it('does not export stale native-only indicator handle types', () => {
    const nativeEntry = readSource('index.native.ts');

    expect(nativeEntry).not.toContain('SkiaTealscriptIndicatorOptions');
  });

  it('keeps renderer snapshots out of the public package surface', () => {
    const indexSource = readSource('index.ts');
    const apiSource = readSource('TealchartApi.ts');
    const packageJson = JSON.parse(readPackageFile('package.json')) as { exports?: Record<string, string> };
    const buildConfig = JSON.parse(readPackageFile('tsconfig.build.json')) as {
      compilerOptions?: { stripInternal?: boolean };
    };

    expect(indexSource).not.toContain('OrderLineRenderData');
    expect(indexSource).not.toContain('PositionLineRenderData');
    expect(indexSource).not.toContain('ExecutionLineRenderData');
    expect(indexSource).not.toContain('getTealchartApiLineRenderSnapshot');
    expect(indexSource).not.toContain('TealchartRenderer');
    expect(indexSource).not.toContain('StudyCreateCallback');
    expect(packageJson.exports).not.toHaveProperty('./src/*');
    expect(packageJson.exports).toHaveProperty('./src/jailbreak/*');
    expect(packageJson.exports).toHaveProperty('./src/types');
    expect(apiSource).not.toMatch(/\n  getOrderLinesRenderData\(/);
    expect(apiSource).not.toMatch(/\n  getPositionLinesRenderData\(/);
    expect(apiSource).not.toMatch(/\n  getExecutionLinesRenderData\(/);
    expect(apiSource).toMatch(/@internal Friend API for renderers[\s\S]*?getTealchartApiLineRenderSnapshot/);
    expect(buildConfig.compilerOptions?.stripInternal).toBe(true);
  });

  it('renders native trading lines from adapter snapshots', () => {
    const source = readSource('SkiaTealchart.tsx');

    expect(source).toContain('const lineRenderSnapshot = getTealchartApiLineRenderSnapshot(chartApi);');
    expect(source).toContain('const orderLines = lineRenderSnapshot.orderLines;');
    expect(source).toContain('const positionLines = lineRenderSnapshot.positionLines;');
    expect(source).not.toMatch(/priceLines,\s+orderLines,\s+positionLines,/);
    expect(source).not.toContain('onPriceChange={onOrderMove}');
    expect(source).not.toContain('onCancel={onOrderCancel}');
    expect(source).not.toContain('onClose={onPositionClose}');
    expect(source).not.toContain('onReverse={onPositionReverse}');
  });

  it('re-snapshots native trading lines when render-visible adapters change', () => {
    const apiSource = readSource('TealchartApi.ts');
    const renderVisibleMethods = [
      'setTextShort',
      'setQuantityShort',
      'setCancelAsSubmit',
      'setPartialEnabled',
      'setCancelTooltip',
      'setModifyTooltip',
      'setCloseTooltip',
      'setPnlShort',
      'setPositionData',
      'onMove',
      'onTPClick',
      'onSLClick',
      'onTPMove',
      'onSLMove',
      'onTPMoveEnd',
      'onSLMoveEnd',
    ];

    for (const method of renderVisibleMethods) {
      const blocks = apiSource.match(new RegExp(`${method}\\([\\s\\S]*?\\n      \\},`, 'g')) ?? [];
      expect(blocks.length, method).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(block, method).toContain('notifyChange();');
      }
    }
  });

  it('keeps native createStudy metadata on the imperative path', () => {
    const apiSource = readSource('TealchartApi.ts');
    const skiaSource = readSource('SkiaTealchart.tsx');
    const widgetSource = readSource('TealchartWidget.ts');

    expect(apiSource).toContain('export interface StudyCreateRequest');
    expect(apiSource).toContain('displayName,');
    expect(apiSource).toContain('forceOverlay: forceOverlay ?? false,');
    expect(apiSource).toContain('overrides: overrides ?? {},');
    expect(widgetSource).toContain('setOnStudyCreate(async (request)');
    expect(widgetSource).toContain('name: request.displayName,');
    expect(widgetSource).toContain('overlay: request.forceOverlay,');
    expect(widgetSource).toContain('indicatorId: request.studyId,');
    expect(skiaSource).toContain('name: request.options?.displayName ?? indicator?.name ?? request.displayName,');
    expect(skiaSource).toContain('overlay: request.forceOverlay || (indicator?.overlay ?? false),');
  });
});

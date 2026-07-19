import type {
  IOrderLineAdapter,
  IPositionLineAdapter,
  TealstreetOrderLineExtensions,
  TealstreetPositionLineExtensions,
} from './types';

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from './state/chartState';
import { TealchartApi } from './TealchartApi';

afterEach(() => {
  clearChartStoreCache();
});

const srcRoot = resolve(__dirname);
const packageRoot = resolve(srcRoot, '..');
const repoRoot = resolve(packageRoot, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(srcRoot, relativePath), 'utf8');
}

function readPackageFile(relativePath: string): string {
  return readFileSync(resolve(packageRoot, relativePath), 'utf8');
}

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function readRepoTextFiles(relativeDir: string): Array<{ path: string; source: string }> {
  const absoluteDir = resolve(repoRoot, relativeDir);
  const files: Array<{ path: string; source: string }> = [];

  for (const entry of readdirSync(absoluteDir)) {
    const relativePath = `${relativeDir}/${entry}`;
    const absolutePath = resolve(repoRoot, relativePath);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...readRepoTextFiles(relativePath));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push({ path: relativePath, source: readRepoFile(relativePath) });
    }
  }

  return files;
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

function extractArrayLiteral(source: string, constName: string): string[] {
  const match = source.match(new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\];`));
  expect(match?.[1], constName).toBeTruthy();
  const arrayBody = (match?.[1] ?? '').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...arrayBody.matchAll(/'([^']+)'/g)].map((entry) => entry[1]).sort();
}

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
    const tradingViewTypes = readRepoFile('apps/web/public/static/charting_library/charting_library.d.ts');
    const tealchartTypes = readSource('types.ts');
    const interfaces = ['IOrderLineAdapter', 'IPositionLineAdapter', 'IDatafeedChartApi', 'IDatafeedQuotesApi'];

    for (const interfaceName of interfaces) {
      const tradingViewMethods = extractTopLevelFunctionNames(
        extractExportedInterface(tradingViewTypes, interfaceName),
      );
      const tealchartMethods = extractTopLevelFunctionNames(extractExportedInterface(tealchartTypes, interfaceName));

      expect(tealchartMethods, interfaceName).toEqual(tradingViewMethods);
    }

    const tealchartOrder = extractExportedInterface(tealchartTypes, 'IOrderLineAdapter');
    const tealchartPosition = extractExportedInterface(tealchartTypes, 'IPositionLineAdapter');
    const tealchartOrderExtensionMethods = extractTopLevelFunctionNames(
      extractExportedInterface(tealchartTypes, 'TealstreetOrderLineExtensions'),
    );
    const tealchartPositionExtensionMethods = extractTopLevelFunctionNames(
      extractExportedInterface(tealchartTypes, 'TealstreetPositionLineExtensions'),
    );

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

  it('keeps the iframe host bridge in sync with line adapter chainable methods', () => {
    const tradingViewTypes = readRepoFile('apps/web/public/static/charting_library/charting_library.d.ts');
    const widgetHost = readRepoFile('apps/web/src/components/chart/WidgetHost.ts');
    const tradingViewOrderMethods = extractTopLevelFunctionNames(
      extractExportedInterface(tradingViewTypes, 'IOrderLineAdapter'),
    ).filter((method) => method.startsWith('on') || method.startsWith('set'));
    const tradingViewPositionMethods = extractTopLevelFunctionNames(
      extractExportedInterface(tradingViewTypes, 'IPositionLineAdapter'),
    ).filter((method) => method.startsWith('on') || method.startsWith('set'));
    const hostOrderMethods = extractArrayLiteral(widgetHost, 'ORDER_LINE_CHAINABLE_METHODS');
    const hostPositionMethods = extractArrayLiteral(widgetHost, 'POSITION_LINE_CHAINABLE_METHODS');
    const tradingViewOrderBundle = readRepoFile(
      'apps/web/public/static/charting_library/bundles/line-tool-order.29d5136824af61f3f42d.js',
    );
    const tradingViewPositionBundle = readRepoFile(
      'apps/web/public/static/charting_library/bundles/line-tool-position.2506e7de45c96e5a349c.js',
    );
    const expectedOrderMethods = [
      ...new Set([...tradingViewOrderMethods, ...TRADINGVIEW_BUNDLE_ORDER_EXTENSION_METHODS]),
    ];
    const expectedPositionMethods = [
      ...new Set([...tradingViewPositionMethods, ...TRADINGVIEW_BUNDLE_POSITION_EXTENSION_METHODS]),
    ];

    for (const method of TRADINGVIEW_BUNDLE_ORDER_EXTENSION_METHODS) {
      expect(tradingViewOrderBundle, method).toMatch(new RegExp(`\\b${method}\\s*\\(`));
    }
    for (const method of TRADINGVIEW_BUNDLE_POSITION_EXTENSION_METHODS) {
      expect(tradingViewPositionBundle, method).toMatch(new RegExp(`\\b${method}\\s*\\(`));
    }

    expect(hostOrderMethods).toEqual(expectedOrderMethods.sort());
    expect(hostPositionMethods).toEqual(expectedPositionMethods.sort());
  });

  it('keeps v3 consumers off local Tealstreet line-extension shims', () => {
    const brokerFiles = readRepoTextFiles('apps/web/src/components/chart/broker');
    const localLineShimPattern = /(type|interface)\s+I\w*(Order|Position)LineAdapter\w*/;
    const adapterAnyPattern = /\b(line|orderLine|positionLine|meta\.line|entryline|stopline|exitline)\s+as\s+any\b/;

    for (const { path, source } of brokerFiles) {
      expect(source, path).not.toMatch(/@ts-(expect-error|ignore).*TEALSTREET/);
      expect(source, path).not.toMatch(localLineShimPattern);
      expect(source, path).not.toMatch(adapterAnyPattern);

      expect(source, path).not.toContain('TealstreetOrderLineExtensions');
      expect(source, path).not.toContain('TealstreetPositionLineExtensions');
    }
  });

  it('keeps v2 order moves on TradingView no-arg callback semantics', () => {
    const source = readRepoFile('v2/frontend/src/charting_library/index.ts');

    expect(source).toContain('.onMove(() => {');
    expect(source).toContain('const nextPrice = line.getPrice();');
    expect(source).not.toContain('.onMove((nextPrice)');
  });

  it('keeps web cancel-as-submit buttons driven by render data icon', () => {
    const source = readSource('interaction/PriceLineManager.ts');

    expect(source).toContain('button.icon,');
    expect(source).toContain("text: button.icon || '×'");
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

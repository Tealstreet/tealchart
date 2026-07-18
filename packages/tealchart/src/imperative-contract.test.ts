import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from './state/chartState';

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

describe('imperative chart API contract', () => {
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
      'setPartialEnabled',
      'setCancelTooltip',
      'setModifyTooltip',
      'setCloseTooltip',
      'setProtectTooltipText',
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

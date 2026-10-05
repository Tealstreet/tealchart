import type { ReactElement, ReactNode } from 'react';
import type { RenderOptions } from '../types';

import { Path } from '@shopify/react-native-skia';
import { Pressable } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { createResultMessage } from '@tealstreet/tealscript';
import {
  nativePlotHarness,
  nativePrimitives,
  resolved,
  testBars,
  testFrame,
  testPlot,
} from '../test/nativePlotPaintHarness';
import { MobileIndicatorManager } from './MobileIndicatorManager';
import { applyNativeIndicatorStyle } from './nativeIndicatorStyles';
import { NativeCandleVolumeLayerImpl } from './render/NativeCandleVolumeLayer';
import { NativeChartLegendOverlayImpl } from './render/NativeChartLegendOverlay';
import { createNativeChartProjection } from './render/nativeProjection';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));
class WorkerFixture {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  postMessage() {}
  terminate() {}
  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}
function nodes(root: ReactNode): ReactElement<any>[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!root || typeof root !== 'object' || !('props' in root)) return [];
  const element = root as ReactElement<any>;
  return [element, ...nodes(element.props.children)];
}
describe('native indicator editable styles', () => {
  it.each([false, true])(
    'paints a barcolor style override while retaining authored na slots (static=%s)',
    (staticMode) => {
      const source = testPlot({ type: 'barcolor', color: ['blue', null, 'blue', null, 'blue'] });
      const styled = applyNativeIndicatorStyle(source, { plotId: source.id, color: '#ff0000' });
      const tree = NativeCandleVolumeLayerImpl({
        frame: testFrame,
        options: { upColor: 'green', downColor: 'red' } as RenderOptions,
        sharedViewport: {
          startTime: { value: 0 },
          endTime: { value: 4000 },
          priceMin: { value: 0 },
          priceMax: { value: 100 },
        },
        visibleBars: testBars,
        totalBarCount: 5,
        volumeHeight: 0,
        barColorPlots: [styled],
        staticProjection: staticMode
          ? createNativeChartProjection({
              frame: testFrame,
              viewport: { startTime: 0, endTime: 4000, priceMin: 0, priceMax: 100 },
            })
          : undefined,
      });
      const paths = nativePrimitives(tree).filter((node) => node.type === Path && node.props.color === '#ff0000');
      expect(paths).toHaveLength(staticMode ? 1 : 2);
      // Each eligible candle paints a closed wick and body; na slots paint neither.
      expect(paths.map((node) => vi.mocked(resolved<any>(node.props.path).close).mock.calls.length)).toEqual(
        staticMode ? [6] : [6, 0],
      );
      expect(source.color).toEqual(['blue', null, 'blue', null, 'blue']);
    },
  );
  it('applies editable overrides to painted outputs, rejects locked plots, and restores originals', async () => {
    const worker = new WorkerFixture();
    const manager = new MobileIndicatorManager({ createWorker: () => worker as unknown as Worker });
    manager.setBars(testBars);
    const id = manager.addTealscriptIndicator({ id: 's', code: 'indicator("S")\nplot(close)' });
    worker.emit({ type: 'ready' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const editable = testPlot({ id: 'p', color: ['red', 'blue', null, 'red', 'blue'] });
    const locked = testPlot({ id: 'locked', editable: false });
    worker.emit(createResultMessage(id, { alerts: [], drawings: [], inputs: [], plots: [editable, locked] }));
    const revision = manager.getPlotsRevision();
    manager.updateStyleOverrides(id, [
      { plotId: 'p', color: '#ff0000', linewidth: 4, lineStyle: 'dashed' },
      { plotId: 'locked', color: 'yellow' },
    ]);
    expect(manager.getPlots()[0]).toMatchObject({ color: '#ff0000', linewidth: 4, lineStyle: 'dashed' });
    const painted = nativePlotHarness(manager.getPlots())
      .paths()
      .find((path) => path.props.color === '#ff0000')!;
    expect(painted.props.strokeWidth).toBe(4);
    expect(painted.path.moveTo).toHaveBeenCalledWith(0, 380);
    expect(manager.getPlots()[1].color).toEqual(locked.color);
    expect(manager.getLayoutIndicators()[0].styleOverrides).toEqual([
      { plotId: 'p', color: '#ff0000', linewidth: 4, lineStyle: 'dashed' },
    ]);
    expect(manager.getPlotsRevision()).toBeGreaterThan(revision);
    expect(manager.getPlots()).toBe(manager.getPlots());
    manager.updateStyleOverrides(id, undefined);
    expect(manager.getPlots()[0].color).toEqual(editable.color);
    manager.removeIndicator(id);
  });
  it('offers Style only for studies with editable outputs', () => {
    const open = vi.fn();
    const base = {
      bars: testBars,
      frame: testFrame,
      downColor: 'red',
      upColor: 'green',
      mutedTextColor: 'gray',
      textColor: 'white',
      interval: '1',
      isLoading: false,
      leftToolRailLayout: null,
      pricePrecision: 0.01,
      symbol: 'TEST',
      activeIndicators: [{ id: 's', name: 'Study', inputs: {}, isVisible: true }],
      onOpenStyle: open,
    };
    const enabled = nodes(NativeChartLegendOverlayImpl({ ...base, plots: [testPlot({ scriptId: 's' })] })).find(
      (e) => e.type === Pressable && e.props.accessibilityLabel === 'Edit Study Style',
    );
    expect(enabled).toBeDefined();
    enabled!.props.onPress();
    expect(open).toHaveBeenCalledWith('s');
    expect(
      nodes(NativeChartLegendOverlayImpl({ ...base, plots: [testPlot({ scriptId: 's', editable: false })] })).some(
        (e) => e.type === Pressable && e.props.accessibilityLabel === 'Edit Study Style',
      ),
    ).toBe(false);
  });
});

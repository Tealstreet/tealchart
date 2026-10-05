import { LinearGradient } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, resolved, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

describe('native Fill audit gaps', () => {
  it('paints gradient stops at their projected values and masks to the boundaries', () => {
    const fill = testPlot({
      type: 'fill',
      id: 'f',
      plot1Id: 'p',
      plot2Id: 'q',
      gradient: {
        topValues: [80, 80, 80, 80, 80],
        bottomValues: [20, 20, 20, 20, 20],
        topColors: ['red', 'red', 'red', 'red', 'red'],
        bottomColors: [null, null, null, null, null],
      },
    });
    const harness = nativePlotHarness([testPlot(), testPlot({ id: 'q', values: [20, 30, 40, 50, 60] }), fill]);
    const paints = harness.primitives().filter((p) => p.type === LinearGradient);
    expect(paints).toHaveLength(1);
    expect(resolved(paints[0].props.start)).toEqual({ x: 0, y: 40 });
    expect(resolved(paints[0].props.end)).toEqual({ x: 0, y: 160 });
    expect(paints[0].props.colors).toEqual(['red', 'transparent']);
    expect(harness.paths().filter((p) => p.props.style !== 'stroke')[0].path.close).toHaveBeenCalledTimes(4);
  });
  it('samples each fill boundary at its own bar offset', () => {
    const harness = nativePlotHarness([
      testPlot({ offset: 1 }),
      testPlot({ id: 'q', offset: 2 }),
      testPlot({ type: 'fill', id: 'f', plot1Id: 'p', plot2Id: 'q' }),
    ]);
    const path = harness.paths().find((p) => p.props.style !== 'stroke')!.path;
    expect(path.moveTo).toHaveBeenCalledWith(200, 160);
    expect(path.lineTo).toHaveBeenCalledWith(300, 140);
    expect(path.lineTo).toHaveBeenCalledWith(300, 160);
    expect(path.close).toHaveBeenCalledTimes(2);
  });
  it('keeps fill segments across per-bar color transitions', () => {
    const fill = testPlot({
      type: 'fill',
      id: 'f',
      plot1Id: 'p',
      plot2Id: 'q',
      color: ['red', 'blue', 'red', 'blue', 'red'],
    });
    const paths = nativePlotHarness([testPlot(), testPlot({ id: 'q' }), fill])
      .paths()
      .filter((p) => p.props.style !== 'stroke');
    expect(paths.reduce((count, p) => count + vi.mocked(p.path.close).mock.calls.length, 0)).toBe(4);
  });
  it('uses the fill force_overlay and show_last independently of its sources', () => {
    const fill = testPlot({
      type: 'fill',
      scriptId: 's',
      id: 'f',
      plot1Id: 'p',
      plot2Id: 'q',
      forceOverlay: true,
      showLast: 2,
    });
    const paths = nativePlotHarness([testPlot({ scriptId: 's' }), testPlot({ scriptId: 's', id: 'q' }), fill])
      .paths()
      .filter((p) => p.props.style !== 'stroke');
    expect(paths[0].path.close).toHaveBeenCalledTimes(1);
    expect(paths[0].path.moveTo).toHaveBeenCalledWith(300, 120);
  });
  it.each([false, true])('defaults to broken gaps and bridges only fillgaps=true (static=%s)', (staticMode) => {
    const source = testPlot({ values: [10, null, 30, 40, 50] });
    const boundary = testPlot({ id: 'q', values: [20, 30, 40, 50, 60] });
    const fill = testPlot({ type: 'fill', id: 'f', plot1Id: 'p', plot2Id: 'q' });
    const closes = (bridge: boolean | undefined) =>
      nativePlotHarness([source, boundary, { ...fill, fillgaps: bridge }], staticMode)
        .paths()
        .filter((p) => p.props.style !== 'stroke')
        .reduce((n, p) => n + vi.mocked(p.path.close).mock.calls.length, 0);
    expect(closes(undefined)).toBe(2);
    expect(closes(true)).toBe(3);
  });
  it('moves live gradient stops with the viewport while retaining static stops', () => {
    const fill = testPlot({
      type: 'fill',
      id: 'f',
      plot1Id: 'p',
      plot2Id: 'q',
      gradient: {
        topValues: [80, 80, 80, 80, 80],
        bottomValues: [20, 20, 20, 20, 20],
        topColors: ['red', 'red', 'red', 'red', 'red'],
        bottomColors: ['blue', 'blue', 'blue', 'blue', 'blue'],
      },
    });
    for (const staticMode of [false, true]) {
      const harness = nativePlotHarness([testPlot(), testPlot({ id: 'q' }), fill], staticMode);
      const paint = harness.primitives().find((p) => p.type === LinearGradient)!;
      harness.sharedViewport.priceMax.value = 200;
      expect(resolved(paint.props.start)).toEqual({ x: 0, y: staticMode ? 40 : 120 });
    }
  });
  it('resolves hidden hline boundaries within the same script', () => {
    const plots = [
      testPlot({ scriptId: 'other', id: 'a', type: 'hline', price: 99 }),
      testPlot({ scriptId: 's', id: 'a', type: 'hline', price: 10, display: 0, color: [null] }),
      testPlot({ scriptId: 's', id: 'b', type: 'hline', price: 20, display: 0 }),
      testPlot({ scriptId: 's', id: 'f', type: 'fill', plot1Id: 'a', plot2Id: 'b' }),
    ];
    const paths = nativePlotHarness(plots)
      .paths()
      .filter((p) => p.props.style !== 'stroke');
    expect(paths).toHaveLength(1);
    expect(paths[0].path.moveTo).toHaveBeenCalledWith(0, 380);
    expect(paths[0].path.lineTo).toHaveBeenCalledWith(100, 360);
  });
});

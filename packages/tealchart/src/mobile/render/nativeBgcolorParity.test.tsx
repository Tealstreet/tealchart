import { Picture, Rect } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePictureRects } from '../../test/nativePictureRects';
import { nativePlotHarness, resolved, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

describe('native Bgcolor audit gaps', () => {
  it('normalizes native arrows using the visible viewport instead of an offscreen outlier', () => {
    const harness = nativePlotHarness([
      testPlot({ type: 'plotarrow', minHeight: 10, maxHeight: 60, values: [1000, 1, 4, null, null] }),
    ]);
    harness.sharedViewport.startTime.value = 1000;
    const path = harness.paths()[0].path;
    expect(vi.mocked(path.lineTo).mock.calls[0][1] - vi.mocked(path.moveTo).mock.calls[0][1]).toBe(22.5);
  });

  it.each([
    [60, 10],
    [-10, 60],
    [10, -60],
  ])('paints captured plotarrow height for bounds %s/%s', (minHeight, maxHeight) => {
    const paths = nativePlotHarness([
      testPlot({ type: 'plotarrow', minHeight, maxHeight, values: [1, 4, null, null, null] }),
    ]).paths();
    const path = paths[0].path;
    const tipY = vi.mocked(path.moveTo).mock.calls[0][1];
    const baseY = vi.mocked(path.lineTo).mock.calls[0][1];
    expect(baseY - tipY).toBe(22.5);
  });

  it('translates background stripes by the final plot offset', () => {
    const shifted = nativePlotHarness([testPlot({ type: 'bgcolor', values: [null, null, 1], offset: -2 })])
      .primitives()
      .filter((p) => p.type === Rect);
    const control = nativePlotHarness([testPlot({ type: 'bgcolor', values: [1, null, null] })])
      .primitives()
      .filter((p) => p.type === Rect);
    expect(shifted).toHaveLength(1);
    expect(control).toHaveLength(1);
    expect(resolved(shifted[0].props.x)).toBe(resolved(control[0].props.x));
  });

  it.each([false, true])('applies signed global offsets with static projection %s', (staticMode) => {
    const plot = testPlot({ type: 'bgcolor', values: [null, null, 1, null, null] });
    const x = (offset: number) => {
      const rects = nativePlotHarness([{ ...plot, offset }], staticMode)
        .primitives()
        .filter((p) => p.type === Rect);
      expect(rects).toHaveLength(1);
      return Number(resolved(rects[0].props.x));
    };
    expect(x(-1)).toBe(x(0) - 100);
    expect(x(1)).toBe(x(0) + 100);
  });
  it('routes backgrounds into the study pane and honors show_last', () => {
    const rects = nativePlotHarness([testPlot({ type: 'bgcolor', scriptId: 's', showLast: 1 })])
      .primitives()
      .filter((p) => p.type === Rect);
    expect(rects).toHaveLength(1);
    expect(resolved(rects[0].props.y)).toBe(200);
  });
  it('moves background rectangles during UI gestures', () => {
    const harness = nativePlotHarness([testPlot({ type: 'bgcolor' })]);
    const nodes = harness.primitives();
    const picture = nodes.find((node) => node.type === Picture)!;
    expect(nativePictureRects(picture.props.picture)[1].x).toBe(50);
    harness.sharedViewport.endTime.value = 8000;
    expect(nativePictureRects(picture.props.picture)[1].x).toBe(25);
  });
});

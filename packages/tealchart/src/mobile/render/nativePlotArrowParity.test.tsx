import { DashPathEffect, Group, Path, Rect, Text } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, resolved, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

describe('native PlotArrow audit gaps', () => {
  it('suppresses null arrow colors and matches the web shafted glyph', () => {
    const harness = nativePlotHarness([
      testPlot({
        type: 'plotarrow',
        values: [1, 100, null, null, null],
        color: ['red', null, null, null, null],
        minHeight: 6,
        maxHeight: 16,
      }),
    ]);
    const paths = harness.paths();
    expect(paths).toHaveLength(1);
    const p = paths.find((p) => p.props.color === 'red')!;
    expect(p.path.close).toHaveBeenCalledTimes(1);
    expect(vi.mocked(p.path.lineTo).mock.calls).toEqual([
      [3.2, 205.2],
      [1.6, 205.2],
      [1.6, 218],
      [-1.6, 218],
      [-1.6, 205.2],
      [-3.2, 205.2],
    ]);
    expect(p.path.moveTo).toHaveBeenCalledWith(0, 202); // low y=190, anchor=210, tip=202
  });
});

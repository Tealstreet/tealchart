import { DashPathEffect, Group, Path, Rect, Text } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, resolved, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

describe('native Hline audit gaps', () => {
  it('defaults hline to gray dashed and clips it to its pane', () => {
    const harness = nativePlotHarness([testPlot({ type: 'hline', scriptId: 's', price: 50, color: undefined })]);
    expect(harness.paths()[0].props.color).toBe('#787B86');
    expect(harness.primitives().some((p) => p.type === DashPathEffect && p.props.intervals.join(',') === '6,4')).toBe(
      true,
    );
    expect(
      harness.primitives().some((p) => p.type === Group && p.props.clip && resolved<any>(p.props.clip).y === 200),
    ).toBe(true);
  });
});

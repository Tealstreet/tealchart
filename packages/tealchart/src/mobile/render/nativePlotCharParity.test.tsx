import { DashPathEffect, Group, matchFont, Path, Rect, Text } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, resolved, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

describe('native PlotChar audit gaps', () => {
  it('prepares the body glyph at the web size independently of the axis font', () => {
    vi.mocked(matchFont).mockClear();
    nativePlotHarness([testPlot({ type: 'plotchar', size: 'huge', char: 'A' })]).primitives();
    expect(vi.mocked(matchFont).mock.calls.some(([style]) => style.fontSize === 32)).toBe(true);
  });
  it('renders plotchar centered at the marker position', () => {
    const nodes = nativePlotHarness([testPlot({ type: 'plotchar', char: 'A', location: 'absolute' })])
      .primitives()
      .filter((p) => p.type === Text);
    expect(resolved(nodes[0].props.x)).toBe(-3.5);
    expect(resolved(nodes[0].props.y)).toBeGreaterThan(180);
  });
});

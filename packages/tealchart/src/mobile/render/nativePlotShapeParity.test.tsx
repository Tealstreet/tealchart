import { DashPathEffect, Group, Path, Rect, Text } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, resolved, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

describe('native PlotShape audit gaps', () => {
  it('centers multiline above-bar shape text and stacks it upwards', () => {
    const nodes = nativePlotHarness([testPlot({ type: 'plotshape', text: 'A\nB', size: 'huge' })])
      .primitives()
      .filter((p) => p.type === Text);
    expect(resolved(nodes[0].props.x)).toBe(-3.5);
    expect(resolved(nodes[0].props.y)).toBeLessThan(resolved(nodes[1].props.y));
    expect(Number(resolved(nodes[1].props.y)) - Number(resolved(nodes[0].props.y))).toBe(24);
    expect(resolved(nodes[1].props.y)).toBe(121);
  });
  it('strokes flag stems and gives cross markers the same two-pixel stroke as web', () => {
    const flag = nativePlotHarness([testPlot({ type: 'plotshape', shape: 'flag', size: 'huge' })]).paths();
    expect(flag.some((p) => p.props.style === 'stroke' && p.props.strokeWidth === 2)).toBe(true);
    const cross = nativePlotHarness([testPlot({ type: 'plotshape', shape: 'cross', size: 'huge' })]).paths();
    expect(cross[0].props.strokeWidth).toBe(2);
  });
  it('rounds shape labels using the shared web geometry', () => {
    const path = nativePlotHarness([testPlot({ type: 'plotshape', shape: 'labelup' })]).paths()[0].path;
    expect(path.addRRect).toHaveBeenCalled();
  });
});

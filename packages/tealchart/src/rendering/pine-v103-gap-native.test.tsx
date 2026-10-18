import { describe, expect, it, vi } from 'vitest';

import { entries } from '../../../tealscript/tests/fixtures/v103Gap';
import { gapSegments, traceGap, type GapChannel } from '../test/v103GapPaint';

vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: <T,>(factory: () => T) => factory() }));
for (const channel of ['web', 'web-pane', 'web-unified', 'native', 'native-static'] as GapChannel[]) {
  for (const entry of entries) describe(`${entry.id} PNG/map-bound ${channel}`, () => {
    const facet = (name: string) => entry.regions.facets.find((f: any) => f.facetId.endsWith(':' + name));
    it('preserves four mapped linebr holes while the independent continuous line bridges', () => {
      expect(facet('holes-vs-bridge').outcome).toBe('SUPPORTED_A');
      const broken = traceGap(entry, 'BREAK', channel);
      const control = traceGap(entry, 'LINE', channel);
      const b = gapSegments(broken.paints.filter(p => p.kind === 'stroke'));
      const c = gapSegments(control.paints.filter(p => p.kind === 'stroke'));
      expect(facet('holes-vs-bridge').manualFinding.closedHolePairs).toHaveLength(4);
      for (const pair of facet('holes-vs-bridge').manualFinding.closedHolePairs) {
        const left = broken.x(pair.phase3Row - 1), right = broken.x(pair.phase4Row + 1);
        const spans = ([a, z]: any[]) => a.x <= left + 1e-8 && z.x >= right - 1e-8;
        expect(b.some(spans)).toBe(false);
        expect(c.some(spans)).toBe(true);
        expect(b.some(([a, z]) => Math.abs(z.x - left) < 1e-8 || Math.abs(a.x - right) < 1e-8)).toBe(true);
        const registration = entry.regions.registration;
        for (const [i, row] of [pair.phase3Row, pair.phase4Row].entries()) {
          expect(registration.anchorXPx + (row - entry.anchor) * registration.pixelsPerOwnBar).toBe(pair.centerXPx[i]);
        }
      }
    });
    it('leaves each mapped area hole empty while continuous area fills it', () => {
      expect(facet('area-break').outcome).toBe('SUPPORTED_A');
      const broken = traceGap(entry, 'AREA_BREAK', channel);
      const control = traceGap(entry, 'AREA', channel);
      const islands = (paints: typeof broken.paints) => paints.filter(p => p.kind === 'fill').flatMap(p => {
        const result: { min: number; max: number; closed: boolean }[] = [];
        for (const point of p.commands) {
          if (point.op === 'M') result.push({ min: point.x, max: point.x, closed: false });
          if (point.op === 'L' && result.length) { const island = result[result.length - 1]; island.min = Math.min(island.min, point.x); island.max = Math.max(island.max, point.x); }
          if (point.op === 'Z' && result.length) result[result.length - 1].closed = true;
        }
        return result;
      });
      const b = islands(broken.paints), c = islands(control.paints);
      expect(b.length).toBeGreaterThan(4);
      expect(b.every(i => i.closed)).toBe(true);
      for (const pair of facet('area-break').manualFinding.closedHolePairs) {
        const x = (broken.x(pair.phase3Row) + broken.x(pair.phase4Row)) / 2;
        expect(b.some(i => i.min < x && i.max > x)).toBe(false);
        expect(c.some(i => i.min < x && i.max > x)).toBe(true);
      }
    });
    it('projects the source phase0 markers one bar apart at each original mapped pair', () => {
      expect(facet('offset-displacement').outcome).toBe('SUPPORTED_A');
      const zero = traceGap(entry, 'OFFSET0', channel), shifted = traceGap(entry, 'OFFSET1', channel);
      const circles = (paints: typeof zero.paints) => paints.flatMap(p => p.commands.filter(c => c.op === 'C'));
      expect(circles(zero.paints).length).toBeGreaterThanOrEqual(4);
      for (const pair of facet('offset-displacement').manualFinding.mappedClosedPairs) {
        expect(circles(zero.paints).some(p => Math.abs(p.x - zero.x(pair.zeroRow)) < 1e-8)).toBe(true);
        expect(circles(shifted.paints).some(p => Math.abs(p.x - shifted.x(pair.shiftedRow)) < 1e-8)).toBe(true);
        expect(circles(shifted.paints).some(p => Math.abs(p.x - shifted.x(pair.zeroRow)) < 1e-8)).toBe(false);
        expect(pair.magentaXPx - pair.zeroXPx).toBe(entry.regions.registration.pixelsPerOwnBar);
        expect(entry.csv.raw(pair.shiftedRow, 'OFFSET1')).toBe('94');
        expect(entry.csv.raw(pair.zeroRow, 'OFFSET0')).toBe('94');
      }
    });
    if (entry.version === 6) it('keeps dashed finite falling segments as well as source holes', () => {
      const f = facet('dash-with-break');
      expect(f.outcome).toBe('SUPPORTED_A');
      const trace = traceGap(entry, 'DASH', channel);
      const strokes = trace.paints.filter(p => p.kind === 'stroke');
      expect(strokes.length).toBeGreaterThan(0);
      expect(strokes.every(p => p.dash.length > 0 && p.dash.every(n => n > 0))).toBe(true);
      const segments = gapSegments(strokes);
      expect(f.manualFinding.nonmissingFallingPairs).toHaveLength(3);
      for (const pair of f.manualFinding.nonmissingFallingPairs) {
        expect(segments.some(([a, b]) => Math.abs(a.x - trace.x(pair.firstRow)) < 1e-8 && Math.abs(b.x - trace.x(pair.secondRow)) < 1e-8)).toBe(true);
        expect(pair.nativeRawValues).toEqual(['92', '85']);
      }
      for (const pair of facet('holes-vs-bridge').manualFinding.closedHolePairs) {
        expect(segments.some(([a, b]) => a.x < trace.x(pair.phase3Row) && b.x > trace.x(pair.phase4Row))).toBe(false);
      }
    });
  });
}

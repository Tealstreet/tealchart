import { afterEach, describe, expect, it } from 'vitest';
import { stackEntries } from '../../../tealscript/tests/fixtures/v102Stack';
import { clearChartStoreCache } from '../state/chartState';
import { traceStack } from '../test/v102StackPaint';

afterEach(() => clearChartStoreCache());
describe('v102 original-source layer order: only supported native intersections', () => {
  for (const entry of stackEntries) {
    for (const channel of ['web', 'native'] as const) {
      it(`${entry.id} ${channel}: polyline above line in both creation directions`, () => {
        expect(entry.regions.facets.find((f: { caseId: string }) => f.caseId.endsWith(':polyline-line-forward/reverse'))).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'FIXED_POLYLINE_ABOVE_LINE' });
        const { paints, result } = traceStack(entry, channel);
        const polyline = result.drawings.find(d => d.type === 'polyline')!;
        const line = result.drawings.find(d => d.type === 'line')!;
        for (const y of [10, 25]) {
          const lower = paints.findIndex(p => p.kind === 'stroke' && p.color === line.color && p.width === 8 && p.y === 100 - y);
          const upper = paints.findIndex(p => p.kind === 'stroke' && p.color === polyline.lineColor && p.width === 14 && p.y === 100 - y);
          expect(lower, `missing blue line at${y}`).toBeGreaterThanOrEqual(0);
          expect(upper, `missing orange polyline at${y}`).toBeGreaterThan(lower);
        }
      });
      it(`${entry.id} ${channel}: box above polyline in both creation directions`, () => {
        expect(entry.regions.facets.find((f: { caseId: string }) => f.caseId.endsWith(':polyline-box-forward/reverse'))).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'FIXED_BOX_ABOVE_POLYLINE' });
        const { paints, result } = traceStack(entry, channel);
        const polyline = result.drawings.find(d => d.type === 'polyline')!;
        const box = result.drawings.find(d => d.type === 'box')!;
        expect(result.drawings.filter(d => d.type === 'box').filter(d => d.bgcolor === box.bgcolor).map(d => d.top)).toEqual([43, 58]);
        const boxPaints = paints.flatMap((p, i) => p.kind === 'fill' && p.color === box.bgcolor ? [i] : []);
        expect(boxPaints).toHaveLength(2);
        for (const [i, y] of [40, 55].entries()) {
          const lower = paints.findIndex(p => p.kind === 'stroke' && p.color === polyline.lineColor && p.width === 14 && p.y === 100 - y);
          const upper = boxPaints[i];
          expect(lower, `missing orange polyline at${y}`).toBeGreaterThanOrEqual(0);
          expect(upper, `missing aqua box at${y}`).toBeGreaterThan(lower);
        }
      });
    }
    it(`${entry.id} web plot pass: supported default/explicit late-fill control`, () => {
      const explicit = entry.id.includes('-true-');
      expect(entry.regions.facets.find((f: { caseId: string }) => f.caseId.endsWith(':explicit-plot-control'))).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: explicit
        ? 'EXPLICIT_LATE_FILL_ABOVE_EARLIER_PLOT_AND_HLINE' : 'DEFAULT_PLOT_HLINE_ABOVE_LATE_FILL' });
      const { paints, result } = traceStack(entry, 'plots');
      const color = (title: string) => {
        const plot = result.plots.find(p => p.title === title)!;
        return Array.isArray(plot.color) ? plot.color.find(c => c !== null) : plot.color;
      };
      const fill = paints.findIndex(p => p.kind === 'fill' && p.color === color('LATE_FILL'));
      const plot = paints.findIndex(p => p.kind === 'stroke' && p.color === color('BLUE_PLOT') && p.width === 12);
      const hline = paints.findIndex(p => p.kind === 'stroke' && p.color === color('GREEN_HLINE') && p.width === 6);
      for (const position of [fill, plot, hline]) expect(position).toBeGreaterThanOrEqual(0);
      if (explicit) { expect(fill).toBeGreaterThan(plot); expect(fill).toBeGreaterThan(hline); }
      else { expect(plot).toBeGreaterThan(fill); expect(hline).toBeGreaterThan(fill); }
    });
  }
});

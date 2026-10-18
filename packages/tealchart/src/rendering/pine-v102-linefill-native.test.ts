import { describe, expect, it } from 'vitest';
import { linefillEntries } from '../../../tealscript/tests/fixtures/v102Linefill';
import { traceLinefill } from '../test/v102LinefillPaint';

describe('v102 PNG-bound linefill tracking and old-handle deletion', () => {
  for (const entry of linefillEntries.filter(e => e.id.includes('sloped'))) for (const channel of ['web', 'native'] as const) {
    it(`${entry.id} ${channel}: current parent geometry paints orange at the native live band, outside the static alternative`, () => {
      const facet = entry.regions.facets.find((f: { caseId: string }) => f.caseId.endsWith(':sloped-both-extension-follows-endpoints'));
      expect(facet).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'LIVE_TRACKING_ORANGE_BAND', actualIntersection: true });
      expect(facet.candidates.liveTracking.nativeYBand).toEqual([35, 55]);
      expect(facet.candidates.staticSnapshot.nativeYBand).toEqual([75, 90]);
      const { paints, result, bars } = traceLinefill(entry, channel);
      const fills = result.drawings.filter(d => d.type === 'linefill');
      expect(fills).toHaveLength(1);
      expect(fills[0].color).toBe('#FF9800');
      const painted = paints.filter(p => p.kind === 'fill');
      expect(painted).toHaveLength(1);
      expect(painted[0].color).toBe(fills[0].color);
      const points = painted[0].points;
      expect(points).toHaveLength(4);
      expect(points.map(p => p.x)).toEqual([0, 1000, 1000, 0]);
      const x = (bars[bars.length - 106].time - bars[0].time) / (bars[bars.length - 1].time - bars[0].time) * 1000;
      const yAt = (a: typeof points[number], b: typeof points[number]) => a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
      const band = [100 - yAt(points[0], points[1]), 100 - yAt(points[3], points[2])];
      for (const y of [37, 53]) { expect(y).toBeGreaterThan(band[0]); expect(y).toBeLessThan(band[1]); }
      for (const y of [77, 88]) expect(y).toBeGreaterThan(band[1]);
    });
    it(`${entry.id} ${channel}: old-handle deletion paints no blue G; separate orange control survives`, () => {
      expect(entry.regions.facets.find((f: { caseId: string }) => f.caseId.endsWith(':old-handle-delete-new-fill-survival')))
        .toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'NO_VISIBLE_BLUE_G_AFTER_OLD_DELETE' });
      const { paints } = traceLinefill(entry, channel);
      expect(paints.filter(p => p.kind === 'fill').map(p => p.color)).toEqual(['#FF9800']);
      expect(paints.some(p => p.kind === 'fill' && p.color === '#2962FF')).toBe(false);
    });
  }
});

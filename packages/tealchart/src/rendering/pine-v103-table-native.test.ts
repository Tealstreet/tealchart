// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { entries, json, raw } from '../../../tealscript/tests/fixtures/v103Table';
import { countClass, nativeTablePixels, paintTable } from '../test/v103TablePaint';
import type { PixelClass } from '../test/v103TablePaint';

for (const entry of entries) describe(`${entry.id} original PNG table certificate`, () => {
  it('re-derives registered windows and native colored controls, without glyph/font/frame-identity credit', async () => {
    const { regions } = entry;
    const image = await nativeTablePixels(entry);
    expect([image.width, image.height]).toEqual([regions.originalDimensionsPx.width, regions.originalDimensionsPx.height]);
    const [x0, y0, x1, y1] = regions.registration.paneInteriorBoundsPx;
    expect([x1 - x0, y1 - y0]).toEqual([regions.registration.paneWidthPx, regions.registration.paneHeightPx]);
    expect(x1 - x0).toBeGreaterThanOrEqual(1000);
    expect(x1 - x0).toBeLessThanOrEqual(1600);
    expect(y1 - y0).toBeGreaterThanOrEqual(240);
    expect(y1 - y0).toBeLessThanOrEqual(340);
    const ticks = regions.registration.xTicks;
    for (const tick of ticks) {
      expect(entry.csv.raw(tick.time.rowOrdinal, 'time')).toBe(tick.time.valueRaw);
      expect(entry.csv.raw(tick.ownIndex.rowOrdinal, 'INPUT_INDEX')).toBe(tick.ownIndex.valueRaw);
    }
    expect((ticks[1].xPx - ticks[0].xPx) / (Number(ticks[1].ownIndex.valueRaw) - Number(ticks[0].ownIndex.valueRaw))).toBe(regions.registration.pixelsPerOwnBar);
    expect(ticks[0].xPx + (Number(regions.retainedAnchor.INPUT_INDEX.valueRaw) - Number(ticks[0].ownIndex.valueRaw)) * regions.registration.pixelsPerOwnBar).toBe(regions.registration.anchorXPx);
    const count = (rect: number[], color: PixelClass) => countClass(image.pixels, image.width, rect, color);
    for (const facet of regions.facets) {
      expect(facet).toMatchObject({ verdict: 'SUPPORTED', outcome: 'SUPPORTED_A', modelBVerdict: 'REFUTED', notObservedCauses: [] });
      const window = facet.frozenPixelWindow;
      const expected = [x0 + window.x[0] * (x1 - x0) - window.paddingPx, y0 + window.y[0] * (y1 - y0) - window.paddingPx,
        x0 + window.x[1] * (x1 - x0) + window.paddingPx, y0 + window.y[1] * (y1 - y0) + window.paddingPx];
      expect(facet.derivedRequestedWindowPx).toEqual(expected);
      expect(facet.derivedWindowPx).toEqual([Math.max(0, expected[0]), Math.max(0, expected[1]), Math.min(image.width, expected[2]), Math.min(image.height, expected[3])]);
      const finding = facet.manualFinding;
      if (facet.facetId.endsWith(':old-table-survival')) {
        expect(count(finding.actualSubjectRegionsPx[0], 'red')).toBe(0);
        for (const control of finding.actualControlRegionsPx) {
          expect(count(control, 'yellow')).toBeGreaterThan(0);
          expect(count(control, 'blue')).toBeGreaterThan(0);
        }
      } else if (facet.facetId.endsWith(':explicit-zero-auto')) {
        const subject = finding.actualSubjectRegionsPx[0];
        const [omitted, positive] = finding.actualControlRegionsPx;
        for (const rect of [subject, omitted]) {
          expect(count(rect, 'yellow')).toBeGreaterThan(0);
          expect(count(rect, 'blue')).toBeGreaterThan(0);
        }
        const uncertainty = regions.registration.uncertaintyPx;
        expect(Math.abs(subject[2] - subject[0] - (omitted[2] - omitted[0]))).toBeLessThanOrEqual(uncertainty.x * 2);
        expect(Math.abs(subject[3] - subject[1] - (omitted[3] - omitted[1]))).toBeLessThanOrEqual(uncertainty.y * 2);
        expect(positive[2] - positive[0]).toBeGreaterThan(subject[2] - subject[0]);
        expect(positive[3] - positive[1]).toBeGreaterThan(subject[3] - subject[1]);
        expect(count(positive, 'aqua')).toBeGreaterThan(0);
        expect(finding.occlusion).toContain('legend');
      } else {
        for (const rect of [...finding.actualSubjectRegionsPx, ...finding.actualControlRegionsPx]) {
          expect(count(rect, 'yellow')).toBeGreaterThan(0);
          expect(count(rect, 'blue')).toBeGreaterThan(0);
          expect(count(rect, 'red')).toBeGreaterThan(0);
          if (facet.facetId.endsWith(':merged-row')) {
            const middle = (rect[0] + rect[2]) / 2;
            expect(count([middle - 1, rect[1] + 8, middle + 1, rect[1] + 27], 'red')).toBe(0);
            expect(count([middle - 1, rect[3] - 25, middle + 1, rect[3] - 8], 'red')).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(regions.nativeFrameId).toBeNull();
    expect(regions.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
    const facets = json(`v103/captures/v103/${entry.id}/facet-assessment-v1.json`);
    for (const facet of facets.facets) expect(raw(facet.visualMap.path).length).toBe(facet.visualMap.bytes);
  });
  for (const channel of ['web', 'native'] as const) {
    it(`${channel}: paints the observed frozen alternatives through the real table painter`, () => {
      const { rects, texts, width, height, pixels, result } = paintTable(entry, channel);
      const count = (rect: number[], color: PixelClass) => countClass(pixels, width, rect, color);
      const fills = rects.filter(r => r.kind === 'fill');
      const frames = rects.filter(r => r.kind === 'stroke' && r.width === (entry.id.includes('survival') ? 4 : 3));
      if (entry.id.includes('survival')) {
        expect(result.drawings.filter(d => d.type === 'table')).toHaveLength(2);
        expect(fills).toHaveLength(2);
        expect(frames).toHaveLength(2);
        expect(texts).toEqual(['B TOP', 'B LEFT', 'B RIGHT', 'C TOP', 'C LEFT', 'C RIGHT']);
        const b = fills.find(r => r.x > width / 2)!;
        const c = fills.find(r => r.x < width / 2)!;
        expect(b, 'B retained bottom-right').toBeDefined();
        expect(c, 'independent C bottom-left control').toBeDefined();
        expect(b.y).toBeGreaterThan(height * 0.7);
        expect(c.y).toBe(b.y);
        expect([b.w, b.h, b.color]).toEqual([c.w, c.h, c.color]);
        expect(count([0, 0, width * 0.25, height * 0.22], 'red'), 'old red table absent without losing controls').toBe(0);
        for (const body of [b, c]) {
          const frame = frames.find(r => r.x === body.x && r.y === body.y)!;
          expect(frame).toMatchObject({ w: body.w, h: body.h });
          const borders = rects.filter(r => r.kind === 'stroke' && r.width === 2 && r.x >= body.x && r.x < body.x + body.w);
          expect(borders, 'one merged top border and two lower borders').toHaveLength(3);
          expect(borders[0]).toMatchObject({ x: body.x, y: body.y, w: body.w });
          expect(borders[1].y).toBe(body.y + borders[0].h);
          expect(borders[2].y).toBe(borders[1].y);
          expect(count([body.x + 3, body.y + 3, body.x + body.w - 3, body.y + body.h - 3], 'yellow')).toBeGreaterThan(0);
          expect(count([body.x - 2, body.y - 2, body.x + body.w + 2, body.y + body.h + 2], 'blue')).toBeGreaterThan(0);
          const mid = body.x + body.w / 2;
          expect(count([mid - 0.5, body.y + 5, mid + 0.5, body.y + borders[0].h - 4], 'red')).toBe(0);
          expect(count([mid - 0.5, borders[1].y + 4, mid + 0.5, body.y + body.h - 4], 'red')).toBeGreaterThan(0);
        }
        expect(frames[0].color).toBe(frames[1].color);
      } else {
        expect(fills).toHaveLength(3);
        expect(frames).toHaveLength(3);
        const [explicit, omitted, positive] = fills;
        expect([explicit.w, explicit.h, explicit.color]).toEqual([omitted.w, omitted.h, omitted.color]);
        expect(explicit.w).toBeGreaterThan(0);
        expect(explicit.h).toBeGreaterThan(0);
        expect(explicit.x).toBeLessThan(width * 0.35);
        expect(omitted.x).toBeGreaterThan(width / 2);
        expect(explicit.y).toBe(omitted.y);
        expect(positive.w).toBeGreaterThan(explicit.w);
        expect(positive.h).toBeGreaterThan(explicit.h);
        for (const body of [explicit, omitted]) {
          expect(count([body.x, body.y, body.x + body.w, body.y + body.h], 'yellow')).toBeGreaterThan(0);
          expect(count([body.x - 2, body.y - 2, body.x + body.w + 2, body.y + body.h + 2], 'blue')).toBeGreaterThan(0);
        }
        expect(count([positive.x, positive.y, positive.x + positive.w, positive.y + positive.h], 'aqua')).toBeGreaterThan(0);
      }
    });
  }
});

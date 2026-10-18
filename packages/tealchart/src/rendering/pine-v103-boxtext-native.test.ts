// @vitest-environment node
import type { SkCanvas } from '@shopify/react-native-skia';
import type { PixelFrame } from '../test/v103BoxTextPaint';

import { matchFont } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { entries, executeBoxText, json, raw } from '../../../tealscript/tests/fixtures/v103BoxText';
import { createNativeDrawingContext } from '../mobile/render/nativeDrawingContext';
import { createNativeDrawingFonts } from '../mobile/render/nativeDrawingFonts';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { glyphMask, nativeBoxTextPixels, paintBoxText } from '../test/v103BoxTextPaint';

const inset = (r: number[]) => [r[0] + 3, r[1] + 3, r[2] - 3, r[3] - 3];
function assertLayout(frame: PixelFrame, entry: (typeof entries)[number]) {
  const [wrap, horizontal, vertical] = entry.regions.facets;
  const subject = wrap.manualFinding.actualSubjectRegionsPx[0];
  const nowrap = wrap.manualFinding.actualControlRegionsPx[0];
  const wide = wrap.manualFinding.actualControlRegionsPx[1];
  expect(glyphMask(frame, inset(subject)).bands, 'multiple complete-word lines versus one line').toBeGreaterThan(1);
  // Restrict the nowrap crop to its box interior to exclude its vertical border.
  expect(glyphMask(frame, inset([nowrap[0], nowrap[1], nowrap[0] + subject[2] - subject[0], nowrap[3]])).bands).toBe(1);
  expect(glyphMask(frame, inset(wide)).bands).toBe(1);
  const blueRect = horizontal.manualFinding.actualSubjectRegionsPx[0],
    redRect = horizontal.manualFinding.actualControlRegionsPx[0];
  const blue = glyphMask(frame, inset(blueRect)),
    red = glyphMask(frame, inset(redRect), 'red');
  expect(blue.count).toBeGreaterThan(0);
  expect(red.count).toBeGreaterThan(0);
  expect(blue.bounds[0], 'right-aligned blue EDGE').toBeGreaterThan((blueRect[0] + blueRect[2]) / 2);
  expect(red.bounds[2], 'left-aligned red EDGE control').toBeLessThan((redRect[0] + redRect[2]) / 2);
  expect((blue.bounds[1] + blue.bounds[3]) / 2, 'bottom-aligned blue EDGE').toBeGreaterThan(
    (blueRect[1] + blueRect[3]) / 2,
  );
  expect((red.bounds[1] + red.bounds[3]) / 2, 'top-aligned red EDGE control').toBeLessThan(
    (redRect[1] + redRect[3]) / 2,
  );
  const uncertainty = entry.regions.registration.uncertaintyPx;
  expect(blue.bounds[0] - blueRect[0] - (red.bounds[2] - redRect[0])).toBeGreaterThan(2 * uncertainty.x);
  expect((blue.bounds[1] + blue.bounds[3] - red.bounds[1] - red.bounds[3]) / 2).toBeGreaterThan(2 * uncertainty.y);
  expect(vertical.manualFinding.actualSubjectRegionsPx).toEqual(horizontal.manualFinding.actualSubjectRegionsPx);
}
function assertFormatting(frame: PixelFrame, entry: (typeof entries)[number]) {
  const [b, c, d] = entry.regions.facets;
  const mask = (r: number[]) => glyphMask(frame, inset(r));
  const none = mask(b.manualFinding.actualControlRegionsPx[0]);
  const bold = mask(b.manualFinding.actualSubjectRegionsPx[0]);
  const italic = mask(c.manualFinding.actualSubjectRegionsPx[0]);
  const both = mask(d.manualFinding.actualSubjectRegionsPx[0]);
  for (const glyphs of [none, bold, italic, both]) {
    expect(glyphs.count, 'complete readable same-word control').toBeGreaterThan(0);
    expect(glyphs.bands).toBe(1);
  }
  expect(bold.count, 'bold strokes heavier than none').toBeGreaterThan(none.count);
  expect(both.count, 'both heavier than italic-only').toBeGreaterThan(italic.count);
  expect(italic.signature, 'slanted same-word morphology differs from upright none').not.toBe(none.signature);
  expect(both.signature, 'combined formatting differs from none').not.toBe(none.signature);
  expect(both.signature, 'combined formatting differs from bold-only').not.toBe(bold.signature);
  expect(both.signature, 'combined formatting differs from italic-only').not.toBe(italic.signature);
}
for (const entry of entries)
  describe(`${entry.id} original PNG box-text certificate`, () => {
    it('binds the original PNG and fixed axis windows, complete same-word controls and finite frozen verdicts', async () => {
      const { regions, csv } = entry;
      const frame = await nativeBoxTextPixels(entry);
      expect([frame.width, frame.height]).toEqual([
        regions.originalDimensionsPx.width,
        regions.originalDimensionsPx.height,
      ]);
      const inspection = json(regions.manualInspection.path);
      expect(inspection.inspectedOriginalPngSha256).toBe(regions.originalPng.sha256);
      const ticks = regions.registration.xTicks;
      for (const tick of ticks) {
        expect(csv.raw(tick.time.rowOrdinal, 'time')).toBe(tick.time.valueRaw);
        expect(csv.raw(tick.ownIndex.rowOrdinal, 'INPUT_INDEX')).toBe(tick.ownIndex.valueRaw);
      }
      const scale =
        (ticks[1].xPx - ticks[0].xPx) / (Number(ticks[1].ownIndex.valueRaw) - Number(ticks[0].ownIndex.valueRaw));
      const anchorX =
        ticks[0].xPx +
        (Number(regions.retainedAnchor.INPUT_INDEX.valueRaw) - Number(ticks[0].ownIndex.valueRaw)) * scale;
      expect(scale).toBe(regions.registration.pixelsPerOwnBar);
      expect(anchorX).toBe(regions.registration.anchorXPx);
      const { yZeroPx, yHundredPx } = inspection.axisCalibration;
      const y = (value: number, padding: number) =>
        (yZeroPx * 100 - value * (yZeroPx - yHundredPx) + padding * 100) / 100;
      for (const facet of regions.facets) {
        expect(facet).toMatchObject({
          outcome: 'SUPPORTED_A',
          verdict: 'SUPPORTED',
          modelBVerdict: 'REFUTED',
          notObservedCauses: [],
        });
        const w = facet.frozenPixelWindow;
        const rect = [
          anchorX + w.x[0] * scale - w.paddingPx,
          y(w.y[1], -w.paddingPx),
          anchorX + w.x[1] * scale + w.paddingPx,
          y(w.y[0], w.paddingPx),
        ];
        expect(facet.derivedRequestedWindowPx).toEqual(rect);
        expect(facet.derivedWindowPx).toEqual(
          facet.derivedRequestedWindowPx.map((v: number, i: number) =>
            Math.max(0, Math.min(v, i % 2 ? frame.height : frame.width)),
          ),
        );
        expect(facet.manualFinding).toEqual(
          inspection.facets.find((f: { facetId: string }) => f.facetId === facet.facetId),
        );
        expect(facet.manualFinding.visibleTextByRegion.length).toBeGreaterThanOrEqual(2);
        expect(raw(regions.manualInspection.path).length).toBe(regions.manualInspection.bytes);
      }
      if (entry.id.includes('layout')) {
        assertLayout(frame, entry);
        expect(regions.facets[0].manualFinding.visibleTextByRegion.map((r: { literal: string }) => r.literal)).toEqual([
          'AA BB',
          'CC DD',
          'EE FF',
          'AA BB CC DD EE FF',
          'AA BB CC DD EE FF',
        ]);
      } else assertFormatting(frame, entry);
      expect(regions.nativeFrameId).toBeNull();
      expect(regions.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
    });
    it('native: prepares captured box fonts and passes them through the Skia text context', () => {
      const { result, bars } = executeBoxText(entry);
      const drawings = result.drawings.map((d) => ({ ...d, scriptId: 'captured' }));
      const templateFont = matchFont({ fontSize: 18 });
      vi.mocked(matchFont).mockImplementation(() => ({ ...templateFont }));
      vi.mocked(matchFont).mockClear();
      const fonts = createNativeDrawingFonts(drawings);
      const format = entry.id.includes('format');
      const keys = format
        ? ['18px monospace', 'bold 18px monospace', 'italic 18px monospace', 'italic bold 18px monospace']
        : ['12px monospace', '16px sans-serif'];
      expect(Object.keys(fonts)).toEqual(keys);
      expect(vi.mocked(matchFont).mock.calls.map(([descriptor]) => descriptor)).toEqual(
        keys.map((key) =>
          expect.objectContaining({
            fontSize: format ? 18 : key.startsWith('12') ? 12 : 16,
            fontWeight: key.includes('bold') ? 'bold' : 'normal',
            fontStyle: key.includes('italic') ? 'italic' : 'normal',
          }),
        ),
      );
      const drawText = vi.fn();
      const canvas = Object.fromEntries(
        ['save', 'restore', 'clipPath', 'drawPath', 'drawRect'].map((name) => [name, vi.fn()]),
      );
      const ctx = createNativeDrawingContext({ ...canvas, drawText } as unknown as SkCanvas, fonts);
      const { anchorXPx, pixelsPerOwnBar, paneWidthPx: width, paneHeightPx: height } = entry.regions.registration;
      const startTime = bars[bars.length - 1].time - (anchorXPx / pixelsPerOwnBar) * 120_000;
      paintNativeTealScriptDrawings({
        ctx,
        drawings,
        bars,
        width,
        margins: { left: 0, right: 0, top: 0, bottom: 0 },
        viewport: { startTime, endTime: startTime + (width / pixelsPerOwnBar) * 120_000, priceMin: 0, priceMax: 100 },
        panes: [
          {
            id: 'study',
            type: 'indicator',
            indicatorIds: ['captured'],
            heightRatio: 1,
            fixedRange: true,
            top: 0,
            bottom: height,
            height,
            yMin: 0,
            yMax: 100,
          },
        ],
      });
      if (format) {
        expect(drawText.mock.calls.map((call) => call[0])).toEqual(Array(4).fill('FORMAT'));
        drawText.mock.calls.forEach((call, index) => expect(call[4]).toBe(fonts[keys[index]]));
      } else {
        expect(drawText.mock.calls.filter((call) => call[0] === 'EDGE')).toHaveLength(2);
        expect(drawText.mock.calls.some((call) => call[0] === 'AA BB CC DD EE FF')).toBe(true);
      }
    });
    for (const channel of ['web', 'native'] as const)
      it(`${channel}: paints the observed alternatives through the real box text painter`, () => {
        const paint = paintBoxText(entry, channel);
        expect(paint.result.drawings.every((d) => d.type === 'box')).toBe(true);
        if (entry.id.includes('layout')) {
          expect(paint.result.drawings).toHaveLength(5);
          assertLayout(paint, entry);
          const wrapped = paint.texts.filter((t) => t.x < 700 && t.y < 790);
          expect(wrapped.length).toBeGreaterThan(1);
          expect(wrapped.map((t) => t.text)).toEqual(
            entry.regions.facets[0].manualFinding.visibleTextByRegion
              .slice(0, 3)
              .map((r: { literal: string }) => r.literal),
          );
          expect(paint.texts.filter((t) => t.text === 'AA BB CC DD EE FF')).toHaveLength(2);
          const [top, bottom] = paint.texts.filter((t) => t.text === 'EDGE');
          expect([top.align, top.baseline, bottom.align, bottom.baseline]).toEqual(['left', 'top', 'right', 'bottom']);
        } else {
          expect(paint.result.drawings).toHaveLength(4);
          expect(paint.texts.map((t) => t.text)).toEqual(Array(4).fill('FORMAT'));
          expect(paint.texts.map((t) => t.font)).toEqual([
            '18px monospace',
            'bold 18px monospace',
            'italic 18px monospace',
            'italic bold 18px monospace',
          ]);
          assertFormatting(paint, entry);
        }
      });
  });

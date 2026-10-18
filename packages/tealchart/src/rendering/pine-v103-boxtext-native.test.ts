// @vitest-environment node
import type { SkCanvas, SkFont } from '@shopify/react-native-skia';
import type { PixelFrame } from '../test/v103BoxTextPaint';

import { matchFont } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { entries, json, raw } from '../../../tealscript/tests/fixtures/v103BoxText';
import { createNativeDrawingContext } from '../mobile/render/nativeDrawingContext';
import { createNativeDrawingFonts } from '../mobile/render/nativeDrawingFonts';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { boxTextScene, glyphMask, nativeBoxTextPixels, paintBoxText } from '../test/v103BoxTextPaint';

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
type LocatedText = { text: string; x: number; y: number };
const inRect = (text: LocatedText, rect: number[]) =>
  text.x >= rect[0] && text.x < rect[2] && text.y >= rect[1] && text.y < rect[3];
// Original PNG slots, independent of painter projection and drawing creation order.
const formatSlots = [
  { role: 'A none', rect: [551, 685, 793, 759], font: '18px monospace' },
  { role: 'B bold', rect: [851, 685, 1093, 759], font: 'bold 18px monospace' },
  { role: 'C italic', rect: [551, 793, 793, 867], font: 'italic 18px monospace' },
  { role: 'D combined', rect: [851, 793, 1093, 867], font: 'italic bold 18px monospace' },
];
const layoutSlots = [
  { role: 'A wrapped', rect: [551, 673, 600, 783], words: ['AA BB', 'CC DD', 'EE FF'] },
  { role: 'B nowrap', rect: [911, 673, 1040, 783], words: ['AA BB CC DD EE FF'] },
  { role: 'C wide control', rect: [551, 793, 1093, 831], words: ['AA BB CC DD EE FF'] },
  { role: 'D left top', rect: [551, 841, 793, 891], words: ['EDGE'] },
  { role: 'E right bottom', rect: [851, 841, 1093, 891], words: ['EDGE'] },
];
function assertTextIdentity<T extends LocatedText>(
  texts: T[],
  format: boolean,
  fontOf: (text: T) => unknown,
  expectedFont: (key: string) => unknown = (key) => key,
) {
  if (format) {
    expect(texts).toHaveLength(4);
    for (const { role, rect, font } of formatSlots) {
      const calls = texts.filter((text) => inRect(text, rect));
      expect(
        calls.map((text) => text.text),
        `${role} sentinel at original position`,
      ).toEqual(['FORMAT']);
      expect(fontOf(calls[0]), `${role} font at original position`).toBe(expectedFont(font));
    }
  } else {
    expect(texts).toHaveLength(7);
    for (const { role, rect, words } of layoutSlots) {
      const calls = texts.filter((text) => inRect(text, rect));
      expect(
        calls.map((text) => text.text),
        `${role} sentinel at original position`,
      ).toEqual(words);
      for (const text of calls)
        expect(fontOf(text), `${role} font at original position`).toBe(
          expectedFont(role.startsWith('D') || role.startsWith('E') ? '16px sans-serif' : '12px monospace'),
        );
    }
  }
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
        expect(layoutSlots.map((slot) => slot.rect)).toEqual([
          ...regions.facets[0].manualFinding.actualSubjectRegionsPx,
          ...regions.facets[0].manualFinding.actualControlRegionsPx,
          ...regions.facets[1].manualFinding.actualControlRegionsPx,
          ...regions.facets[1].manualFinding.actualSubjectRegionsPx,
        ]);
      } else {
        assertFormatting(frame, entry);
        expect(formatSlots.map((slot) => slot.rect)).toEqual([
          ...regions.facets[0].manualFinding.actualControlRegionsPx,
          ...regions.facets
            .slice(0, 3)
            .flatMap((facet: (typeof regions.facets)[number]) => facet.manualFinding.actualSubjectRegionsPx),
        ]);
      }
      expect(regions.nativeFrameId).toBeNull();
      expect(regions.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
    });
    it('native: prepares captured box fonts and passes them through the Skia text context', () => {
      const { drawings, bars, viewport, pane, margins, paneWidthPx: width } = boxTextScene(entry);
      const templateFont = matchFont({ fontSize: 18 });
      const descriptors = new Map<SkFont, Parameters<typeof matchFont>[0]>();
      vi.mocked(matchFont).mockImplementation((descriptor) => {
        const font = { ...templateFont };
        descriptors.set(font, descriptor);
        return font;
      });
      vi.mocked(matchFont).mockClear();
      const fonts = createNativeDrawingFonts(drawings);
      const format = entry.id.includes('format');
      const keys = format
        ? ['18px monospace', 'bold 18px monospace', 'italic 18px monospace', 'italic bold 18px monospace']
        : ['12px monospace', '16px sans-serif'];
      expect(Object.keys(fonts)).toEqual(keys);
      expect(vi.mocked(matchFont)).toHaveBeenCalledTimes(keys.length);
      for (const key of keys)
        expect(descriptors.get(fonts[key]), `${key} descriptor belongs to its font object`).toMatchObject({
          fontSize: format ? 18 : key.startsWith('12') ? 12 : 16,
          fontWeight: key.includes('bold') ? 'bold' : 'normal',
          fontStyle: key.includes('italic') ? 'italic' : 'normal',
        });
      const drawText = vi.fn();
      const canvas = Object.fromEntries(
        ['save', 'restore', 'clipPath', 'drawPath', 'drawRect'].map((name) => [name, vi.fn()]),
      );
      const ctx = createNativeDrawingContext({ ...canvas, drawText } as unknown as SkCanvas, fonts);
      paintNativeTealScriptDrawings({ ctx, drawings, bars, width, margins, viewport, panes: [pane] });
      const texts = drawText.mock.calls.map(([text, x, y, , font]) => ({ text, x, y, font }));
      assertTextIdentity(
        texts,
        format,
        (text) => text.font,
        (key) => fonts[key],
      );
      if (!format) {
        for (const [index, { role, rect }] of layoutSlots.slice(3).entries()) {
          const text = texts.find((text) => text.text === 'EDGE' && inRect(text, rect))!;
          const metrics = text.font.getMetrics();
          expect(text.x + text.font.measureText(text.text).width, role).toBeLessThan(rect[2]);
          if (index === 0) {
            expect(text.x, role).toBeLessThan((rect[0] + rect[2]) / 2);
            expect(text.y + metrics.descent, role).toBeLessThan((rect[1] + rect[3]) / 2);
          } else {
            expect(text.x, role).toBeGreaterThan((rect[0] + rect[2]) / 2);
            expect(text.y + metrics.ascent, role).toBeGreaterThan((rect[1] + rect[3]) / 2);
          }
        }
      }
    });
    for (const channel of ['web', 'native'] as const)
      it(`${channel}: paints the observed alternatives through the real box text painter`, () => {
        const paint = paintBoxText(entry, channel);
        expect(paint.result.drawings.every((d) => d.type === 'box')).toBe(true);
        assertTextIdentity(paint.texts, entry.id.includes('format'), (text) => text.font);
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
          const [top, bottom] = layoutSlots
            .slice(3)
            .map(({ rect }) => paint.texts.find((text) => text.text === 'EDGE' && inRect(text, rect))!);
          expect([top.align, top.baseline, bottom.align, bottom.baseline]).toEqual(['left', 'top', 'right', 'bottom']);
        } else {
          expect(paint.result.drawings).toHaveLength(4);
          assertFormatting(paint, entry);
        }
      });
  });

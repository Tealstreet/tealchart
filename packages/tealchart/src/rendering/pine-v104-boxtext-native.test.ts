// @vitest-environment node
import { createHash } from 'node:crypto';

import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';

import { entries, json } from '../../../tealscript/tests/fixtures/v104BoxText';
import { glyphMask, nativeBoxTextPixels, paintBoxText } from '../test/v103BoxTextPaint';

const phrase = 'ALPHA BETA GAMMA DELTA';
const digest = (bytes: Uint8Array | Uint8ClampedArray) => createHash('sha256').update(bytes).digest('hex');
const inset = (r: number[]) => [r[0] + 4, r[1] + 4, r[2] - 4, r[3] - 4];
function independentPlate(entry: (typeof entries)[number]) {
  const wrap = entry.id.includes('wrap');
  const vertical = entry.id.includes('vertical');
  const { registration, originalDimensionsPx } = entry.regions;
  const { yZeroPx, yHundredPx } = json(entry.regions.manualInspection.path).axisCalibration;
  const scale = registration.pixelsPerOwnBar;
  const anchor = registration.anchorXPx;
  const y = (value: number) => yZeroPx - (value * (yZeroPx - yHundredPx)) / 100;
  // Frozen source coordinates, independent of engine drawings and painter layout.
  const source = wrap
    ? [
        [-30, 90, -22, 25],
        [-19, 90, -11, 25],
        [-30, 20, -1, 5],
      ]
    : vertical
      ? [
          [-30, 95, -22, 5],
          [-19, 95, -11, 5],
          [-8, 95, -1, 5],
        ]
      : [
          [-30, 95, -1, 70],
          [-30, 65, -1, 40],
          [-30, 35, -1, 10],
        ];
  const canvas = createCanvas(originalDimensionsPx.width, originalDimensionsPx.height);
  const ctx = canvas.getContext('2d');
  ctx.font = '20px sans-serif';
  const slots = source.map(([l, t, r, b], index) => {
    const left = anchor + l * scale,
      right = anchor + r * scale,
      top = y(t),
      bottom = y(b);
    let words = [wrap ? phrase : 'EDGE'];
    if (wrap && index === 0) {
      const tokens = phrase.split(' ');
      words = [];
      for (let start = 0; start < tokens.length;) {
        const end = Array.from({ length: tokens.length - start }, (_, n) => start + n + 1).findLast(
          (end) => ctx.measureText(tokens.slice(start, end).join(' ')).width <= right - left - 12,
        )!;
        expect(end).toBeGreaterThan(start);
        words.push(tokens.slice(start, end).join(' '));
        start = end;
      }
      expect(words.length).toBeGreaterThan(1);
    }
    const align = vertical ? 'center' : wrap || index === 0 ? 'left' : index === 1 ? 'center' : 'right';
    const baseline = vertical
      ? index === 0
        ? 'top'
        : index === 1
          ? 'middle'
          : 'bottom'
      : wrap && index < 2
        ? 'top'
        : 'middle';
    const x = align === 'left' ? left + 6 : align === 'right' ? right - 6 : (left + right) / 2;
    const ty = baseline === 'top' ? top + 6 : baseline === 'bottom' ? bottom - 6 : (top + bottom) / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.strokeStyle = '#2962FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.save();
    if (wrap && index === 0) {
      ctx.beginPath();
      ctx.rect(left, top, right - left, bottom - top);
      ctx.clip();
    }
    ctx.fillStyle = '#2962FF';
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    words.forEach((word, n) => ctx.fillText(word, x, ty + n * 25));
    ctx.restore();
    return {
      rect: [left, top, right, bottom],
      calls: words.map((text, n) => ({
        text,
        x,
        y: ty + n * 25,
        font: '20px sans-serif',
        align,
        baseline,
      })),
    };
  });
  return { slots, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
}
for (const entry of entries)
  describe(`${entry.id}: object-bound native text`, () => {
    it('binds the original PNG, native axes, complete captions and each finite alternative', async () => {
      const frame = await nativeBoxTextPixels(entry);
      const map = entry.regions,
        inspection = json(map.manualInspection.path);
      expect(inspection.inspectedOriginalPngSha256).toBe(map.originalPng.sha256);
      expect([frame.width, frame.height]).toEqual([1706, 993]);
      const ticks = map.registration.xTicks;
      for (const tick of ticks) {
        expect(entry.csv.raw(tick.time.rowOrdinal, 'time')).toBe(tick.time.valueRaw);
        expect(entry.csv.raw(tick.ownIndex.rowOrdinal, 'INPUT_INDEX')).toBe(tick.ownIndex.valueRaw);
      }
      const scale =
        (ticks[1].xPx - ticks[0].xPx) / (Number(ticks[1].ownIndex.valueRaw) - Number(ticks[0].ownIndex.valueRaw));
      expect(scale).toBe(map.registration.pixelsPerOwnBar);
      expect(
        ticks[0].xPx + (Number(map.retainedAnchor.INPUT_INDEX.valueRaw) - Number(ticks[0].ownIndex.valueRaw)) * scale,
      ).toBe(map.registration.anchorXPx);
      const finding = inspection.facets[0];
      expect(map.facets[0].manualFinding).toEqual(finding);
      expect(map.facets[0]).toMatchObject({
        verdict: 'SUPPORTED',
        outcome: 'SUPPORTED_A',
        modelBVerdict: 'REFUTED',
        notObservedCauses: [],
      });
      const rects = entry.id.includes('wrap')
        ? [...finding.actualSubjectRegionsPx, ...finding.actualControlRegionsPx]
        : finding.actualSubjectRegionsPx;
      const nativeInk = rects.map((rect: number[]) => glyphMask(frame, inset(rect)));
      for (const ink of nativeInk) expect(ink.count).toBeGreaterThan(0);
      if (entry.id.includes('wrap')) {
        expect(finding.visibleTextByRegion.map((v: { literal: string }) => v.literal)).toEqual([
          'ALPHA BETA',
          'GAMMA DELTA',
          phrase,
          phrase,
        ]);
        expect(nativeInk.map((v: { bands: number }) => v.bands)).toEqual([2, 1, 1]);
      } else if (entry.id.includes('vertical')) {
        expect(finding.visibleTextByRegion.map((v: { literal: string }) => v.literal)).toEqual([
          'EDGE',
          'EDGE',
          'EDGE',
        ]);
        const expectedBounds = [
          [407, 683, 456, 697],
          [629, 775, 678, 789],
          [842, 865, 891, 879],
        ];
        for (const [index, ink] of nativeInk.entries()) {
          expect(ink.bands).toBe(1);
          expect(ink.bounds).toEqual(expectedBounds[index]);
          expect(finding.actualGlyphBoundsPx[index]).toEqual(
            [
              [406, 683, 457, 699],
              [628, 775, 679, 790],
              [841, 865, 892, 881],
            ][index],
          );
        }
        expect(nativeInk[0].bounds[3]).toBeLessThan(710);
        expect(nativeInk[1].bounds[1]).toBeGreaterThan(760);
        expect(nativeInk[1].bounds[3]).toBeLessThan(800);
        expect(nativeInk[2].bounds[1]).toBeGreaterThan(850);
        for (const [index, rect] of rects.entries()) {
          const xs: number[] = [],
            ys: number[] = [];
          for (let y = rect[1]; y < rect[3]; y++)
            for (let x = rect[0]; x < rect[2]; x++) {
              const [r, g, b] = frame.pixels.slice((y * frame.width + x) * 4, (y * frame.width + x) * 4 + 3);
              if (Math.min(r, g, b) > 245) {
                xs.push(x);
                ys.push(y);
              }
            }
          expect(xs.length).toBeGreaterThan(25000);
          expect([Math.min(...xs), Math.min(...ys), Math.max(...xs) + 1, Math.max(...ys) + 1]).toEqual(
            [
              [351, 674, 512, 889],
              [573, 674, 734, 889],
              [796, 674, 937, 889],
            ][index],
          );
        }
      } else {
        expect(finding.visibleTextByRegion.map((v: { literal: string }) => v.literal)).toEqual([
          'EDGE',
          'EDGE',
          'EDGE',
        ]);
        expect(nativeInk[0].bounds[2]).toBeLessThan(450);
        expect(nativeInk[1].bounds[0]).toBeGreaterThan(600);
        expect(nativeInk[1].bounds[2]).toBeLessThan(690);
        expect(nativeInk[2].bounds[0]).toBeGreaterThan(850);
      }
      expect(map.nativeFrameId).toBeNull();
      expect(map.exposedAppearanceMetadata).toMatchObject({ dpi: null, resolvedFont: null, zoom: null });
    });
    for (const channel of ['web', 'native'] as const)
      it(`${channel}: preserves each box's complete ink and line geometry`, () => {
        const expected = independentPlate(entry);
        const paint = paintBoxText(entry, channel);
        expect(paint.result.drawings).toHaveLength(3);
        const calls = expected.slots.flatMap((slot) => slot.calls);
        expect(paint.texts).toHaveLength(calls.length);
        for (const [index, call] of calls.entries()) {
          const { x, y, ...identity } = call;
          expect(paint.texts[index]).toMatchObject(identity);
          expect(paint.texts[index].x).toBeCloseTo(x, 6);
          expect(paint.texts[index].y).toBeCloseTo(y, 6);
        }
        // Independent absolute canvas primitives retain body, caption, opacity and extents.
        // Exact local raster equality is not a claim about native font/DPI raster metrics.
        expect(digest(paint.pixels)).toBe(digest(expected.pixels));
        for (const slot of expected.slots) expect(glyphMask(paint, inset(slot.rect)).count).toBeGreaterThan(0);
      });
  });

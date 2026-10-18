// @vitest-environment node
import type { CanvasContext } from './CanvasContext';
import type { ComputedPane } from '../types';

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';

import { drawingTypes, entries, executePolylabel, raw } from '../../../tealscript/tests/fixtures/v103Polylabel';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { traceEntry } from '../test/v102Paint';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

const orange = (r: number, g: number, b: number) => r > 180 && g > 70 && b < 90 && r > g;
const blue = (r: number, g: number, b: number) => b > 150 && b > 1.7 * r && b > 1.5 * g;
function count(pixels: Uint8ClampedArray, width: number, rect: number[], color: typeof orange) {
  let n = 0;
  for (let y = Math.ceil(rect[1]); y <= Math.floor(rect[3]); y++) for (let x = Math.ceil(rect[0]); x <= Math.floor(rect[2]); x++) {
    const i = 4 * (y * width + x);
    if (color(pixels[i], pixels[i + 1], pixels[i + 2]) && pixels[i + 3] > 128) n++;
  }
  return n;
}

for (const entry of entries) describe(`${entry.id}: finite original PNG-bound stacking`, () => {
  it('retains blue at the registered overlap and orange positive controls in the original native bitmap', async () => {
    const image = await loadImage(raw(entry.regions.originalPng.path));
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    const facet = entry.regions.facets[0];
    expect(facet).toMatchObject({ verdict: 'SUPPORTED', outcome: 'SUPPORTED_A', modelBVerdict: 'REFUTED' });
    const finding = facet.manualFinding;
    for (const rect of finding.actualIntersectionsPx) {
      const interior = [rect[0] + 4, rect[1] + 4, rect[2] - 4, rect[3] - 4];
      expect(count(pixels, image.width, interior, blue), 'native blue overlap').toBeGreaterThan(0);
      expect(count(pixels, image.width, interior, orange), 'native subject must be covered').toBe(0);
    }
    for (const rect of finding.actualControlRegionsPx) {
      const interior = [rect[0] + 4, rect[1] + 4, rect[2] - 4, rect[3] - 4];
      expect(count(pixels, image.width, interior, orange), 'native subject independently visible outside cover').toBeGreaterThan(0);
    }
  });

  for (const channel of ['web', 'native'] as const) {
    it(`${channel}: actual unchanged-source drawings paint the supported cover after the subject`, () => {
      const replay = executePolylabel(entry);
      const { paints } = traceEntry(replay, channel, true);
      const subjects = paints.flatMap((p, i) => p.color === '#FF9800' ? [i] : []);
      const covers = paints.flatMap((p, i) => p.kind === 'fill' && p.color === '#2962FF' ? [i] : []);
      if (entry.id.includes('polyline-label')) expect(subjects).toHaveLength(2);
      else expect(subjects.length).toBeGreaterThanOrEqual(1);
      expect(covers.length).toBeGreaterThanOrEqual(entry.id.includes('polyline-label') ? 2 : 1);
      expect(Math.min(...covers), 'cover must paint above subject').toBeGreaterThan(Math.max(...subjects));
      expect(replay.result.drawings.map(d => d.type)).toEqual(drawingTypes(entry.id));
    });

    it(`${channel}: real canvas keeps the subject visible outside each opaque cover`, () => {
      const { result, bars } = executePolylabel(entry);
      const last = bars.length - 1;
      const width = 1000, height = 300;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d') as unknown as CanvasContext;
      const viewport = { startTime: bars[last - 180].time, endTime: bars[last].time + 12 * 120000, priceMin: 0, priceMax: 100 };
      const margins = { left: 0, right: 0, top: 0, bottom: 0 };
      const pane: ComputedPane = { id: 'main', type: 'main', heightRatio: 1, fixedRange: true, yMin: 0, yMax: 100, top: 0, bottom: height, height };
      const x = (index: number) => (bars[index].time - viewport.startTime) / (viewport.endTime - viewport.startTime) * width;
      if (channel === 'web') new TealScriptDrawingRenderer({ ctx, options: { ...DEFAULT_RENDER_OPTIONS, width }, margins, font: 'sans-serif',
        coordinateResolvers: { timeToX: t => (t - viewport.startTime) / (viewport.endTime - viewport.startTime) * width, valueToY: v => height - v * 3 },
        getTextWidth: (active, text) => active.measureText(text).width,
      }).render(partitionTealScriptDrawings(result.drawings), bars, viewport, pane);
      else paintNativeTealScriptDrawings({ ctx, drawings: result.drawings, bars, viewport, panes: [pane], width, margins });
      const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      const centers = entry.id.includes('polyline-label') ? [30, 70].map(value => ({ x: x(last - 50), y: height - value * 3 }))
        : entry.id.includes('over-label') ? [{ x: x(last - 40), y: 150 }] : [{ x: 500, y: 180 }];
      for (const center of centers) {
        const interior = [center.x - 6, center.y - 3, center.x + 6, center.y + 3];
        expect(count(pixels, width, interior, blue), 'engine opaque blue overlap').toBeGreaterThan(0);
        expect(count(pixels, width, interior, orange), 'engine subject must be covered').toBe(0);
        const controls = entry.id.includes('over-label') ? [-40, 40].map(dy => [center.x - 20, center.y + dy - 3, center.x + 20, center.y + dy + 3])
          : (entry.id.includes('polyline-label') ? [center.x - 100, center.x + 100] : [50, 950]).map(controlX => [controlX - 3, center.y - 2, controlX + 3, center.y + 2]);
        for (const control of controls) {
          expect(count(pixels, width, control, orange), 'engine outside subject control').toBeGreaterThan(0);
        }
      }
    });
  }
});

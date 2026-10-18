// @vitest-environment node
import type { CanvasContext } from './CanvasContext';
import type { ComputedPane } from '../types';

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';

import { entries, pointGeometry, raw } from '../../../tealscript/tests/fixtures/v103Points';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

const blue = (r: number, g: number, b: number) => b > 170 && b > 1.7 * r && b > 1.4 * g;
const yellow = (r: number, g: number, b: number) => r > 180 && g > 160 && b < 100;
function count(pixels: Uint8ClampedArray, width: number, rect: number[], color: typeof blue) {
  let n = 0;
  for (let y = Math.ceil(rect[1]); y <= Math.floor(rect[3]); y++) for (let x = Math.ceil(rect[0]); x <= Math.floor(rect[2]); x++) {
    const i = 4 * (y * width + x);
    if (color(pixels[i], pixels[i + 1], pixels[i + 2]) && pixels[i + 3] > 128) n++;
  }
  return n;
}
const around = (x: number, y: number, padding = 4) => [x - padding, y - padding, x + padding, y + padding];

for (const entry of entries) describe(`${entry.id}: six finite point facets through actual painters`, () => {
  it('reads the original PNG at registered assigned coordinates and clear competing neighborhoods', async () => {
    const bitmap = await loadImage(raw(entry.regions.originalPng.path));
    const canvas = createCanvas(bitmap.width, bitmap.height), ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const region = entry.regions, facet = region.facets[0];
    const window = facet.frozenPixelWindow, rect = facet.derivedWindowPx, pad = window.paddingPx;
    const dy = (rect[3] - rect[1] - 2 * pad) / (window.y[1] - window.y[0]);
    const y0 = rect[1] + pad + window.y[1] * dy;
    const x = (offset: number) => region.registration.anchorXPx + offset * region.registration.pixelsPerOwnBar;
    const y = (value: number) => y0 - value * dy;
    expect([dy, y0]).toEqual([2.15, 889]);
    for (const [dx, value] of [[-85, 75], [-75, 85], [-25, 80]]) {
      expect(count(pixels, bitmap.width, around(x(dx), y(value)), blue), `assigned ${dx}/${value}`).toBeGreaterThan(0);
    }
    for (const [dx, value] of [[-64, 84], [-51, 66]]) {
      expect(count(pixels, bitmap.width, around(x(dx), y(value), 2), yellow), `assigned box ${dx}/${value}`).toBeGreaterThan(0);
    }
    for (const [dx, value] of [[-95, 15], [-85, 25], [-35, 20], [-10, 10], [-5, 15], [-5, 10]]) {
      expect(count(pixels, bitmap.width, around(x(dx), y(value)), blue), `original/later ${dx}/${value}`).toBe(0);
    }
    for (const [dx, value] of [[-70, 30], [-60, 10], [-15, 40], [-5, 30]]) {
      expect(count(pixels, bitmap.width, around(x(dx), y(value)), yellow), `original/later box ${dx}/${value}`).toBe(0);
    }
    const { geometry } = pointGeometry(entry);
    const assigned = [[geometry[0].slice(0, 2)], [geometry[0].slice(2, 4)], [geometry[1].slice(0, 2)],
      [geometry[1].slice(2, 4)], [geometry[2].slice(0, 2)], [geometry[0].slice(0, 2), geometry[1].slice(0, 2), geometry[2].slice(0, 2)]];
    for (const [i, f] of region.facets.entries()) {
      expect(f).toMatchObject({ outcome: 'SUPPORTED_A', modelBVerdict: 'REFUTED' });
      for (const pair of assigned[i]) {
        const px = x(Number(pair[0])), py = y(Number(pair[1]));
        const regions = f.manualFinding.actualSubjectRegionsPx as number[][];
        expect(regions.some(r => px >= r[0] && px <= r[2] && py >= r[1] && py <= r[3])).toBe(true);
      }
    }
  });

  for (const channel of ['web', 'native'] as const) it(`${channel}: applied endpoints and copied fields survive later point mutation on real canvas`, () => {
    const { result, bars } = pointGeometry(entry);
    const last = bars.length - 1, width = 1000, height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d') as unknown as CanvasContext;
    const viewport = { startTime: bars[last - 100].time, endTime: bars[last].time, priceMin: 0, priceMax: 100 };
    const margins = { left: 0, right: 0, top: 0, bottom: 0 };
    const pane: ComputedPane = { id: 'main', type: 'main', heightRatio: 1, fixedRange: true, yMin: 0, yMax: 100, top: 0, bottom: height, height };
    const x = (offset: number) => (bars[last + offset].time - viewport.startTime) / (viewport.endTime - viewport.startTime) * width;
    const y = (value: number) => height - value * 3;
    if (channel === 'web') new TealScriptDrawingRenderer({ ctx, options: { ...DEFAULT_RENDER_OPTIONS, width }, margins, font: 'sans-serif',
      coordinateResolvers: { timeToX: t => (t - viewport.startTime) / (viewport.endTime - viewport.startTime) * width, valueToY: y },
      getTextWidth: (active, text) => active.measureText(text).width,
    }).render(partitionTealScriptDrawings(result.drawings), bars, viewport, pane);
    else paintNativeTealScriptDrawings({ ctx, drawings: result.drawings, bars, viewport, panes: [pane], width, margins });
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    for (const [dx, value] of [[-85, 75], [-75, 85], [-25, 80]]) {
      expect(count(pixels, width, around(x(dx), y(value)), blue), `${channel} assigned ${dx}/${value}`).toBeGreaterThan(0);
    }
    for (const [dx, value] of [[-64, 84], [-51, 66]]) {
      expect(count(pixels, width, around(x(dx), y(value), 2), yellow), `${channel} assigned box ${dx}/${value}`).toBeGreaterThan(0);
    }
    for (const [dx, value] of [[-95, 15], [-85, 25], [-35, 20], [-10, 10], [-5, 15], [-5, 10]]) {
      expect(count(pixels, width, around(x(dx), y(value)), blue), `${channel} original/later ${dx}/${value}`).toBe(0);
    }
    for (const [dx, value] of [[-70, 30], [-60, 10], [-15, 40], [-5, 30]]) {
      expect(count(pixels, width, around(x(dx), y(value)), yellow), `${channel} original/later box ${dx}/${value}`).toBe(0);
    }
  });
});

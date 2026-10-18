// @vitest-environment node
import type { CanvasContext } from './CanvasContext';
import type { ComputedPane } from '../types';

import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it } from 'vitest';

import { executeStyle, styleEntries, styleRaw } from '../../../tealscript/tests/fixtures/v102Style';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { traceEntry } from '../test/v102Paint';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

const entry = styleEntries.find(e => e.id === 'v102-extend-stroke-v6')!;
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const nativeRegions = [
  { upper: [533, 691, 537, 695], lower: [533, 719, 537, 723], shaft: [528, 706, 534, 707], interior: [531, 710, 533, 712] },
  { upper: [745, 691, 749, 695], lower: [745, 719, 749, 723], shaft: [748, 706, 754, 707], interior: [749, 710, 751, 712] },
];
function redPixel(rgba: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4;
  return rgba[i] > 170 && rgba[i] > rgba[i + 1] * 1.8 && rgba[i] > rgba[i + 2] * 1.5 && rgba[i + 3] > 128;
}
let nativeCounts: { upper: number; lower: number; shaft: number; interior: number }[];
beforeAll(async () => {
  expect(sha(styleRaw(entry.sourcePath))).toBe('44cecf1c82ee45071eb4410b1e5268f184c105061eb33a52031863e1aa14ed8d');
  expect(sha(styleRaw(entry.block.csv.path))).toBe('3340fc7b15e5738d8362cd726d88e16a13b37b366faaae49ffb09b1be17e5e7c');
  const png = styleRaw(entry.regions.originalPng.path);
  expect(sha(png)).toBe('b38b9ab2680d6b217322fe3edc2a6edd79a278a242b764dd62d753cbc6deef76');
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  nativeCounts = nativeRegions.map(regions => Object.fromEntries(Object.entries(regions).map(([name, [x0, y0, x1, y1]]) => {
    let count = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (redPixel(pixels, image.width, x, y)) count++;
    return [name, count];
  })) as typeof nativeCounts[number]);
  expect(nativeCounts).toEqual([{ upper: 16, lower: 19, shaft: 14, interior: 0 }, { upper: 16, lower: 18, shaft: 14, interior: 0 }]);
});

for (const channel of ['web', 'native'] as const) describe(`v102 native open-chevron topology ${channel}`, () => {
  it('retains both branches and the continuing shaft, with an empty lower interior at each supplied end', () => {
    expect(nativeCounts.every(n => n.upper > 0 && n.lower > 0 && n.shaft > 0 && n.interior === 0)).toBe(true);
    const replay = executeStyle(entry);
    const line = replay.result.drawings.filter(d => d.type === 'line').find(d => d.style === 'arrow_both')!;
    expect(line).toMatchObject({ width: 4, y1: 81, y2: 81, extend: 'both' });
    const result = { ...replay.result, drawings: [line] };
    const { paints, closedPaths } = traceEntry({ ...replay, result }, channel);
    const bars = replay.bars;
    const last = bars.length - 1;
    const xs = [line.x1!, line.x2!].map(x => x / last * 1000);
    const canvas = createCanvas(4000, 400);
    const nativeContext = canvas.getContext('2d');
    nativeContext.scale(4, 4);
    const ctx = nativeContext as unknown as CanvasContext;
    const margins = { left: 0, right: 0, top: 0, bottom: 0 };
    const viewport = { startTime: bars[0].time, endTime: bars[last].time, priceMin: 0, priceMax: 100 };
    const pane: ComputedPane = { id: 'main', type: 'main', heightRatio: 1, fixedRange: true, yMin: 0, yMax: 100, top: 0, bottom: 100, height: 100 };
    if (channel === 'web') new TealScriptDrawingRenderer({ ctx, options: { ...DEFAULT_RENDER_OPTIONS, width: 1000 }, margins, font: 'sans-serif',
      coordinateResolvers: { timeToX: t => (t - viewport.startTime) / (viewport.endTime - viewport.startTime) * 1000, valueToY: v => 100 - v },
      getTextWidth: (active, text) => active.measureText(text).width,
    }).render(partitionTealScriptDrawings([line]), bars, viewport, pane);
    else paintNativeTealScriptDrawings({ ctx, drawings: [line], bars, viewport, panes: [pane], width: 1000, margins });
    const pixels = nativeContext.getImageData(0, 0, 4000, 400).data;
    const ink = (x: number, y: number) => redPixel(pixels, 4000, Math.floor(x * 4), Math.floor(y * 4));
    for (const [i, x] of xs.entries()) {
      const commands = paints.filter(p => p.color === line.color && p.points.some(point => point.x === x && Math.round(point.y) === 19) && p.points.some(point => Math.round(point.y) !== 19));
      expect(commands.length, 'a head must remain on each supplied endpoint').toBeGreaterThan(0);
      const points = commands.flatMap(p => p.points);
      const tip = points.find(p => p.x === x && Math.round(p.y) === 19)!;
      const upper = points.find(p => p.y < tip.y)!;
      const lower = points.find(p => p.y > tip.y)!;
      expect(upper, 'upper branch').toBeDefined();
      expect(lower, 'lower branch').toBeDefined();
      expect(ink((tip.x + upper.x) / 2, (tip.y + upper.y) / 2), 'upper branch ink').toBe(true);
      expect(ink((tip.x + lower.x) / 2, (tip.y + lower.y) / 2), 'lower branch ink').toBe(true);
      expect(ink(tip.x + (i === 0 ? 1 : -1) * line.width, tip.y), 'shaft ink').toBe(true);
      expect(ink(tip.x + 0.9 * (lower.x - tip.x), tip.y + 0.5 * (lower.y - tip.y)), 'native empty lower interior').toBe(false);
      expect(commands.every(p => p.kind === 'stroke' && p.width === line.width && p.dash.length === 0)).toBe(true);
      expect(points.filter(p => p.x !== x).every(p => i === 0 ? p.x > x : p.x < x)).toBe(true);
    }
    expect(closedPaths, 'a chevron has no closing base edge').toEqual([]);
    expect(paints.filter(p => p.kind === 'fill'), 'no filled arrowhead').toEqual([]);
  });
});

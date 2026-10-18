// @vitest-environment node
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';

import { entries, executeMisc, json, raw, type MiscEntry } from '../../../tealscript/tests/fixtures/v103V5Misc';
import { traceEntry, type FixturePaint } from '../test/v102Paint';

const pngHashes = [
  'eb5fd94d4c7421b3d07f8d20d28906540990fa5dd385ea93cf22671a550976e9',
  '46d08ffcc94c91ff378364dfc33b85dafd735d2d8edebb0b42cd54f01c0b201d',
  '0ab1426e5e068af58cac3b20a6c38683081bdc5497a187bf9bf350a80d6c8a77',
];
const y = (value: number) => 901 - 2.4 * value;
const red = (r: number, g: number, b: number) => r > 150 && r > g * 1.6 && r > b * 1.4;
const blue = (r: number, g: number, b: number) => b > 80 && b > r * 1.8 && b > g * 1.25;
const gray = (r: number, g: number, b: number) => r > 80 && Math.max(r, g, b) - Math.min(r, g, b) < 15;
async function original(entry: MiscEntry) {
  const image = await loadImage(raw(entry.regions.originalPng.path));
  expect([image.width, image.height]).toEqual([1706, 993]);
  expect(entry.regions.originalPng.sha256).toBe(pngHashes[entries.indexOf(entry)]);
  const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, image.height).data;
  const count = (x0: number, y0: number, x1: number, y1: number, color: typeof red) => {
    let found = 0;
    for (let row = Math.ceil(y0); row <= Math.floor(y1); row++) for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) {
      const offset = (row * image.width + x) * 4;
      if (color(data[offset], data[offset + 1], data[offset + 2])) found++;
    }
    return found;
  };
  return count;
}
function bounds(p: FixturePaint) {
  return [Math.min(...p.points.map(v => v.x)), Math.min(...p.points.map(v => v.y)), Math.max(...p.points.map(v => v.x)), Math.max(...p.points.map(v => v.y))];
}
function projectedX(bars: ReturnType<typeof executeMisc>['bars'], relative: number) {
  const last = bars.length - 1;
  return (bars[last + relative].time - bars[0].time) / (bars[last].time - bars[0].time) * 1000;
}

describe('v103 original PNG-bound v5 styles and independently captured v5/v6 retained linefill', () => {
  for (const entry of entries) {
    it(`${entry.id}: independently registers the frozen windows against original axes and owned session`, () => {
      const map = entry.regions, reg = map.registration;
      expect(map.sourceSha256).toBe(entry.block.sourceSha256);
      expect(map.nativePrivateId).toBe(entry.block.nativePrivateId);
      const receipt = json(map.sessionReceipt.path);
      expect(receipt).toMatchObject({ source: entry.id, sourceSha256: map.sourceSha256, csv: { path: map.originalCsv.path }, viewportActions: [], nativeFrameAsOfClock: null });
      expect(reg).toMatchObject({ anchorXPx: 1121, pixelsPerOwnBar: 6, paneInteriorBoundsPx: [0, 632, 1190, 926], uncertaintyPx: { x: 2, y: 3, strokeEdge: 1 } });
      const anchor = Number(map.retainedAnchor.INPUT_INDEX.valueRaw);
      for (const tick of reg.xTicks) {
        expect(entry.csv.raw(tick.time.rowOrdinal, 'time')).toBe(tick.time.valueRaw);
        expect(entry.csv.raw(tick.ownIndex.rowOrdinal, 'INPUT_INDEX')).toBe(tick.ownIndex.valueRaw);
        expect(tick.xPx + (anchor - Number(tick.ownIndex.valueRaw)) * 6).toBe(1121);
      }
      for (const facet of map.facets) {
        const { x, y: values, paddingPx: pad } = facet.frozenPixelWindow;
        const expected = [Math.max(0, 1121 + x[0] * 6 - pad), y(values[1]) - pad, Math.min(1706, 1121 + x[1] * 6 + pad), y(values[0]) + pad];
        facet.derivedWindowPx.forEach((value: number, i: number) => expect(value).toBeCloseTo(expected[i], 10));
        expect(facet.outcome).toBe('SUPPORTED_A');
      }
    });
    if (entry.id.includes('extend')) {
      it(`${entry.id}: original pixels distinguish each line/box lane, extension, gaps and thick strokes`, async () => {
        const count = await original(entry);
        const thinThickness = Math.max(...[0, 100].flatMap(value => Array.from({ length: 21 }, (_, i) => count(750 + i, y(value) - 4, 750 + i, y(value) + 4, gray))));
        expect(thinThickness).toBeGreaterThan(0);
        const presence = [[false, true, false], [true, true, false], [false, true, true], [true, true, true]];
        for (let lane = 0; lane < 4; lane++) {
          const lineY = y(15 + 22 * lane), boxY = y(24 + 22 * lane);
          for (const [i, x] of [550, 750, 1000].entries()) expect(count(x, lineY - 4, x + 30, lineY + 4, red) > 0).toBe(presence[lane][i]);
          for (const [i, x] of [850, 990, 1080].entries()) expect(count(x, boxY - 3, x + 30, boxY + 3, blue) > 0).toBe(presence[lane][i]);
          const occupied = Array.from({ length: 121 }, (_, i) => count(730 + i, lineY - 4, 730 + i, lineY + 4, red) > 0);
          expect(occupied.includes(false)).toBe(lane === 1 || lane === 2);
          const boxOccupied = Array.from({ length: 51 }, (_, i) => count(990 + i, boxY - 2, 990 + i, boxY + 2, blue) > 0);
          expect(boxOccupied.includes(false)).toBe(lane % 2 === 1);
          expect(Math.max(...Array.from({ length: 121 }, (_, i) => count(730 + i, lineY - 4, 730 + i, lineY + 4, red)))).toBeGreaterThan(thinThickness);
          const thickness = Math.max(...Array.from({ length: 51 }, (_, i) => count(990 + i, boxY - 3, 990 + i, boxY + 3, blue)));
          expect(thickness).toBeGreaterThan(thinThickness);
        }
        const longestRun = (value: number) => {
          let run = 0, longest = 0;
          for (let x = 730; x <= 850; x++) {
            run = count(x, y(value) - 4, x, y(value) + 4, red) ? run + 1 : 0;
            longest = Math.max(longest, run);
          }
          return longest;
        };
        expect(longestRun(37)).toBeGreaterThan(longestRun(59));
        expect(count(750, y(0) - 1, 770, y(0) + 1, gray)).toBeGreaterThan(0);
        expect(count(750, y(100) - 1, 770, y(100) + 1, gray)).toBeGreaterThan(0);
      });
      for (const channel of ['web', 'native'] as const) it(`${entry.id} ${channel}: real painter preserves row-owned extension/style/width setters`, () => {
        const { paints, bars } = traceEntry(executeMisc(entry), channel, true);
        const lines = paints.filter(p => p.kind === 'stroke' && p.color === '#FF5252');
        expect(lines).toHaveLength(4);
        const boxStrokes = paints.filter(p => p.kind === 'stroke' && p.color === '#2962FF');
        expect(boxStrokes).toHaveLength(4);
        for (let lane = 0; lane < 4; lane++) {
          const line = lines.find(p => p.points[0].y === 100 - (15 + 22 * lane))!;
          expect(line).toBeDefined();
          expect(bounds(line)).toEqual([lane === 1 || lane === 3 ? 0 : projectedX(bars, -75), 85 - 22 * lane, lane >= 2 ? 1000 : projectedX(bars, -35), 85 - 22 * lane]);
          expect(line.width).toBe(4);
          expect(line.dash.length > 0).toBe(lane === 1 || lane === 2);
          const box = boxStrokes.find(p => bounds(p)[1] === 100 - (24 + 22 * lane))!;
          expect(box).toBeDefined();
          const expected = [lane === 1 || lane === 3 ? 0 : projectedX(bars, -25), 76 - 22 * lane, lane >= 2 ? 1000 : projectedX(bars, -10), 80 - 22 * lane];
          bounds(box).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 10));
          expect(box.width).toBe(3);
          expect(box.dash.length > 0).toBe(lane % 2 === 1);
        }
        expect(lines.find(p => p.points[0].y === 63)!.dash[0]).toBeGreaterThan(lines.find(p => p.points[0].y === 41)!.dash[0]);
      });
    } else {
      it(`${entry.id}: original blue current band, empty static band and deleted right fill have positive parent controls`, async () => {
        const count = await original(entry);
        expect(count(620, y(48), 760, y(32), blue)).toBeGreaterThan(5000);
        expect(count(620, y(78), 760, y(62), blue)).toBe(0);
        expect(count(920, y(48), 1060, y(32), (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) > 30)).toBe(0);
        for (const value of [30, 50]) for (const x of [620, 920]) expect(count(x, y(value) - 1, x + 100, y(value) + 1, gray)).toBeGreaterThan(70);
      });
      for (const channel of ['web', 'native'] as const) it(`${entry.id} ${channel}: real painter replaces left fill, follows current parents and deletes the independent right replacement`, () => {
        const { paints, bars } = traceEntry(executeMisc(entry), channel, true);
        const fills = paints.filter(p => p.kind === 'fill');
        expect(fills).toHaveLength(1);
        expect(fills[0].color).toBe('#2962FF80');
        const parents = paints.filter(p => p.kind === 'stroke' && p.color === '#787B86');
        expect(parents).toHaveLength(4);
        const parentPairs = [-90, -40].map(start => [30, 50].map(value => {
          const parent = parents.find(p => Math.abs(bounds(p)[0] - projectedX(bars, start)) < 1e-9 && bounds(p)[1] === 100 - value);
          expect(parent).toBeDefined();
          expect(parent!.points).toHaveLength(2);
          for (const [endpoint, relative] of [start, start + 35].entries()) {
            expect(parent!.points[endpoint].x).toBeCloseTo(projectedX(bars, relative), 10);
            expect(parent!.points[endpoint].y).toBe(100 - value);
          }
          return parent!.points;
        }));
        const [firstParent, secondParent] = parentPairs[0];
        expect(fills[0].points).toHaveLength(4);
        const boundaryEdges = fills[0].points.flatMap((point, i, points) => [
          [point, points[(i + 1) % points.length]],
          [points[(i + 1) % points.length], point],
        ]);
        for (const edge of [
          firstParent,
          secondParent,
          [firstParent[0], secondParent[0]],
          [firstParent[1], secondParent[1]],
        ]) expect(boundaryEdges).toContainEqual(edge);
      });
    }
  }
});

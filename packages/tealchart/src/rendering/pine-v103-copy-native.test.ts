import { describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { raw } from '../../../tealscript/tests/fixtures/v102Fixture';
import { copy6 } from '../../../tealscript/tests/fixtures/v103Copy';
import { traceEntry } from '../test/v102Paint';
import type { CanvasContext } from './CanvasContext';
import type { ComputedPane } from '../types';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';

const blue = '#2962FF', red = '#F23645';
function independentCopyPatch(object: 'line' | 'box' | 'label') {
  const width = object === 'label' ? 100 : 84, height = object === 'line' ? 24 : object === 'box' ? 104 : 56;
  const canvas = createCanvas(width, height), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0F0F0F'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = blue; ctx.strokeStyle = blue;
  if (object === 'line') {
    ctx.lineWidth = 6; ctx.setLineDash([36, 24]);
    ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(72, 12); ctx.stroke();
  } else if (object === 'box') {
    ctx.fillStyle = '#FDD835'; ctx.fillRect(12, 12, 60, 80);
    ctx.lineWidth = 4; ctx.strokeRect(12, 12, 60, 80);
    ctx.font = '14px sans-serif'; ctx.fillStyle = blue;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('COPY', 42, 52);
  } else {
    // These local normal-font metrics instantiate the captured recipe, not native DPI.
    ctx.font = '12px sans-serif';
    const bodyWidth = ctx.measureText('COPY').width + 16;
    ctx.beginPath(); ctx.roundRect(50 - bodyWidth / 2, 17, bodyWidth, 22, 4); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('COPY', 50, 28);
  }
  return Buffer.from(ctx.getImageData(0, 0, width, height).data);
}
describe('v103 v6 copy: original PNG models through the real drawing painters', () => {
  it('original native PNG has identical readable copy/constructor patches for all three frozen facets', async () => {
    const image = await loadImage(raw(copy6.regions.originalPng.path));
    const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const patch = ([x1, y1, x2, y2]: number[]) => Buffer.from(ctx.getImageData(x1, y1, x2 - x1, y2 - y1).data);
    for (const facet of copy6.regions.facets) {
      const subject = facet.manualFinding.actualSubjectRegionsPx[0];
      const [control, source] = facet.manualFinding.actualControlRegionsPx;
      expect(patch(subject).equals(patch(control)), facet.facetId).toBe(true);
      expect(patch(subject).equals(patch(source)), `${facet.facetId} native source differs`).toBe(false);
      const family = copy6.regions.facets.indexOf(facet);
      const facts = [
        [{ color: 'blue', bounds: [2, 2, 92, 8] }],
        [{ color: 'yellow', bounds: [4, 4, 90, 43] }, { color: 'caption', bounds: [13, 15, 82, 34] }],
        [{ color: 'blue', bounds: [0, 1, 51, 26] }, { color: 'white', bounds: [10, 8, 41, 17] }],
      ][family];
      for (const [x1, y1, x2, y2] of [subject, control]) for (const fact of facts) {
        const w = x2 - x1, h = y2 - y1, pixels = ctx.getImageData(x1, y1, w, h).data;
        const occupied: { x: number; y: number }[] = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const n = (y * w + x) * 4, [r, g, b] = [pixels[n], pixels[n + 1], pixels[n + 2]];
          const blueInk = b > 100 && b > r * 1.8 && b > g * 1.25;
          const interior = x >= 6 && x < w - 6 && y >= 6 && y < h - 6;
          const selected = fact.color === 'white' ? Math.min(r, g, b) > 200
            : fact.color === 'yellow' ? r > 150 && g > 130 && b < 100
            : blueInk && (fact.color !== 'caption' || interior);
          if (selected) occupied.push({ x, y });
        }
        expect(occupied.length, `${facet.facetId} native ${fact.color} visible area`).toBeGreaterThan(0);
        expect([Math.min(...occupied.map(p => p.x)), Math.min(...occupied.map(p => p.y)),
          Math.max(...occupied.map(p => p.x)) + 1, Math.max(...occupied.map(p => p.y)) + 1],
        `${facet.facetId} native ${fact.color} occupied bounds`).toEqual(fact.bounds);
      }
    }
  });
  for (const channel of ['web', 'native'] as const) {
    const trace = () => traceEntry(copy6.replay, channel, true);
    for (const object of ['line', 'box', 'label'] as const) {
      it(`${channel}: entire painted ${object} copy matches its constructor at independent positions`, () => {
        const { result, bars } = copy6.replay;
        const width = 2048, height = 400;
        const canvas = createCanvas(width, height), context = canvas.getContext('2d');
        context.fillStyle = '#0F0F0F';
        context.fillRect(0, 0, width, height);
        const ctx = context as unknown as CanvasContext;
        // A dyadic viewport gives all original 2m anchors the same pixel phase.
        const viewport = { startTime: bars[0].time, endTime: bars[0].time + 512 * 120000, priceMin: 0, priceMax: 100 };
        expect(bars[bars.length - 1].time).toBeLessThan(viewport.endTime);
        const margins = { left: 0, right: 0, top: 0, bottom: 0 };
        const pane: ComputedPane = { id: 'study', type: 'indicator', indicatorIds: ['captured'], heightRatio: 1,
          fixedRange: true, yMin: 0, yMax: 100, top: 0, bottom: height, height };
        const drawings = result.drawings.map(drawing => ({ ...drawing, scriptId: 'captured' }));
        if (channel === 'web') {
          new TealScriptDrawingRenderer({ ctx, options: { ...DEFAULT_RENDER_OPTIONS, width }, margins, font: 'sans-serif',
            coordinateResolvers: {
              timeToX: time => (time - viewport.startTime) / (viewport.endTime - viewport.startTime) * width,
              valueToY: value => height - value * 4,
            },
            getTextWidth: (active, text, font) => { active.font = font; return active.measureText(text).width; },
          }).render(partitionTealScriptDrawings(drawings), bars, viewport, pane);
        } else {
          paintNativeTealScriptDrawings({ ctx, drawings, bars, viewport, panes: [pane], width, margins });
        }
        const anchor = copy6.rowSet.uniqueVisualAnchorRowOrdinal - copy6.startRowOrdinal;
        const projectX = (offset: number) => (bars[anchor + offset].time - viewport.startTime) / 120000 * 4;
        const patch = (role: 'source' | 'copy' | 'constructor') => {
          const offset = role === 'source' ? -90 : role === 'copy' ? -60 : -30;
          let left = projectX(offset) - 12, top = object === 'line' ? (role === 'source' ? 140 : 60) - 12 : 188;
          let patchWidth = 84, patchHeight = object === 'line' ? 24 : 104;
          if (object === 'label') {
            left = projectX(offset + 8) - 50;
            top = 324; patchWidth = 100; patchHeight = 56;
          }
          expect(Number.isInteger(left)).toBe(true);
          return Buffer.from(context.getImageData(left, top, patchWidth, patchHeight).data);
        };
        const copied = patch('copy'), constructor = patch('constructor'), source = patch('source');
        const background = Buffer.from([15, 15, 15, 255]);
        expect(copied.some((value, index) => value !== background[index % 4]), `${object} copy paints visible content`).toBe(true);
        expect(constructor.some((value, index) => value !== background[index % 4]), `${object} constructor paints visible content`).toBe(true);
        expect(copied.equals(constructor), `${object} copy/control full RGBA patches at their own anchors`).toBe(true);
        expect(copied.equals(source), `${object} source mutation changes its painted appearance`).toBe(false);
        const independent = independentCopyPatch(object);
        expect(copied.equals(independent), `${object} copy independently retains the native-observed body, border and caption`).toBe(true);
        expect(constructor.equals(independent), `${object} constructor independently retains the native-observed body, border and caption`).toBe(true);
      });
    }
    const x = (offset: number) => {
      const { bars } = copy6.replay;
      const anchor = copy6.rowSet.uniqueVisualAnchorRowOrdinal - copy6.startRowOrdinal;
      return (bars[anchor + offset].time - bars[0].time) / (bars[bars.length - 1].time - bars[0].time) * 1000;
    };
    it(`${channel}: independent blue6 dashed copy matches constructor; source is thin red dotted at65`, () => {
      expect(copy6.regions.facets[0]).toMatchObject({ outcome: 'SUPPORTED_A', frozenModels: { A: 'independent copy retains blue6 dashed y85' } });
      const { paints } = trace();
      const lines = paints.filter(p => p.kind === 'stroke' && p.points.length === 2);
      expect(lines).toHaveLength(3);
      const constructor = lines.find(p => p.points[0].x === x(-30))!;
      for (const offset of [-60, -30]) {
        const line = lines.find(p => p.points[0].x === x(offset));
        expect(line).toMatchObject({ color: blue, width: 6 });
        expect(line!.dash.length).toBeGreaterThan(0);
        expect(line!.dash).toEqual(constructor.dash);
        expect(line!.dash).toHaveLength(2);
        expect(line!.dash.every(value => value > 0)).toBe(true);
        expect(line!.dash[0]).toBeGreaterThan(line!.dash[1]);
        expect(line!.points).toEqual([{ x: x(offset), y: 15 }, { x: x(offset + 15), y: 15 }]);
      }
      const source = lines.find(p => p.points[0].x === x(-90));
      expect(source).toMatchObject({ color: red, width: 2 });
      expect(source!.points.every(p => p.y === 35)).toBe(true);
      expect(source!.points).toEqual([{ x: x(-90), y: 35 }, { x: x(-75), y: 35 }]);
      expect(source!.dash.length).toBeGreaterThan(0);
      expect(source!.dash).not.toEqual(lines.find(p => p.points[0].x === x(-60))!.dash);
      expect(source!.dash).toHaveLength(2);
      expect(source!.dash.every(value => value > 0)).toBe(true);
      expect(source!.dash[0]).toBeLessThan(source!.dash[1]);
    });
    it(`${channel}: yellow fill, solid thick blue border and blue COPY text survive source mutations`, () => {
      expect(copy6.regions.facets[1]).toMatchObject({ outcome: 'SUPPORTED_A', frozenModels: { A: 'copy retains yellow/blue solid and blue COPY' } });
      const { paints, texts } = trace();
      for (const offset of [-60, -30]) {
        const fills = paints.filter(p => p.kind === 'fill' && p.points[0]?.x === x(offset) && p.points[0]?.y === 50);
        expect(fills.some(p => p.color === '#FDD835')).toBe(true);
        const border = paints.find(p => p.kind === 'stroke' && p.points[0]?.x === x(offset) && p.points[0]?.y === 50);
        expect(border).toMatchObject({ color: blue, width: 4, dash: [] });
      }
      const copies = texts.filter(t => t.text === 'COPY' && t.y > 50 && t.y < 70);
      expect(copies).toHaveLength(2); expect(copies.every(t => t.color === blue)).toBe(true);
      expect(texts.find(t => t.text === 'SRC' && t.y > 50 && t.y < 70)?.color).toBe(red);
      const boxTexts = texts.filter(t => t.y > 50 && t.y < 70);
      expect(boxTexts).toHaveLength(3);
      const constructorCenterX = x(-30) + (x(-15) - x(-30)) / 2;
      const constructorText = boxTexts.find(t => t.x === constructorCenterX)!;
      expect(constructorText).toBeDefined();
      expect(constructorText.font).not.toBe('');
      for (const [offset, text, color] of [[-90, 'SRC', red], [-60, 'COPY', blue], [-30, 'COPY', blue]] as const) {
        const centerX = x(offset) + (x(offset + 15) - x(offset)) / 2;
        const atBox = boxTexts.filter(t => t.x > x(offset) && t.x < x(offset + 15));
        expect(atBox, `box at ${offset}`).toEqual([
          expect.objectContaining({ text, color, x: centerX, y: 60, textAlign: 'center', textBaseline: 'middle' }),
        ]);
        expect(atBox[0].font, `box font at ${offset}`).toBe(constructorText.font);
      }
      expect(paints.find(p => p.kind === 'stroke' && p.points[0]?.x === x(-90) && p.points[0]?.y === 50)).toMatchObject({ color: blue, width: 4, dash: [24, 16] });
      expect(paints.some(p => p.kind === 'fill' && p.color === '#00BCD4' && p.points[0]?.x === x(-90))).toBe(true);
    });
    it(`${channel}: blue center label and white COPY text match constructor, independently of red square SRC`, () => {
      expect(copy6.regions.facets[2]).toMatchObject({ outcome: 'SUPPORTED_A', frozenModels: { A: 'blue center COPY body' } });
      const { paints, texts, bodies: paths, result } = trace();
      const labels = result.drawings.filter(d => d.type === 'label');
      expect(labels).toHaveLength(3);
      expect(labels[0]).toMatchObject({ style: 'square', color: red, text: 'SRC' });
      for (const label of labels.slice(1)) expect(label).toMatchObject({ style: 'label_center', color: blue, textColor: '#FFFFFF', text: 'COPY', size: 'normal' });
      const bodies = paints.filter(p => p.kind === 'fill' && p.color === blue && p.points.some(p => p.y > 75));
      expect(bodies).toHaveLength(2);
      expect(paths.filter(p => p.shape === 'roundRect' && p.color === blue)).toHaveLength(2);
      expect(paths.filter(p => p.shape === 'rect' && p.color === red)).toHaveLength(1);
      const copies = texts.filter(t => t.text === 'COPY' && t.y > 75);
      expect(copies).toHaveLength(2); expect(copies.every(t => t.color === '#FFFFFF')).toBe(true);
      expect(copies[0].font).toBe(copies[1].font);
      expect(paints.some(p => p.kind === 'fill' && p.color === red && p.points.some(p => p.y > 75))).toBe(true);
      const labelBodies = paths.filter(p => p.points.some(point => point.y > 75));
      const labelTexts = texts.filter(t => t.y > 70);
      expect(labelBodies).toHaveLength(3);
      expect(labelTexts).toHaveLength(3);
      const constructorText = labelTexts.find(t => t.x === x(-22) && t.y === 88)!;
      expect(constructorText).toBeDefined();
      expect(constructorText.font).not.toBe('');
      for (const [offset, shape, color, text, textAlign] of [
        [-82, 'rect', red, 'SRC', 'left'],
        [-52, 'roundRect', blue, 'COPY', 'center'],
        [-22, 'roundRect', blue, 'COPY', 'center'],
      ] as const) {
        const atLabel = labelBodies.filter(body => body.points[0].x < x(offset) && body.points[1].x > x(offset));
        expect(atLabel, `label body at ${offset}`).toEqual([expect.objectContaining({ shape, color })]);
        const points = atLabel[0].points;
        expect(points[0].x + (points[1].x - points[0].x) / 2).toBe(x(offset));
        expect(points[0].y + (points[2].y - points[0].y) / 2).toBe(88);
        const atText = labelTexts.filter(t => t.x > x(offset - 15) && t.x < x(offset + 15));
        expect(atText, `label text at ${offset}`).toEqual([
          expect.objectContaining({ text, color: '#FFFFFF', textAlign, textBaseline: 'middle' }),
        ]);
        if (text === 'COPY') expect(atText[0]).toMatchObject({ x: x(offset), y: 88, font: constructorText.font });
      }
    });
  }
});

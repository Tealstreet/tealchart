import { describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { raw } from '../../../tealscript/tests/fixtures/v102Fixture';
import { copy6 } from '../../../tealscript/tests/fixtures/v103Copy';
import { traceEntry } from '../test/v102Paint';

const blue = '#2962FF', red = '#F23645';
describe('v103 v6 copy: original PNG models through the real drawing painters', () => {
  it('original native PNG has identical readable copy/constructor patches for all three frozen facets', async () => {
    const image = await loadImage(raw(copy6.regions.originalPng.path));
    const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const patch = ([x1, y1, x2, y2]: number[]) => Buffer.from(ctx.getImageData(x1, y1, x2 - x1, y2 - y1).data);
    for (const facet of copy6.regions.facets) {
      const subject = facet.manualFinding.actualSubjectRegionsPx[0];
      const [control] = facet.manualFinding.actualControlRegionsPx;
      expect(patch(subject).equals(patch(control)), facet.facetId).toBe(true);
    }
  });
  for (const channel of ['web', 'native'] as const) {
    const trace = () => traceEntry(copy6.replay, channel, true);
    const x = (offset: number) => {
      const { bars } = copy6.replay;
      const anchor = copy6.rowSet.uniqueVisualAnchorRowOrdinal - copy6.startRowOrdinal;
      return (bars[anchor + offset].time - bars[0].time) / (bars[bars.length - 1].time - bars[0].time) * 1000;
    };
    it(`${channel}: independent blue6 dashed copy matches constructor; source is thin red dotted at65`, () => {
      expect(copy6.regions.facets[0]).toMatchObject({ outcome: 'SUPPORTED_A', frozenModels: { A: 'independent copy retains blue6 dashed y85' } });
      const { paints } = trace();
      const lines = paints.filter(p => p.kind === 'stroke' && p.points.length === 2);
      for (const offset of [-60, -30]) {
        const line = lines.find(p => p.points[0].x === x(offset));
        expect(line).toMatchObject({ color: blue, width: 6 });
        expect(line!.dash.length).toBeGreaterThan(0);
        expect(line!.points).toEqual([{ x: x(offset), y: 15 }, { x: x(offset + 15), y: 15 }]);
      }
      const source = lines.find(p => p.points[0].x === x(-90));
      expect(source).toMatchObject({ color: red, width: 2 });
      expect(source!.points.every(p => p.y === 35)).toBe(true);
      expect(source!.dash.length).toBeGreaterThan(0);
      expect(source!.dash).not.toEqual(lines.find(p => p.points[0].x === x(-60))!.dash);
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
      for (const [offset, text, color] of [[-90, 'SRC', red], [-60, 'COPY', blue], [-30, 'COPY', blue]] as const) {
        const centerX = x(offset) + (x(offset + 15) - x(offset)) / 2;
        const atBox = boxTexts.filter(t => t.x > x(offset) && t.x < x(offset + 15));
        expect(atBox, `box at ${offset}`).toEqual([
          expect.objectContaining({ text, color, x: centerX, y: 60 }),
        ]);
      }
      expect(paints.find(p => p.kind === 'stroke' && p.points[0]?.x === x(-90) && p.points[0]?.y === 50)).toMatchObject({ color: blue, width: 4, dash: [6, 4] });
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
      for (const [offset, shape, color, text] of [
        [-82, 'rect', red, 'SRC'],
        [-52, 'roundRect', blue, 'COPY'],
        [-22, 'roundRect', blue, 'COPY'],
      ] as const) {
        const atLabel = labelBodies.filter(body => body.points[0].x < x(offset) && body.points[1].x > x(offset));
        expect(atLabel, `label body at ${offset}`).toEqual([expect.objectContaining({ shape, color })]);
        const points = atLabel[0].points;
        expect(points[0].x + (points[1].x - points[0].x) / 2).toBe(x(offset));
        expect(points[0].y + (points[2].y - points[0].y) / 2).toBe(88);
        const atText = labelTexts.filter(t => t.x > x(offset - 15) && t.x < x(offset + 15));
        expect(atText, `label text at ${offset}`).toEqual([
          expect.objectContaining({ text, color: '#FFFFFF' }),
        ]);
        if (text === 'COPY') expect(atText[0]).toMatchObject({ x: x(offset), y: 88 });
      }
    });
  }
});

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it, vi } from 'vitest';

import { arrowEntry as e, certificate } from '../../../tealscript/tests/fixtures/v104Arrow';
import { raw } from '../../../tealscript/tests/fixtures/v104Fixture';
import { stylePaintGlyphs, traceStyles, type StylePaint } from '../test/v103StylesPaint';

vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: <T,>(factory: () => T) => factory() }));

function inkRows(paint: StylePaint) {
  const points = paint.commands.filter(c => c.op !== 'Z');
  const left = Math.floor(Math.min(...points.map(c => c.x))) - 2;
  const top = Math.floor(Math.min(...points.map(c => c.y))) - 2;
  const width = Math.ceil(Math.max(...points.map(c => c.x))) - left + 3;
  const height = Math.ceil(Math.max(...points.map(c => c.y))) - top + 3;
  const ctx = createCanvas(width, height).getContext('2d');
  ctx.translate(-left, -top);
  ctx.fillStyle = paint.color;
  ctx.globalAlpha = paint.globalAlpha ?? 1;
  ctx.beginPath();
  for (const c of paint.commands) {
    if (c.op === 'M') ctx.moveTo(c.x, c.y);
    else if (c.op === 'L') ctx.lineTo(c.x, c.y);
    else if (c.op === 'Z') ctx.closePath();
  }
  ctx.fill();
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const rows = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => rgba[(y * width + x) * 4 + 3])
    .filter(a => a > 0).length);
  return rows.slice(rows.findIndex(w => w > 0), rows.findLastIndex(w => w > 0) + 1);
}

it('independently reads original PNG head/shaft widths at each certified own-sign arrow', async () => {
  const image = await loadImage(raw(certificate.originalPng.path));
  const ctx = createCanvas(image.width, image.height).getContext('2d');
  ctx.drawImage(image, 0, 0);
  for (const arrow of certificate.arrows) {
    const x = arrow.observedCenterXPx;
    const [top, bottom] = arrow.bodyYInclusivePx;
    const rgba = ctx.getImageData(x - 12, top, 25, bottom - top + 1).data;
    const widths = Array.from({ length: bottom - top + 1 }, (_, y) => Array.from({ length: 25 }, (_, col) => {
      const i = (y * 25 + col) * 4;
      return arrow.sign > 0 ? rgba[i + 2] > 200 && rgba[i] < 80 : rgba[i] > 220 && rgba[i + 1] > 100 && rgba[i + 2] < 80;
    }).filter(Boolean).length);
    const tipFirst = arrow.sign > 0 ? widths : [...widths].reverse();
    expect(tipFirst.slice(0, 6)).toEqual(arrow.outwardTipWidthsPx);
    expect(Math.max(...tipFirst.slice(0, 12))).toBeGreaterThan(Math.max(...tipFirst.slice(-12)));
    expect(tipFirst.slice(-30, -4).every(w => w > 0)).toBe(true);
    expect(Number(e.csv.raw(arrow.signCell.rowOrdinal, 'SIGN'))).toBe(arrow.sign);
    expect(Number(e.csv.raw(arrow.inputIndex.rowOrdinal, 'INPUT_INDEX'))).toBe(arrow.sourceOwnIndex);
  }
});

for (const channel of ['web', 'web-pane', 'web-unified', 'native', 'native-static'] as const) {
  describe(`v104 own arrow identity through ${channel}`, () => {
    for (const arrow of certificate.arrows) it(`${arrow.objectId}: own-sign tip, shoulders, shaft, candle anchor and positive ink`, () => {
      const trace = traceStyles(e, channel);
      const hex = arrow.sign > 0 ? '#2962ff' : '#ff9800';
      const glyphs = trace.paints.filter(p => p.kind === 'fill' && p.color.slice(0, 7).toLowerCase() === hex).flatMap(stylePaintGlyphs);
      const rows = Array.from({ length: e.anchor - e.first + 1 }, (_, i) => e.first + i)
        .filter(r => Number(e.csv.raw(r, 'INPUT_INDEX')) % 32 === arrow.phase);
      expect(glyphs).toHaveLength(rows.length);
      for (const row of rows) {
        const x = trace.x(row);
        const matches = glyphs.filter(g => {
          const xs = g.commands.filter(c => c.op !== 'Z').map(c => c.x);
          return Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - x) < 1e-8;
        });
        expect(matches, `own row ${row}`).toHaveLength(1);
        const glyph = matches[0], points = glyph.commands.filter(c => c.op !== 'Z');
        expect(glyph.commands.at(-1)?.op).toBe('Z');
        const ys = points.map(c => c.y), top = Math.min(...ys), bottom = Math.max(...ys);
        const bar = trace.bars[row - e.first];
        const anchor = (trace.viewport.priceMax - (arrow.sign > 0 ? bar.low : bar.high)) / (trace.viewport.priceMax - trace.viewport.priceMin) * trace.height;
        expect((top + bottom) / 2).toBeCloseTo(anchor + arrow.sign * (bottom - top + 4), 8);
        if (arrow.sign > 0) expect(top).toBeGreaterThan(anchor); else expect(bottom).toBeLessThan(anchor);
        const tipY = arrow.sign > 0 ? top : bottom;
        expect(points.filter(p => p.y === tipY)).toEqual([expect.objectContaining({ x, y: tipY })]);
        const widths = inkRows(glyph);
        expect(widths.length).toBeGreaterThan(10);
        expect(widths.every(w => w > 0)).toBe(true);
        const tipFirst = arrow.sign > 0 ? widths : [...widths].reverse();
        const quarter = Math.ceil(tipFirst.length / 4);
        expect(Math.max(...tipFirst.slice(0, quarter))).toBeGreaterThan(Math.max(...tipFirst.slice(-quarter)));
        expect(tipFirst[0]).toBeLessThan(Math.max(...tipFirst));
        expect(tipFirst.slice(-quarter).every(w => w > 0)).toBe(true);
      }
    });
    it('retains each U/D control at its own phase, sign and candle side', () => {
      const trace = traceStyles(e, channel);
      for (const arrow of certificate.arrows) {
        const texts = trace.paints.filter(p => p.kind === 'text' && p.commands[0].text === arrow.control.literal);
        const rows = Array.from({ length: e.anchor - e.first + 1 }, (_, i) => e.first + i)
          .filter(r => Number(e.csv.raw(r, 'INPUT_INDEX')) % 32 === arrow.control.phase);
        expect(texts).toHaveLength(rows.length);
        for (const row of rows) {
          const match = texts.filter(p => Math.abs((p.commands[0].anchorX ?? p.commands[0].x) - trace.x(row)) < 1e-8);
          expect(match).toHaveLength(1);
          expect(match[0].globalAlpha).toBeGreaterThan(0);
          expect(match[0].color.slice(0, 7).toLowerCase()).toBe(arrow.sign > 0 ? '#2962ff' : '#ff9800');
          const bar = trace.bars[row - e.first];
          const candle = (trace.viewport.priceMax - (arrow.sign > 0 ? bar.high : bar.low)) / (trace.viewport.priceMax - trace.viewport.priceMin) * trace.height;
          const y = match[0].commands[0].anchorY ?? match[0].commands[0].y;
          expect((y - candle) * arrow.sign).toBeLessThan(0);
        }
      }
    });
  });
}

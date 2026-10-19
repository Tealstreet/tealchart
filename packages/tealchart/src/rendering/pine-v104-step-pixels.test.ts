// @vitest-environment node
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { bound, entries } from '../../../tealscript/tests/fixtures/v104Step';

function rgbSamples(png: Buffer) {
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  expect([...png.subarray(24, 29)]).toEqual([8, 2, 0, 0, 0]);
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const filtered = inflateSync(Buffer.concat(chunks)), stride = width * 3;
  expect(filtered.length).toBe(height * (stride + 1));
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = filtered[y * (stride + 1)];
    expect(filter).toBeLessThanOrEqual(4);
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x;
      const left = x >= 3 ? pixels[at - 3] : 0, up = y ? pixels[at - stride] : 0;
      const corner = x >= 3 && y ? pixels[at - stride - 3] : 0;
      const predictor = left + up - corner;
      const dl = Math.abs(predictor - left), du = Math.abs(predictor - up), dc = Math.abs(predictor - corner);
      const paeth = dl <= du && dl <= dc ? left : du <= dc ? up : corner;
      const addition = [0, left, up, Math.floor((left + up) / 2), paeth][filter];
      pixels[at] = (filtered[y * (stride + 1) + x + 1] + addition) & 255;
    }
  }
  return (x: number, y: number) => [...pixels.subarray((y * width + x) * 3, (y * width + x) * 3 + 3)];
}

for (const entry of entries) describe(`${entry.id} raw original PNG, no ICC transformation`, () => {
  it('independently decodes both blue arms/verticals and the separate red ruler portions', () => {
    const sample = rgbSamples(bound(entry.regions.originalPng));
    for (const axis of ['row', 'column'] as const) for (const profile of entry.pixels[`${axis}Profiles`]) {
      for (const run of profile.runs) for (let i = run.first; i <= run.last; i++) {
        expect(sample(axis === 'row' ? i : profile.xPx, axis === 'row' ? profile.yPx : i)).toEqual(run.sample);
      }
    }
    const blue = [26, 97, 248], red = entry.version === 5 ? [255, 69, 77] : [248, 43, 64];
    for (const transition of entry.certificate.transitions) {
      const turn = transition.observedTurnXPx, ruler = transition.observedRulerXPx;
      expect(sample(turn, 780)).toEqual(blue);
      expect(sample(ruler, 700)).toEqual(red);
      expect(sample(ruler, 860)).toEqual(red);
      const up = transition.phase === 8;
      expect(sample(turn - 5, up ? 841 : 721)).toEqual(blue);
      expect(sample(turn + 5, up ? 721 : 841)).toEqual(blue);
      expect(sample(turn - 5, up ? 721 : 841)).not.toEqual(blue);
      expect(sample(turn + 5, up ? 841 : 721)).not.toEqual(blue);
      expect(ruler - turn).toBe(entry.version === 5 ? 10 : 11);
    }
  });
});

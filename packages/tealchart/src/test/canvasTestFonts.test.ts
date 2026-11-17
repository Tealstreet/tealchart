// @vitest-environment node
import './canvasTestFonts';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { expect, it } from 'vitest';

it.each(['sans-serif', 'monospace'])('resolves and paints the generic %s fixture recipe', (family) => {
  expect(GlobalFonts.has(family), `explicit fixture font alias ${family}`).toBe(true);
  const canvas = createCanvas(120, 40);
  const ctx = canvas.getContext('2d');
  ctx.font = `20px ${family}`;
  expect(ctx.measureText('EDGE').width).toBeGreaterThan(0);
  ctx.fillStyle = '#2962ff';
  ctx.fillText('EDGE', 5, 25);
  const rgba = ctx.getImageData(0, 0, 120, 40).data;
  expect(Array.from(rgba).some((alpha, index) => index % 4 === 3 && alpha > 0)).toBe(true);
});

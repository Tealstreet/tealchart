// @vitest-environment node
import type { SkCanvas, SkFont } from '@shopify/react-native-skia';
import type { PixelFrame } from '../test/v104GlyphPaint';

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { matchFont } from '@shopify/react-native-skia';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { entry, json } from '../../../tealscript/tests/fixtures/v104Glyph';
import { createNativeDrawingContext } from '../mobile/render/nativeDrawingContext';
import { createNativeDrawingFonts } from '../mobile/render/nativeDrawingFonts';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { glyphScene, nativeGlyphPixels, paintGlyph } from '../test/v104GlyphPaint';

function registerFamilies() {
  expect(GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'sans-serif')).toBeTruthy();
  expect(GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 'monospace')).toBeTruthy();
}
function registerHostFamilies() {
  const families = [
    ['monospace', 'DejaVu Sans Mono', 'Liberation Mono', 'Menlo', 'Courier New'],
    ['sans-serif', 'DejaVu Sans', 'Liberation Sans', 'Arial', 'Helvetica'],
  ];
  for (const [alias, ...candidates] of families) {
    const family = candidates.find((name) => GlobalFonts.has(name));
    expect(family, `installed host family for ${alias}`).toBeDefined();
    expect(GlobalFonts.setAlias(family!, alias)).toBe(true);
  }
}
beforeAll(registerHostFamilies);
const slots = [
  { text: 'IIIIIIII', delta: -26, value: 80, font: '18px monospace' },
  { text: 'WWWWWWWW', delta: -8, value: 80, font: '18px monospace' },
  { text: 'IIIIIIII', delta: -26, value: 35, font: '18px sans-serif' },
  { text: 'WWWWWWWW', delta: -8, value: 35, font: '18px sans-serif' },
];
const windows = [
  [330, 683, 530, 760],
  [670, 683, 910, 760],
  [330, 775, 530, 855],
  [670, 775, 910, 855],
];
function body(frame: PixelFrame, rect: number[]) {
  const xs: number[] = [],
    ys: number[] = [];
  let ink = 0;
  for (let y = rect[1]; y < rect[3]; y++)
    for (let x = rect[0]; x < rect[2]; x++) {
      const [r, g, b, a] = frame.pixels.slice((y * frame.width + x) * 4, (y * frame.width + x) * 4 + 4);
      if (a > 128 && b > 150 && b > r * 1.4 && b > g * 1.15) {
        xs.push(x);
        ys.push(y);
      }
      if (a > 128 && r > 200 && g > 200 && b > 200) ink++;
    }
  expect(xs.length, 'opaque blue body at its own native position').toBeGreaterThan(100);
  expect(ink, 'readable white glyphs at the same position').toBeGreaterThan(20);
  return { width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 };
}
function expectedPlate() {
  const { width, height } = entry.regions.originalDimensionsPx;
  const canvas = createCanvas(width, height),
    ctx = canvas.getContext('2d');
  const axis = json(entry.regions.manualInspection.path).axisCalibration;
  const { anchorXPx, pixelsPerOwnBar } = entry.regions.registration;
  for (const slot of slots) {
    const x = anchorXPx + slot.delta * pixelsPerOwnBar;
    const y = axis.yZeroPx - (slot.value * (axis.yZeroPx - axis.yHundredPx)) / 100;
    ctx.font = slot.font;
    const width = ctx.measureText(slot.text).width + 16;
    ctx.fillStyle = '#2962ff';
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 11, width, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slot.text, x, y);
  }
  return ctx.getImageData(0, 0, width, height).data;
}
function assertPaint(channel: 'web' | 'native') {
  const paint = paintGlyph(entry, channel);
  const axis = json(entry.regions.manualInspection.path).axisCalibration;
  expect(paint.texts).toHaveLength(4);
  for (const [i, slot] of slots.entries()) {
    const rect = windows[i];
    const texts = paint.texts.filter((t) => t.x >= rect[0] && t.x < rect[2] && t.y >= rect[1] && t.y < rect[3]);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toMatchObject({
      text: slot.text,
      font: slot.font,
      align: 'center',
      baseline: 'middle',
      color: '#FFFFFF',
      alpha: 1,
    });
    expect(texts[0].x).toBeCloseTo(
      entry.regions.registration.anchorXPx + slot.delta * entry.regions.registration.pixelsPerOwnBar,
      6,
    );
    expect(texts[0].y).toBeCloseTo(axis.yZeroPx - (slot.value * (axis.yZeroPx - axis.yHundredPx)) / 100, 10);
  }
  const bodies = windows.map((rect) => body(paint, rect));
  expect(Math.abs(bodies[0].width - bodies[1].width)).toBeLessThanOrEqual(2);
  expect(bodies[3].width - bodies[2].width).toBeGreaterThan(30);
  for (const b of bodies) expect(b.height).toBeGreaterThan(18);
  // This independent local primitive reference binds whole RGBA, never native font metrics.
  const reference = expectedPlate();
  const differences = paint.pixels.reduce((n, value, index) => n + Number(value !== reference[index]), 0);
  expect(differences, `${channel} whole RGBA differs from independent primitive plate`).toBe(0);
}
describe('v104 finite relative glyph advance', () => {
  it('binds and inspects the original PNG with four readable isolated controls', async () => {
    const frame = await nativeGlyphPixels(entry);
    const facet = entry.regions.facets[0];
    expect(facet).toMatchObject({ outcome: 'SUPPORTED_A', modelBVerdict: 'REFUTED', notObservedCauses: [] });
    const finding = facet.manualFinding;
    const regions = [...finding.actualSubjectRegionsPx, ...finding.actualControlRegionsPx];
    expect(regions).toEqual([
      [375, 702, 487, 741],
      [739, 702, 852, 741],
      [401, 793, 461, 832],
      [715, 793, 876, 832],
    ]);
    const bodies = windows.map((rect) => body(frame, rect));
    expect(Math.abs(bodies[0].width - bodies[1].width)).toBeLessThanOrEqual(4);
    expect(bodies[3].width - bodies[2].width).toBeGreaterThan(90);
    expect(finding.visibleTextByRegion.map((v: { literal: string }) => v.literal)).toEqual(slots.map((s) => s.text));
    expect(json(entry.regions.manualInspection.path).inspectedOriginalPngSha256).toBe(entry.regions.originalPng.sha256);
    expect(entry.regions.exposedAppearanceMetadata).toMatchObject({ resolvedFont: null, dpi: null, zoom: null });
  });
  for (const channel of ['web', 'native'] as const)
    it(`${channel}: binds each body, text, font and anchor to its own complete RGBA plate`, () => assertPaint(channel));
  it('native: routes each caption through its own prepared Skia font object', () => {
    const scene = glyphScene(entry);
    const template = matchFont({ fontSize: 18 });
    const descriptors = new Map<SkFont, Parameters<typeof matchFont>[0]>();
    vi.mocked(matchFont).mockImplementation((descriptor) => {
      const font = { ...template };
      descriptors.set(font, descriptor);
      return font;
    });
    const fonts = createNativeDrawingFonts(scene.drawings);
    expect(Object.keys(fonts)).toEqual(['18px monospace', '18px sans-serif']);
    expect(descriptors.get(fonts['18px monospace'])).toMatchObject({ fontSize: 18, fontFamily: 'Menlo' });
    expect(descriptors.get(fonts['18px sans-serif'])?.fontFamily).toBeUndefined();
    const drawText = vi.fn();
    const canvas = Object.fromEntries(
      ['save', 'restore', 'clipPath', 'drawPath', 'drawRect'].map((name) => [name, vi.fn()]),
    );
    const ctx = createNativeDrawingContext({ ...canvas, drawText } as unknown as SkCanvas, fonts);
    paintNativeTealScriptDrawings({
      ctx,
      drawings: scene.drawings,
      bars: scene.bars,
      viewport: scene.viewport,
      panes: [scene.pane],
      width: scene.nativeWidth,
      margins: scene.margins,
    });
    expect(drawText).toHaveBeenCalledTimes(4);
    for (const [i, slot] of slots.entries()) {
      const rect = windows[i];
      const calls = drawText.mock.calls.filter(
        ([, x, y]) => x >= rect[0] && x < rect[2] && y >= rect[1] && y < rect[3],
      );
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe(slot.text);
      expect(calls[0][4]).toBe(fonts[slot.font]);
    }
  });
  it.skipIf(process.platform !== 'linux')(
    'keeps both painters invariant under a DejaVu-only CI font environment',
    () => {
      const fonts = GlobalFonts.families;
      GlobalFonts.removeAll();
      try {
        registerFamilies();
        expect(GlobalFonts.families.map((f) => f.family).sort()).toEqual([
          'DejaVu Sans',
          'DejaVu Sans Mono',
          'monospace',
          'sans-serif',
        ]);
        assertPaint('web');
        assertPaint('native');
      } finally {
        GlobalFonts.removeAll();
        GlobalFonts.loadFontsFromDir('/usr/share/fonts');
        registerHostFamilies();
        expect(fonts.length).toBeGreaterThan(0);
      }
    },
  );
});

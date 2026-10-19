import type { entry } from '../../../tealscript/tests/fixtures/v104Glyph';
import type { CanvasContext } from '../rendering/CanvasContext';
import type { ComputedPane } from '../types';

import { createCanvas, loadImage } from '@napi-rs/canvas';

import { executeGlyph, json, raw } from '../../../tealscript/tests/fixtures/v104Glyph';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { partitionTealScriptDrawings } from '../rendering/TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from '../rendering/TealScriptDrawingRenderer';
import { DEFAULT_RENDER_OPTIONS } from '../types';

type GlyphEntry = typeof entry;

export type PixelFrame = { width: number; height: number; pixels: Uint8ClampedArray };
export type TextPaint = {
  text: string;
  x: number;
  y: number;
  font: string;
  align: string;
  baseline: string;
  color: string;
  alpha: number;
};
export async function nativeGlyphPixels(entry: GlyphEntry): Promise<PixelFrame> {
  const image = await loadImage(raw(entry.regions.originalPng.path));
  const canvas = createCanvas(image.width, image.height),
    ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return { width: image.width, height: image.height, pixels: ctx.getImageData(0, 0, image.width, image.height).data };
}
export function glyphScene(entry: GlyphEntry) {
  const replay = executeGlyph(),
    { regions } = entry;
  const { width, height } = regions.originalDimensionsPx;
  const { paneWidthPx, paneInteriorBoundsPx, pixelsPerOwnBar: scale, anchorXPx } = regions.registration;
  const calibration = json(regions.manualInspection.path).axisCalibration;
  const [left, top, , bottom] = paneInteriorBoundsPx;
  const valueScale = (calibration.yZeroPx - calibration.yHundredPx) / 100;
  const pane: ComputedPane = {
    id: 'study',
    type: 'indicator',
    indicatorIds: ['captured'],
    heightRatio: 1,
    fixedRange: true,
    yMin: (calibration.yZeroPx - bottom) / valueScale,
    yMax: (calibration.yZeroPx - top) / valueScale,
    top,
    bottom,
    height: bottom - top,
  };
  const margins = { left, right: 0, top: 0, bottom: 0 };
  const { bars } = replay,
    lastTime = bars[bars.length - 1].time;
  const startTime = lastTime - ((anchorXPx - left) / scale) * 120_000;
  const viewport = {
    startTime,
    endTime: startTime + (paneWidthPx / scale) * 120_000,
    priceMin: pane.yMin,
    priceMax: pane.yMax,
  };
  const drawings = replay.result.drawings.map((d) => ({ ...d, scriptId: 'captured' }));
  return {
    ...replay,
    width,
    height,
    left,
    scale,
    valueScale,
    calibration,
    pane,
    margins,
    viewport,
    drawings,
    paneWidthPx,
    nativeWidth: left + paneWidthPx,
  };
}
export function paintGlyph(entry: GlyphEntry, channel: 'web' | 'native') {
  const scene = glyphScene(entry);
  const {
    width,
    height,
    left,
    scale,
    valueScale,
    calibration,
    pane,
    margins,
    viewport,
    drawings,
    paneWidthPx,
    nativeWidth,
    bars,
  } = scene;
  const { startTime } = viewport;
  const canvas = createCanvas(width, height),
    active = canvas.getContext('2d');
  const texts: TextPaint[] = [];
  const ctx = new Proxy(active, {
    get(target, property) {
      if (property === 'fillText')
        return (text: string, x: number, y: number) => {
          texts.push({
            text,
            x,
            y,
            font: target.font,
            align: target.textAlign,
            baseline: target.textBaseline,
            color: String(target.fillStyle),
            alpha: target.globalAlpha,
          });
          target.fillText(text, x, y);
        };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) {
      return Reflect.set(target, property, value, target);
    },
  }) as unknown as CanvasContext;
  if (channel === 'web')
    new TealScriptDrawingRenderer({
      ctx,
      options: { ...DEFAULT_RENDER_OPTIONS, width: paneWidthPx },
      margins,
      font: 'sans-serif',
      coordinateResolvers: {
        timeToX: (t) => left + ((t - startTime) / 120_000) * scale,
        valueToY: (v) => calibration.yZeroPx - v * valueScale,
      },
      getTextWidth: (context, text, font) => {
        context.font = font;
        return context.measureText(text).width;
      },
    }).render(partitionTealScriptDrawings(drawings), bars, viewport, pane);
  else paintNativeTealScriptDrawings({ ctx, drawings, bars, viewport, panes: [pane], width: nativeWidth, margins });
  return { ...scene, texts, width, height, pixels: active.getImageData(0, 0, width, height).data };
}

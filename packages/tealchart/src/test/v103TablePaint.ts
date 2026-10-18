import type { CanvasContext } from '../rendering/CanvasContext';
import type { ComputedPane } from '../types';
import type { TableEntry } from '../../../tealscript/tests/fixtures/v103Table';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { executeTable, raw } from '../../../tealscript/tests/fixtures/v103Table';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { TealScriptDrawingRenderer } from '../rendering/TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from '../rendering/TealScriptDrawingPartition';
import { DEFAULT_RENDER_OPTIONS } from '../types';

export type PixelClass = 'red' | 'blue' | 'yellow' | 'aqua' | 'black';
export function colored(rgba: Uint8ClampedArray, offset: number, color: PixelClass) {
  const [r, g, b, a] = rgba.slice(offset, offset + 4);
  if (a < 128) return false;
  if (color === 'red') return r > 170 && r > g * 1.5 && r > b * 1.3;
  if (color === 'blue') return b > 170 && b > r * 1.5 && b > g * 1.2;
  if (color === 'yellow') return r > 170 && g > 150 && b < 120;
  if (color === 'aqua') return g > 120 && b > 120 && r < 100;
  return r < 100 && g < 100 && b < 100;
}
export function countClass(pixels: Uint8ClampedArray, width: number, rect: number[], color: PixelClass) {
  let count = 0;
  for (let y = Math.ceil(rect[1]); y < rect[3]; y++) for (let x = Math.ceil(rect[0]); x < rect[2]; x++) if (colored(pixels, (y * width + x) * 4, color)) count++;
  return count;
}
export async function nativeTablePixels(entry: TableEntry) {
  const image = await loadImage(raw(entry.regions.originalPng.path));
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return { width: image.width, height: image.height, pixels: ctx.getImageData(0, 0, image.width, image.height).data };
}
export function paintTable(entry: TableEntry, channel: 'web' | 'native') {
  const replay = executeTable(entry);
  const { paneWidthPx: width, paneHeightPx: height } = entry.regions.registration;
  const canvas = createCanvas(width, height);
  const active = canvas.getContext('2d');
  const rects: { kind: 'fill' | 'stroke'; color: string; width: number; x: number; y: number; w: number; h: number }[] = [];
  const texts: { text: string; x: number; y: number; bounds: number[] }[] = [];
  const ctx = new Proxy(active, {
    get(target, property) {
      if (property === 'fillRect' || property === 'strokeRect') return (x: number, y: number, w: number, h: number) => {
        const fill = property === 'fillRect';
        rects.push({ kind: fill ? 'fill' : 'stroke', color: String(fill ? target.fillStyle : target.strokeStyle), width: target.lineWidth, x, y, w, h });
        target[property](x, y, w, h);
      };
      if (property === 'fillText') return (text: string, x: number, y: number) => {
        const ink = target.measureText(text);
        texts.push({ text, x, y, bounds: [x - ink.actualBoundingBoxLeft, y - ink.actualBoundingBoxAscent,
          x + ink.actualBoundingBoxRight, y + ink.actualBoundingBoxDescent] });
        target.fillText(text, x, y);
      };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) { return Reflect.set(target, property, value, target); },
  }) as unknown as CanvasContext;
  const pane: ComputedPane = { id: 'study', type: 'indicator', indicatorIds: ['captured'], heightRatio: 1,
    fixedRange: true, yMin: 0, yMax: 100, top: 0, bottom: height, height };
  const margins = { left: 0, right: 0, top: 0, bottom: 0 };
  const { bars } = replay;
  const viewport = { startTime: bars[0].time, endTime: bars[bars.length - 1].time, priceMin: 0, priceMax: 100 };
  const drawings = replay.result.drawings.map(d => ({ ...d, scriptId: 'captured' }));
  if (channel === 'web') new TealScriptDrawingRenderer({ ctx, options: { ...DEFAULT_RENDER_OPTIONS, width }, margins,
    font: 'sans-serif', coordinateResolvers: { timeToX: t => (t - viewport.startTime) / (viewport.endTime - viewport.startTime) * width, valueToY: v => height * (1 - v / 100) },
    getTextWidth: (context, text, font) => { context.font = font; return context.measureText(text).width; },
  }).render(partitionTealScriptDrawings(drawings), bars, viewport, pane);
  else paintNativeTealScriptDrawings({ ctx, drawings, bars, viewport, panes: [pane], width, margins });
  return { ...replay, rects, texts, width, height, pixels: active.getImageData(0, 0, width, height).data };
}

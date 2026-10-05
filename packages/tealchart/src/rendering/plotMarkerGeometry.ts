export interface PlotMarkerGeometry {
  polygons: number[][][];
  lines: number[][][];
  boxes: { x: number; y: number; width: number; height: number; radius?: number }[];
  circle?: { x: number; y: number; radius: number };
  strokeWidth: number;
}

/** Canvas and Skia consume these same marker vertices and separate fill/stroke parts. */
export function getPlotMarkerGeometry(x: number, y: number, shape: string, size: number): PlotMarkerGeometry {
  'worklet';
  const half = size / 2;
  const geometry: PlotMarkerGeometry = { polygons: [], lines: [], boxes: [], strokeWidth: 2 };
  switch (shape) {
    case 'square':
      geometry.boxes.push({ x: x - half, y: y - half, width: size, height: size });
      break;
    case 'diamond':
      geometry.polygons.push([
        [x, y - half],
        [x + half, y],
        [x, y + half],
        [x - half, y],
      ]);
      break;
    case 'triangleup':
    case 'arrowup':
      geometry.polygons.push([
        [x, y - half],
        [x + half, y + half],
        [x - half, y + half],
      ]);
      break;
    case 'triangledown':
    case 'arrowdown':
      geometry.polygons.push([
        [x, y + half],
        [x + half, y - half],
        [x - half, y - half],
      ]);
      break;
    case 'cross':
      geometry.lines.push(
        [
          [x - half, y],
          [x + half, y],
        ],
        [
          [x, y - half],
          [x, y + half],
        ],
      );
      break;
    case 'xcross':
      geometry.lines.push(
        [
          [x - half, y - half],
          [x + half, y + half],
        ],
        [
          [x + half, y - half],
          [x - half, y + half],
        ],
      );
      break;
    case 'flag':
      geometry.strokeWidth = Math.max(1, size / 8);
      geometry.lines.push([
        [x - size / 3, y + half],
        [x - size / 3, y - half],
      ]);
      geometry.boxes.push({ x: x - size / 3, y: y - half, width: size * 0.8, height: size * 0.45 });
      break;
    case 'labelup':
    case 'labeldown':
      geometry.boxes.push({
        x: x - size * 0.7,
        y: y - size * 0.45,
        width: size * 1.4,
        height: size * 0.9,
        radius: Math.max(2, size * 0.15),
      });
      if (shape === 'labelup')
        geometry.polygons.push([
          [x, y + size * 0.65],
          [x - size * 0.25, y + size * 0.25],
          [x + size * 0.25, y + size * 0.25],
        ]);
      else
        geometry.polygons.push([
          [x, y - size * 0.65],
          [x - size * 0.25, y - size * 0.25],
          [x + size * 0.25, y - size * 0.25],
        ]);
      break;
    default:
      geometry.circle = { x, y, radius: half };
  }
  return geometry;
}

export function plotMarkerSize(size: string | undefined): number {
  'worklet';
  if (size === 'tiny') return 4;
  if (size === 'normal' || size === 'auto') return 8;
  if (size === 'large') return 12;
  if (size === 'huge') return 16;
  return 6;
}

export function plotMarkerTextLineOffset(location: string, size: number, index: number, count: number): number {
  'worklet';
  const height = Math.max(10, size * 1.5);
  return location === 'belowbar' ? index * height : -(count - 1 - index) * height;
}

export function plotArrowHeight(
  plot: { minHeight?: number; maxHeight?: number },
  magnitude: number,
  maxMagnitude: number,
  fallbackSize: number,
): number {
  'worklet';
  const first = Math.abs(Number.isFinite(plot.minHeight) ? plot.minHeight! : fallbackSize);
  const second = Math.abs(Number.isFinite(plot.maxHeight) ? plot.maxHeight! : fallbackSize);
  const minimum = Math.min(first, second);
  const maximum = Math.max(first, second);
  if (maxMagnitude <= 0 || minimum === maximum) return minimum;
  return magnitude * ((maximum - minimum) / maxMagnitude) + minimum;
}

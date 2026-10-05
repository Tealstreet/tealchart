import type { SkPath } from '@shopify/react-native-skia';

import { Skia } from '@shopify/react-native-skia';

import { getPlotMarkerGeometry } from '../../rendering/plotMarkerGeometry';

export function appendNativePlotMarker(
  path: SkPath,
  x: number,
  y: number,
  shape: string,
  size: number,
  part: 'fill' | 'stroke' = 'fill',
): void {
  'worklet';
  const geometry = getPlotMarkerGeometry(x, y, shape, size);
  const lines = part === 'stroke' ? geometry.lines : geometry.polygons;
  for (const line of lines) {
    path.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) path.lineTo(line[i][0], line[i][1]);
    if (part === 'fill') path.close();
  }
  if (part === 'stroke') return;
  for (const box of geometry.boxes) {
    const rect = Skia.XYWHRect(box.x, box.y, box.width, box.height);
    if (box.radius === undefined) path.addRect(rect);
    else path.addRRect(Skia.RRectXY(rect, box.radius, box.radius));
  }
  if (geometry.circle) path.addCircle(geometry.circle.x, geometry.circle.y, geometry.circle.radius);
}

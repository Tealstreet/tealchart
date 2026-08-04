import type { SkPath } from '@shopify/react-native-skia';
import type { StyleProp, ViewStyle } from 'react-native';
import type { DrawingIconNode } from '../../drawings/icons';

import React from 'react';

import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';

import { DRAWING_ICON_DEFAULT_VIEWBOX, getDrawingIconDefinition } from '../../drawings/icons';

export interface NativeDrawingIconProps {
  color?: string;
  name: string;
  opacity?: number;
  size?: number;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

interface NativeIconPath {
  filled: boolean;
  path: SkPath;
}

interface NativeIconViewBox {
  height: number;
  minX: number;
  minY: number;
  width: number;
}

type IconAttrValue = string | number | undefined;

function attr(node: DrawingIconNode, key: string): IconAttrValue {
  return node.attrs[key] as IconAttrValue;
}

function numericAttr(node: DrawingIconNode, key: string, fallback = 0): number {
  const value = attr(node, key);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseIconViewBox(viewBox: string | undefined): NativeIconViewBox {
  const raw = (viewBox ?? DRAWING_ICON_DEFAULT_VIEWBOX).split(/\s+/).map((value) => Number(value));
  if (raw.length !== 4 || raw.some((value) => !Number.isFinite(value))) {
    return { minX: 0, minY: 0, width: 24, height: 24 };
  }
  const [minX, minY, width, height] = raw;
  return {
    height: height || 24,
    minX,
    minY,
    width: width || 24,
  };
}

function parsePolylinePoints(points: string): Array<{ x: number; y: number }> {
  const values = points
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const parsed: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < values.length - 1; index += 2) {
    parsed.push({ x: values[index], y: values[index + 1] });
  }
  return parsed;
}

function createPolylinePath(points: string): SkPath | null {
  const parsed = parsePolylinePoints(points);
  if (parsed.length === 0) return null;
  const path = Skia.Path.Make();
  path.moveTo(parsed[0].x, parsed[0].y);
  for (let index = 1; index < parsed.length; index += 1) {
    path.lineTo(parsed[index].x, parsed[index].y);
  }
  return path;
}

function createNativeIconPath(node: DrawingIconNode): SkPath | null {
  switch (node.tag) {
    case 'path':
      return Skia.Path.MakeFromSVGString(String(attr(node, 'd') ?? ''));
    case 'circle': {
      const path = Skia.Path.Make();
      path.addCircle(numericAttr(node, 'cx'), numericAttr(node, 'cy'), numericAttr(node, 'r'));
      return path;
    }
    case 'ellipse': {
      const cx = numericAttr(node, 'cx');
      const cy = numericAttr(node, 'cy');
      const rx = numericAttr(node, 'rx');
      const ry = numericAttr(node, 'ry');
      const path = Skia.Path.Make();
      path.addOval(Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2));
      return path;
    }
    case 'line': {
      const path = Skia.Path.Make();
      path.moveTo(numericAttr(node, 'x1'), numericAttr(node, 'y1'));
      path.lineTo(numericAttr(node, 'x2'), numericAttr(node, 'y2'));
      return path;
    }
    case 'polyline':
      return createPolylinePath(String(attr(node, 'points') ?? ''));
    case 'rect': {
      const x = numericAttr(node, 'x');
      const y = numericAttr(node, 'y');
      const width = numericAttr(node, 'width');
      const height = numericAttr(node, 'height');
      const rx = numericAttr(node, 'rx');
      const path = Skia.Path.Make();
      const rect = Skia.XYWHRect(x, y, width, height);
      if (rx > 0) {
        path.addRRect(Skia.RRectXY(rect, rx, numericAttr(node, 'ry', rx)));
      } else {
        path.addRect(rect);
      }
      return path;
    }
    default:
      return null;
  }
}

export function NativeDrawingIconImpl({
  color = '#9ca3af',
  name,
  opacity,
  size = 18,
  strokeWidth = 1.8,
  style,
}: NativeDrawingIconProps) {
  const definition = getDrawingIconDefinition(name);
  if (!definition) return null;

  const viewBox = parseIconViewBox(definition.viewBox);
  const paths: NativeIconPath[] = definition.nodes.flatMap((node) => {
    const path = createNativeIconPath(node);
    return path ? [{ filled: node.filled === true, path }] : [];
  });

  const scaleX = size / viewBox.width;
  const scaleY = size / viewBox.height;

  return (
    <Canvas style={[{ height: size, opacity, width: size }, style]}>
      <Group transform={[{ scaleX }, { scaleY }, { translateX: -viewBox.minX }, { translateY: -viewBox.minY }]}>
        {paths.map((iconPath, index) => (
          <Path
            key={`${name}-${index}`}
            path={iconPath.path}
            color={color}
            strokeCap="round"
            strokeJoin="round"
            strokeWidth={strokeWidth}
            style={iconPath.filled ? 'fill' : 'stroke'}
          />
        ))}
      </Group>
    </Canvas>
  );
}

export const NativeDrawingIcon = React.memo(NativeDrawingIconImpl);
NativeDrawingIcon.displayName = 'NativeDrawingIcon';

import React from 'react';
import Svg, { Circle, Ellipse, Line, Path, Polyline, Rect } from 'react-native-svg';

import {
  DRAWING_ICON_DEFAULT_VIEWBOX,
  getDrawingIconDefinition,
  type DrawingIconNode,
} from '../../drawings/icons';

export interface DrawingToolIconProps {
  name?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function renderNode(node: DrawingIconNode, index: number, color: string, strokeWidth: number): React.ReactElement | null {
  const presentation = node.filled
    ? { fill: color, stroke: 'none' }
    : {
        fill: 'none',
        stroke: color,
        strokeWidth,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      };
  const props = { key: index, ...node.attrs, ...presentation };
  switch (node.tag) {
    case 'path':
      return <Path {...props} />;
    case 'circle':
      return <Circle {...props} />;
    case 'line':
      return <Line {...props} />;
    case 'polyline':
      return <Polyline {...props} />;
    case 'rect':
      return <Rect {...props} />;
    case 'ellipse':
      return <Ellipse {...props} />;
    default:
      return null;
  }
}

/**
 * Renders a shared drawing-tool/action icon via react-native-svg, mirroring the
 * web `renderDrawingIcon` helper. Returns null when the name has no authored
 * icon, so callers fall back to the descriptor glyph.
 */
export function DrawingToolIcon({
  name,
  size = 18,
  color = '#d1d4dc',
  strokeWidth = 1.8,
}: DrawingToolIconProps): React.ReactElement | null {
  const definition = name ? getDrawingIconDefinition(name) : undefined;
  if (!definition) return null;
  return (
    <Svg width={size} height={size} viewBox={definition.viewBox ?? DRAWING_ICON_DEFAULT_VIEWBOX} fill="none">
      {definition.nodes.map((node, index) => renderNode(node, index, color, strokeWidth))}
    </Svg>
  );
}

import type { ReactNode } from 'react';

import React from 'react';

interface SvgNodeProps {
  children?: ReactNode;
  [key: string]: unknown;
}

const mockNode =
  (tag: string) =>
  ({ children, ...rest }: SvgNodeProps) =>
    React.createElement('span', { 'data-svg': tag, ...rest }, children);

const Svg = mockNode('svg');
export const Path = mockNode('path');
export const Circle = mockNode('circle');
export const Line = mockNode('line');
export const Polyline = mockNode('polyline');
export const Rect = mockNode('rect');
export const Ellipse = mockNode('ellipse');

export default Svg;

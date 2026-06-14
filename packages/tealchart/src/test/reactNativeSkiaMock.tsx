import type { ReactNode } from 'react';

import React from 'react';
import { vi } from 'vitest';

const path = {
  addCircle: vi.fn(),
  addOval: vi.fn(),
  addPath: vi.fn(),
  addRect: vi.fn(),
  addRRect: vi.fn(),
  arcToOval: vi.fn(),
  close: vi.fn(),
  cubicTo: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  quadTo: vi.fn(),
  reset: vi.fn(),
  rLineTo: vi.fn(),
};

const font = {
  getSize: () => 12,
  getTextWidth: (text: string) => text.length * 7,
  measureText: (text: string) => ({ width: text.length * 7, height: 12 }),
  setSize: vi.fn(),
};

const paint = {
  setAlphaf: vi.fn(),
  setAntiAlias: vi.fn(),
  setColor: vi.fn(),
  setPathEffect: vi.fn(),
  setStrokeCap: vi.fn(),
  setStrokeJoin: vi.fn(),
  setStrokeWidth: vi.fn(),
  setStyle: vi.fn(),
};

const canvas = {
  clipPath: vi.fn(),
  drawPath: vi.fn(),
  drawRect: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
};

function createSkiaComponent(name: string) {
  return function SkiaComponent({
    children,
    phase,
    style,
    ...props
  }: {
    children?: ReactNode;
    phase?: number;
    style?: unknown;
  }) {
    return (
      <div
        data-props={Object.keys(props).length > 0 ? JSON.stringify(props) : undefined}
        data-phase={phase}
        data-skia={name}
        data-style={style === undefined ? undefined : JSON.stringify(style)}
      >
        {children}
      </div>
    );
  };
}

export const Canvas = createSkiaComponent('Canvas');
export const Circle = createSkiaComponent('Circle');
export const DashPathEffect = createSkiaComponent('DashPathEffect');
export const Group = createSkiaComponent('Group');
export const Oval = createSkiaComponent('Oval');
export const Picture = createSkiaComponent('Picture');
export const Rect = createSkiaComponent('Rect');
export const Image = createSkiaComponent('Image');
export const Line = createSkiaComponent('Line');
export const Path = createSkiaComponent('Path');
export const Text = createSkiaComponent('Text');

export const Skia = {
  Font: vi.fn(() => font),
  FontMgr: { System: () => ({ matchFamilyStyle: vi.fn(() => null) }) },
  Paint: vi.fn(() => ({ ...paint })),
  PathEffect: { MakeDash: vi.fn((segments: number[], phase: number) => ({ phase, segments })) },
  Path: { Make: vi.fn(() => ({ ...path })) },
  RRectXY: vi.fn((rect: unknown, rx: number, ry: number) => ({ rect, rx, ry })),
  XYWHRect: vi.fn((x: number, y: number, width: number, height: number) => ({ x, y, width, height })),
};

export const createPicture = vi.fn((callback?: (canvas: unknown) => void) => {
  callback?.({ ...canvas });
  return {};
});

export const useFont = vi.fn(() => font);
export const useImage = vi.fn(() => null);
export const vec = vi.fn((x: number, y: number) => ({ x, y }));

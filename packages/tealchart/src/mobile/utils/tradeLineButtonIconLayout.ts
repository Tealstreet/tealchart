export interface NativeTradeLineButtonIconLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
}

export function createNativeCloseButtonIconLines(input: {
  x: number;
  y: number;
  width: number;
  height: number;
}): NativeTradeLineButtonIconLine[] {
  const centerY = input.y + input.height / 2;
  const half = 4;
  const centerX = input.x + input.width / 2;
  const left = centerX - half;
  const right = centerX + half;
  const top = centerY - half;
  const bottom = centerY + half;

  return [
    { x1: left, y1: top, x2: right, y2: bottom, strokeWidth: 1.8 },
    { x1: right, y1: top, x2: left, y2: bottom, strokeWidth: 1.8 },
  ];
}

export function createNativeReverseButtonIconLines(input: {
  x: number;
  y: number;
  width: number;
  height: number;
}): NativeTradeLineButtonIconLine[] {
  const centerY = input.y + input.height / 2;
  const topY = centerY - 3;
  const bottomY = centerY + 3;
  const left = input.x + Math.max(3, Math.round(input.width / 2 - 5));
  const right = input.x + input.width - Math.max(3, Math.round(input.width / 2 - 5));

  return [
    { x1: left, y1: topY, x2: right, y2: topY, strokeWidth: 1.4 },
    { x1: right - 3, y1: topY - 3, x2: right, y2: topY, strokeWidth: 1.4 },
    { x1: left, y1: bottomY, x2: right, y2: bottomY, strokeWidth: 1.4 },
    { x1: left + 3, y1: bottomY + 3, x2: left, y2: bottomY, strokeWidth: 1.4 },
  ];
}

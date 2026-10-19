export function pineLineDash(style: string | undefined, width: number, dottedGap = 3): number[] {
  'worklet';
  const scale = Math.max(1, width);
  if (style === 'dashed') return [6 * scale, 4 * scale];
  if (style === 'dotted') return [2 * scale, dottedGap * scale];
  return [];
}

/** Font normalization shared by web layout and native font preparation. */
export function fontSizeForDrawing(size: string, family: 'label' | 'text' = 'text'): number {
  'worklet';
  if (/^[1-9]\d*$/.test(size)) return Number.parseInt(size, 10);
  switch (size) {
    case 'tiny':
      return family === 'label' ? 7 : 8;
    case 'small':
      return 10;
    case 'large':
      return family === 'label' ? 18 : 20;
    case 'huge':
      return family === 'label' ? 24 : 36;
    default:
      return family === 'label' ? 12 : 14;
  }
}

export function drawingFont(
  size: string,
  fontFamily?: string,
  textFormatting?: string,
  defaultFont = 'sans-serif',
  family: 'label' | 'text' = 'text',
): string {
  'worklet';
  const styleParts: string[] = [];
  const formatting = (textFormatting ?? 'none').trim().toLowerCase();
  const tokens = new Set(formatting.split(/[\s,]+/).filter(Boolean));
  const combined = formatting === 'bolditalic' || formatting === 'italicbold';
  if (tokens.has('italic') || combined) styleParts.push('italic');
  if (tokens.has('bold') || combined) styleParts.push('bold');
  styleParts.push(`${fontSizeForDrawing(size, family)}px`);
  styleParts.push(fontFamily === 'monospace' ? 'monospace' : defaultFont);
  return styleParts.join(' ');
}

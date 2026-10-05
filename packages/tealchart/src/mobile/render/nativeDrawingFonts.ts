import type { SkFont } from '@shopify/react-native-skia';
import type { DrawingOutput } from '@tealstreet/tealscript';

import { matchFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

import { drawingFont } from '../../rendering/TealScriptDrawingText';

/** Prepare font host objects on JS; the painter measures and draws on UI. */
export function createNativeDrawingFonts(drawings: readonly DrawingOutput[]): Record<string, SkFont> {
  const fonts: Record<string, SkFont> = {};
  function add(size: string, family?: string, formatting?: string, drawingFamily: 'label' | 'text' = 'text') {
    const key = drawingFont(size, family, formatting, 'sans-serif', drawingFamily);
    if (fonts[key]) return;
    fonts[key] = matchFont({
      fontSize: Number.parseInt(key.match(/(\d+)px/)![1]!, 10),
      ...(family === 'monospace' ? { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' } : {}),
      fontStyle: key.includes('italic') ? 'italic' : 'normal',
      fontWeight: key.includes('bold') ? 'bold' : 'normal',
    });
  }
  for (const drawing of drawings) {
    if (drawing.type === 'label') add(drawing.size, drawing.textFontFamily, drawing.textFormatting, 'label');
    if (drawing.type === 'box') add(drawing.textSize, drawing.textFontFamily, drawing.textFormatting);
    if (drawing.type === 'table')
      for (const cell of drawing.cells) add(cell.textSize, cell.textFontFamily, cell.textFormatting);
  }
  return fonts;
}

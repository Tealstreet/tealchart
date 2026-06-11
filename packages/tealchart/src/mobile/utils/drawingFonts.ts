import type { UserDrawingFontFamily } from '../../drawings';

import { normalizeUserDrawingFontFamily } from '../../drawings';

export type MobileFontPlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';

const IOS_FONT_FAMILIES: Record<UserDrawingFontFamily, string> = {
  'sans-serif': 'Helvetica',
  serif: 'Times New Roman',
  monospace: 'Menlo',
};

const ANDROID_FONT_FAMILIES: Record<UserDrawingFontFamily, string> = {
  'sans-serif': 'sans-serif',
  serif: 'serif',
  monospace: 'monospace',
};

export function resolveMobileUserDrawingFontFamily(
  fontFamily: string | undefined,
  platform: MobileFontPlatform,
): string {
  const normalized = normalizeUserDrawingFontFamily(fontFamily ?? 'sans-serif');
  return platform === 'ios' ? IOS_FONT_FAMILIES[normalized] : ANDROID_FONT_FAMILIES[normalized];
}

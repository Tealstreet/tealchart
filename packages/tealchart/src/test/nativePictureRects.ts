export interface NativePictureRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export function nativePictureRects(picture: unknown): NativePictureRect[] {
  const value = picture && typeof picture === 'object' && 'value' in picture ? picture.value : picture;
  return value && typeof value === 'object' && 'rects' in value ? (value.rects as NativePictureRect[]) : [];
}

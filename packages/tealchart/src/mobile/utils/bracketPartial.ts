export function bracketPartialPercent(partialEnabled: boolean, translationX: number): number {
  if (!partialEnabled) return 100;

  const deltaX = Math.abs(translationX);
  if (deltaX <= 27) return 100;
  if (deltaX <= 82) return 75;
  if (deltaX <= 137) return 50;
  if (deltaX <= 192) return 25;
  return 10;
}

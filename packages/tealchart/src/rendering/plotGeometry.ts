/** Complete each area island before starting another, on canvas and Skia. */
export function appendPlotAreaBaseline(
  path: { lineTo(x: number, y: number): unknown },
  firstX: number,
  lastX: number,
  baselineY: number,
): void {
  'worklet';
  path.lineTo(lastX, baselineY);
  path.lineTo(firstX, baselineY);
}

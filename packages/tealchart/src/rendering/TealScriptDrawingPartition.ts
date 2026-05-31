import type {
  BoxDrawingOutput,
  DrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
  PolylineDrawingOutput,
  TableDrawingOutput,
} from '@tealstreet/tealscript';

export interface TealScriptDrawingPartition {
  boxes: BoxDrawingOutput[];
  labels: LabelDrawingOutput[];
  lines: LineDrawingOutput[];
  linefills: LineFillDrawingOutput[];
  polylines: PolylineDrawingOutput[];
  tables: TableDrawingOutput[];
  linesById: Map<string, LineDrawingOutput>;
}

export function partitionTealScriptDrawings(drawings: readonly DrawingOutput[]): TealScriptDrawingPartition {
  const boxes: BoxDrawingOutput[] = [];
  const labels: LabelDrawingOutput[] = [];
  const lines: LineDrawingOutput[] = [];
  const linefills: LineFillDrawingOutput[] = [];
  const polylines: PolylineDrawingOutput[] = [];
  const tables: TableDrawingOutput[] = [];
  const linesById = new Map<string, LineDrawingOutput>();

  for (const drawing of drawings) {
    switch (drawing.type) {
      case 'box':
        boxes.push(drawing);
        break;
      case 'label':
        labels.push(drawing);
        break;
      case 'line':
        lines.push(drawing);
        linesById.set(drawing.id, drawing);
        break;
      case 'linefill':
        linefills.push(drawing);
        break;
      case 'polyline':
        polylines.push(drawing);
        break;
      case 'table':
        tables.push(drawing);
        break;
    }
  }

  return { boxes, labels, lines, linefills, polylines, tables, linesById };
}

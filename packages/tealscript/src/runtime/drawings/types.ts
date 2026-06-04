export interface LabelDrawingOutput {
  id: string;
  type: 'label';
  /** Script ID that produced this drawing (set by TealscriptManager). */
  scriptId?: string;
  /** True when the drawing was created by a persistent declaration. */
  persistent?: boolean;
  barIndex: number;
  x: number | null;
  y: number | null;
  text: string;
  xloc: string;
  yloc: string;
  style: string;
  color: string | null;
  textColor: string | null;
  size: string;
  textAlign?: string;
  textFontFamily?: string;
  textFormatting?: string;
  tooltip?: string;
  forceOverlay?: boolean;
}

export interface LineDrawingOutput {
  id: string;
  type: 'line';
  /** Script ID that produced this drawing (set by TealscriptManager). */
  scriptId?: string;
  /** True when the drawing was created by a persistent declaration. */
  persistent?: boolean;
  barIndex: number;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  xloc: string;
  extend: string;
  color: string | null;
  style: string;
  width: number;
  forceOverlay?: boolean;
}

export interface LineFillDrawingOutput {
  id: string;
  type: 'linefill';
  /** Script ID that produced this drawing (set by TealscriptManager). */
  scriptId?: string;
  /** True when the drawing was created by a persistent declaration. */
  persistent?: boolean;
  barIndex: number;
  line1: string;
  line2: string;
  color: string | null;
}

export interface BoxDrawingOutput {
  id: string;
  type: 'box';
  /** Script ID that produced this drawing (set by TealscriptManager). */
  scriptId?: string;
  /** True when the drawing was created by a persistent declaration. */
  persistent?: boolean;
  barIndex: number;
  left: number | null;
  top: number | null;
  right: number | null;
  bottom: number | null;
  xloc: string;
  extend: string;
  borderColor: string | null;
  borderWidth: number;
  borderStyle: string;
  bgcolor: string | null;
  text: string;
  textColor: string | null;
  textSize: string;
  textHalign?: string;
  textValign?: string;
  textWrap?: string;
  textFontFamily?: string;
  textFormatting?: string;
  forceOverlay?: boolean;
}

export interface PolylineDrawingOutput {
  id: string;
  type: 'polyline';
  /** Script ID that produced this drawing (set by TealscriptManager). */
  scriptId?: string;
  /** True when the drawing was created by a persistent declaration. */
  persistent?: boolean;
  barIndex: number;
  points: ChartPoint[];
  curved: boolean;
  closed: boolean;
  xloc: string;
  lineColor: string | null;
  fillColor: string | null;
  lineStyle: string;
  lineWidth: number;
  forceOverlay?: boolean;
}

export interface TableCellDrawingOutput {
  column: number;
  row: number;
  text: string;
  width?: number | null;
  height?: number | null;
  textColor: string | null;
  textSize: string;
  textHalign: string;
  textValign: string;
  textFontFamily?: string;
  textFormatting?: string;
  tooltip?: string;
  bgcolor: string | null;
}

export interface TableMergedCellDrawingOutput {
  startColumn: number;
  startRow: number;
  endColumn: number;
  endRow: number;
}

export interface TableDrawingOutput {
  id: string;
  type: 'table';
  /** Script ID that produced this drawing (set by TealscriptManager). */
  scriptId?: string;
  /** True when the drawing was created by a persistent declaration. */
  persistent?: boolean;
  barIndex: number;
  position: string;
  columns: number;
  rows: number;
  bgcolor: string | null;
  frameColor: string | null;
  frameWidth: number;
  borderColor: string | null;
  borderWidth: number;
  cells: TableCellDrawingOutput[];
  mergedCells?: TableMergedCellDrawingOutput[];
  forceOverlay?: boolean;
}

export type DrawingOutput =
  | LabelDrawingOutput
  | LineDrawingOutput
  | LineFillDrawingOutput
  | BoxDrawingOutput
  | PolylineDrawingOutput
  | TableDrawingOutput;

export type DrawingObjectType = DrawingOutput['type'];

export interface DrawingLimits {
  label: number;
  line: number;
  box: number;
  polyline: number;
}

export interface ChartPoint {
  type: 'chart.point';
  time: number | null;
  index: number | null;
  price: number | null;
}

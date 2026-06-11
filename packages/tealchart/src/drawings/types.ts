export const USER_DRAWING_SCHEMA_VERSION = 1;

export type UserDrawingTool =
  | 'select'
  | 'trendLine'
  | 'ray'
  | 'horizontalLine'
  | 'verticalLine'
  | 'rectangle'
  | 'textLabel';

export type UserDrawingKind = Exclude<UserDrawingTool, 'select'>;

export type UserDrawingLineStyle = 'solid' | 'dashed' | 'dotted';

export type UserDrawingHandleRole = 'start' | 'end' | 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface UserDrawingAnchor {
  time: number;
  price: number;
}

export interface UserDrawingStyle {
  lineColor: string;
  lineWidth: number;
  lineStyle: UserDrawingLineStyle;
  opacity?: number;
  fillColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface UserDrawingBase {
  id: string;
  kind: UserDrawingKind;
  paneId: string;
  visible: boolean;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
  style: UserDrawingStyle;
}

export interface TrendLineDrawing extends UserDrawingBase {
  kind: 'trendLine';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
  extend: 'none' | 'left' | 'right' | 'both';
}

export interface RayDrawing extends UserDrawingBase {
  kind: 'ray';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface HorizontalLineDrawing extends UserDrawingBase {
  kind: 'horizontalLine';
  price: number;
}

export interface VerticalLineDrawing extends UserDrawingBase {
  kind: 'verticalLine';
  time: number;
}

export interface RectangleDrawing extends UserDrawingBase {
  kind: 'rectangle';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export type UserDrawingTextAlign = 'left' | 'center' | 'right';

export interface TextLabelDrawing extends UserDrawingBase {
  kind: 'textLabel';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export type UserDrawing =
  | TrendLineDrawing
  | RayDrawing
  | HorizontalLineDrawing
  | VerticalLineDrawing
  | RectangleDrawing
  | TextLabelDrawing;

export interface UserDrawingDraft {
  tool: UserDrawingTool;
  paneId: string;
  anchors: readonly UserDrawingAnchor[];
  style: UserDrawingStyle;
  text?: string;
  startedAt: number;
}

export interface UserDrawingSelection {
  drawingId: string;
  handle?: UserDrawingHandleRole;
}

export interface UserDrawingTextEdit {
  drawingId: string;
  value: string;
  originalValue: string;
  startedAt: number;
}

export interface UserDrawingState {
  version: number;
  drawings: readonly UserDrawing[];
  activeTool: UserDrawingTool;
  selection: UserDrawingSelection | null;
  draft: UserDrawingDraft | null;
  textEdit: UserDrawingTextEdit | null;
}

export const DEFAULT_USER_DRAWING_STYLE: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 1,
  lineStyle: 'solid',
  opacity: 1,
  fillColor: 'rgba(245, 197, 66, 0.12)',
  textColor: '#f5c542',
  fontSize: 12,
};

export const USER_DRAWING_FONT_SIZES = [10, 12, 14, 16] as const;
export const USER_DRAWING_OPACITIES = [1, 0.75, 0.5, 0.25] as const;

export function normalizeUserDrawingFontSize(fontSize: number): number {
  return USER_DRAWING_FONT_SIZES.reduce((nearest, candidate) =>
    Math.abs(candidate - fontSize) < Math.abs(nearest - fontSize) ? candidate : nearest,
  );
}

export function normalizeUserDrawingOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) return 1;
  return Math.max(0, Math.min(1, opacity));
}

export function normalizeUserDrawingStyle(style: UserDrawingStyle): UserDrawingStyle {
  const fontSize = style.fontSize === undefined ? undefined : normalizeUserDrawingFontSize(style.fontSize);
  const opacity = style.opacity === undefined ? undefined : normalizeUserDrawingOpacity(style.opacity);
  if (fontSize === style.fontSize && opacity === style.opacity) return style;

  return {
    ...style,
    ...(fontSize === undefined ? {} : { fontSize }),
    ...(opacity === undefined ? {} : { opacity }),
  };
}

export const DEFAULT_USER_DRAWING_STATE: UserDrawingState = {
  version: USER_DRAWING_SCHEMA_VERSION,
  drawings: [],
  activeTool: 'select',
  selection: null,
  draft: null,
  textEdit: null,
};

export function getRequiredAnchorCount(tool: UserDrawingTool): number {
  switch (tool) {
    case 'trendLine':
    case 'ray':
    case 'rectangle':
      return 2;
    case 'horizontalLine':
    case 'verticalLine':
    case 'textLabel':
      return 1;
    case 'select':
      return 0;
  }
}

export function isDrawingDraftReady(draft: UserDrawingDraft): boolean {
  return draft.anchors.length >= getRequiredAnchorCount(draft.tool);
}

export interface CreateUserDrawingFromDraftOptions {
  id: string;
  now?: number;
}

export function createUserDrawingFromDraft(
  draft: UserDrawingDraft,
  options: CreateUserDrawingFromDraftOptions,
): UserDrawing | null {
  if (!isDrawingDraftReady(draft) || draft.tool === 'select') return null;

  const now = options.now ?? Date.now();
  const base = {
    id: options.id,
    paneId: draft.paneId,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: normalizeUserDrawingStyle({ ...draft.style }),
  };

  switch (draft.tool) {
    case 'trendLine':
      return {
        ...base,
        kind: 'trendLine',
        points: [draft.anchors[0]!, draft.anchors[1]!],
        extend: 'none',
      };
    case 'ray':
      return {
        ...base,
        kind: 'ray',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'horizontalLine':
      return {
        ...base,
        kind: 'horizontalLine',
        price: draft.anchors[0]!.price,
      };
    case 'verticalLine':
      return {
        ...base,
        kind: 'verticalLine',
        time: draft.anchors[0]!.time,
      };
    case 'rectangle':
      return {
        ...base,
        kind: 'rectangle',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'textLabel':
      return {
        ...base,
        kind: 'textLabel',
        point: draft.anchors[0]!,
        text: draft.text ?? '',
        textAlign: 'center',
      };
  }
}

export function getUserDrawingPaneId(drawing: UserDrawing): string {
  return drawing.paneId;
}

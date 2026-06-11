import type {
  TextLabelDrawing,
  UserDrawing,
  UserDrawingAnchor,
  UserDrawingBase,
  UserDrawingLineStyle,
  UserDrawingState,
  UserDrawingStyle,
} from './types';

import { createUserDrawingState } from './input';
import { normalizeUserDrawingStyle } from './types';

function cloneUserDrawing(drawing: UserDrawing): UserDrawing {
  switch (drawing.kind) {
    case 'trendLine':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'trendAngle':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowMarker':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'arrowLine':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'ray':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'priceRange':
    case 'dateRange':
    case 'fibRetracement':
    case 'fibExtension':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'path':
    case 'triangle':
    case 'parallelChannel':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }, { ...drawing.points[2] }],
      };
    case 'horizontalLine':
    case 'verticalLine':
      return {
        ...drawing,
        style: { ...drawing.style },
      };
    case 'horizontalRay':
    case 'crossLine':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        point: { ...drawing.point },
      };
    case 'textLabel':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        point: { ...drawing.point },
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isLineStyle(value: unknown): value is UserDrawingLineStyle {
  return value === 'solid' || value === 'dashed' || value === 'dotted';
}

function parseAnchor(value: unknown): UserDrawingAnchor | null {
  if (!isRecord(value) || !isFiniteNumber(value.time) || !isFiniteNumber(value.price)) return null;
  return { time: value.time, price: value.price };
}

function parseStyle(value: unknown): UserDrawingStyle | null {
  if (
    !isRecord(value) ||
    typeof value.lineColor !== 'string' ||
    !isFiniteNumber(value.lineWidth) ||
    !isLineStyle(value.lineStyle)
  ) {
    return null;
  }

  const style: UserDrawingStyle = {
    lineColor: value.lineColor,
    lineWidth: value.lineWidth,
    lineStyle: value.lineStyle,
  };

  if (isFiniteNumber(value.opacity)) style.opacity = value.opacity;
  if (typeof value.lineVisible === 'boolean') style.lineVisible = value.lineVisible;
  if (typeof value.fillVisible === 'boolean') style.fillVisible = value.fillVisible;
  if (typeof value.fillColor === 'string') style.fillColor = value.fillColor;
  if (typeof value.textColor === 'string') style.textColor = value.textColor;
  if (isFiniteNumber(value.fontSize)) style.fontSize = value.fontSize;
  if (typeof value.fontFamily === 'string') style.fontFamily = value.fontFamily;
  return normalizeUserDrawingStyle(style);
}

function parseBase(value: Record<string, unknown>): Omit<UserDrawingBase, 'kind'> | null {
  const style = parseStyle(value.style);
  if (
    typeof value.id !== 'string' ||
    typeof value.paneId !== 'string' ||
    typeof value.visible !== 'boolean' ||
    typeof value.locked !== 'boolean' ||
    !isFiniteNumber(value.createdAt) ||
    !isFiniteNumber(value.updatedAt) ||
    !style
  ) {
    return null;
  }

  return {
    id: value.id,
    paneId: value.paneId,
    visible: value.visible,
    locked: value.locked,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    style,
  };
}

function parseTwoPointDrawing(value: Record<string, unknown>): [UserDrawingAnchor, UserDrawingAnchor] | null {
  if (!Array.isArray(value.points) || value.points.length !== 2) return null;
  const start = parseAnchor(value.points[0]);
  const end = parseAnchor(value.points[1]);
  return start && end ? [start, end] : null;
}

function parseThreePointDrawing(
  value: Record<string, unknown>,
): [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor] | null {
  if (!Array.isArray(value.points) || value.points.length !== 3) return null;
  const first = parseAnchor(value.points[0]);
  const second = parseAnchor(value.points[1]);
  const third = parseAnchor(value.points[2]);
  return first && second && third ? [first, second, third] : null;
}

function parseUserDrawing(value: unknown): UserDrawing | null {
  if (!isRecord(value)) return null;
  const base = parseBase(value);
  if (!base) return null;

  switch (value.kind) {
    case 'trendLine': {
      const points = parseTwoPointDrawing(value);
      if (!points) return null;
      const extend = value.extend;
      if (extend !== 'none' && extend !== 'left' && extend !== 'right' && extend !== 'both') return null;
      return {
        ...base,
        kind: 'trendLine',
        points,
        extend,
      };
    }
    case 'ray': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'ray',
            points,
          }
        : null;
    }
    case 'trendAngle': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'trendAngle',
            points,
          }
        : null;
    }
    case 'extendedLine': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'extendedLine',
            points,
          }
        : null;
    }
    case 'infoLine': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'infoLine',
            points,
          }
        : null;
    }
    case 'arrowLine': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'arrowLine',
            points,
          }
        : null;
    }
    case 'arrowMarker': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'arrowMarker',
            points,
          }
        : null;
    }
    case 'rectangle': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'rectangle',
            points,
          }
        : null;
    }
    case 'circle': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'circle',
            points,
          }
        : null;
    }
    case 'ellipse': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'ellipse',
            points,
          }
        : null;
    }
    case 'priceRange': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'priceRange',
            points,
          }
        : null;
    }
    case 'dateRange': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'dateRange',
            points,
          }
        : null;
    }
    case 'fibRetracement': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibRetracement',
            points,
          }
        : null;
    }
    case 'fibExtension': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibExtension',
            points,
          }
        : null;
    }
    case 'path': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'path',
            points,
          }
        : null;
    }
    case 'triangle': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'triangle',
            points,
          }
        : null;
    }
    case 'parallelChannel': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'parallelChannel',
            points,
          }
        : null;
    }
    case 'horizontalLine':
      return isFiniteNumber(value.price)
        ? {
            ...base,
            kind: 'horizontalLine',
            price: value.price,
          }
        : null;
    case 'verticalLine':
      return isFiniteNumber(value.time)
        ? {
            ...base,
            kind: 'verticalLine',
            time: value.time,
          }
        : null;
    case 'horizontalRay': {
      const point = parseAnchor(value.point);
      return point
        ? {
            ...base,
            kind: 'horizontalRay',
            point,
          }
        : null;
    }
    case 'crossLine': {
      const point = parseAnchor(value.point);
      return point
        ? {
            ...base,
            kind: 'crossLine',
            point,
          }
        : null;
    }
    case 'arrowMarkUp':
    case 'arrowMarkDown': {
      const point = parseAnchor(value.point);
      return point
        ? {
            ...base,
            kind: value.kind,
            point,
          }
        : null;
    }
    case 'textLabel': {
      const point = parseAnchor(value.point);
      if (!point || typeof value.text !== 'string') return null;
      const textAlign: TextLabelDrawing['textAlign'] =
        value.textAlign === 'left' || value.textAlign === 'right' || value.textAlign === 'center'
          ? value.textAlign
          : 'center';
      return {
        ...base,
        kind: 'textLabel',
        point,
        text: value.text,
        textAlign,
      };
    }
    default:
      return null;
  }
}

export function serializeUserDrawingStateForLayout(state?: UserDrawingState | null): UserDrawingState | undefined {
  if (!state || state.drawings.length === 0) return undefined;

  return createUserDrawingState({
    version: state.version,
    drawings: state.drawings.map(cloneUserDrawing),
  });
}

export function deserializeUserDrawingStateFromLayout(state?: unknown): UserDrawingState | undefined {
  if (!isRecord(state) || !Array.isArray(state.drawings)) return undefined;
  const drawings = state.drawings.map(parseUserDrawing).filter((drawing): drawing is UserDrawing => drawing !== null);
  if (drawings.length === 0) return undefined;

  return createUserDrawingState({
    version: isFiniteNumber(state.version) ? state.version : undefined,
    drawings,
  });
}

export function isUserDrawingLayoutStateEqual(
  previous?: UserDrawingState | null,
  next?: UserDrawingState | null,
): boolean {
  return (
    JSON.stringify(serializeUserDrawingStateForLayout(previous) ?? null) ===
    JSON.stringify(serializeUserDrawingStateForLayout(next) ?? null)
  );
}

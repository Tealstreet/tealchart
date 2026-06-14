import type {
  BarsPatternBarSnapshot,
  UserDrawing,
  UserDrawingAnchor,
  UserDrawingBase,
  UserDrawingLineStyle,
  UserDrawingPanePosition,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTextAnnotation,
} from './types';

import { createUserDrawingState } from './input';
import {
  USER_DRAWING_SCHEMA_VERSION,
  normalizeUserDrawingAnchorPressure,
  normalizeUserDrawingIconName,
  normalizeUserDrawingPanePosition,
  normalizeUserDrawingStyle,
  normalizeUserDrawingTableCells,
} from './types';

export const USER_DRAWING_LAYOUT_SCHEMA_VERSION = USER_DRAWING_SCHEMA_VERSION;
const LEGACY_VERSIONLESS_USER_DRAWING_LAYOUT_SCHEMA_VERSION = 1;

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
    case 'datePriceRange':
    case 'forecast':
    case 'fixedRangeVolumeProfile':
    case 'fibRetracement':
    case 'fibExtension':
    case 'fibFan':
    case 'fibSpeedResistanceFan':
    case 'fibArcs':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'gannFan':
    case 'gannBox':
    case 'gannSquare':
    case 'gannSquareFixed':
    case 'fibTimeZone':
    case 'cyclicLines':
    case 'timeCycles':
    case 'sineLine':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'image':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'image',
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
        src: drawing.src,
        alt: drawing.alt,
      };
    case 'triangle':
    case 'curve':
    case 'arc':
    case 'fibWedge':
    case 'fibChannel':
    case 'trendBasedFibExtension':
    case 'trendBasedFibTime':
    case 'pitchfork':
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork':
    case 'pitchfan':
    case 'parallelChannel':
    case 'rotatedRectangle':
    case 'flatTopBottom':
    case 'regressionTrend':
    case 'longPosition':
    case 'shortPosition':
    case 'projection':
    case 'sector':
    case 'elliottCorrectiveWave':
    case 'elliottDoubleComboWave':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }, { ...drawing.points[2] }],
      };
    case 'doubleCurve':
    case 'disjointChannel':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [
          { ...drawing.points[0] },
          { ...drawing.points[1] },
          { ...drawing.points[2] },
          { ...drawing.points[3] },
        ],
      };
    case 'barsPattern':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }, { ...drawing.points[2] }],
        bars: drawing.bars.map((bar) => ({ ...bar })),
      };
    case 'trianglePattern':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'trianglePattern',
        points: [
          { ...drawing.points[0] },
          { ...drawing.points[1] },
          { ...drawing.points[2] },
          { ...drawing.points[3] },
        ],
      };
    case 'abcdPattern':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'abcdPattern',
        points: [
          { ...drawing.points[0] },
          { ...drawing.points[1] },
          { ...drawing.points[2] },
          { ...drawing.points[3] },
        ],
      };
    case 'xabcdPattern':
    case 'cypherPattern':
    case 'threeDrivesPattern':
    case 'headShouldersPattern':
    case 'elliottImpulseWave':
    case 'elliottTripleComboWave':
    case 'elliottTriangleWave':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [
          { ...drawing.points[0] },
          { ...drawing.points[1] },
          { ...drawing.points[2] },
          { ...drawing.points[3] },
          { ...drawing.points[4] },
        ],
      };
    case 'path':
    case 'brush':
    case 'highlighter':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: drawing.points.map((point) => ({ ...point })),
      };
    case 'polyline':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'polyline',
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
    case 'arrowMarkLeft':
    case 'arrowMarkRight':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'pin':
    case 'flagMark':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        point: { ...drawing.point },
      };
    case 'icon':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'icon',
        point: { ...drawing.point },
        iconName: drawing.iconName,
      };
    case 'anchoredVwap':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'anchoredVwap',
        point: { ...drawing.point },
      };
    case 'anchoredVolumeProfile':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'anchoredVolumeProfile',
        point: { ...drawing.point },
      };
    case 'table':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: 'table',
        point: { ...drawing.point },
        cells: normalizeUserDrawingTableCells(drawing.cells),
        textAlign: drawing.textAlign,
      };
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'anchoredText':
    case 'anchoredNote':
    case 'priceLabel':
    case 'emoji':
    case 'sticker':
    case 'balloon':
    case 'signpost':
      if (drawing.kind === 'anchoredText' || drawing.kind === 'anchoredNote') {
        return {
          ...drawing,
          style: { ...drawing.style },
          kind: drawing.kind,
          position: { ...drawing.position },
        };
      }
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        point: { ...drawing.point },
      };
    case 'callout':
    case 'priceNote':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
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
  const anchor: UserDrawingAnchor = { time: value.time, price: value.price };
  if ('pressure' in value) {
    const pressure = normalizeUserDrawingAnchorPressure(value.pressure);
    if (pressure === undefined) return null;
    anchor.pressure = pressure;
  }
  return anchor;
}

function parsePanePosition(value: unknown): UserDrawingPanePosition | null {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null;
  return normalizeUserDrawingPanePosition({ x: value.x, y: value.y });
}

function parseBarsPatternBar(value: unknown): BarsPatternBarSnapshot | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.time) ||
    !isFiniteNumber(value.open) ||
    !isFiniteNumber(value.high) ||
    !isFiniteNumber(value.low) ||
    !isFiniteNumber(value.close)
  ) {
    return null;
  }
  return { time: value.time, open: value.open, high: value.high, low: value.low, close: value.close };
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
  if (typeof value.fontWeight === 'string') style.fontWeight = value.fontWeight as UserDrawingStyle['fontWeight'];
  if (typeof value.fontStyle === 'string') style.fontStyle = value.fontStyle as UserDrawingStyle['fontStyle'];
  if (typeof value.textUnderline === 'boolean') style.textUnderline = value.textUnderline;
  if (typeof value.textLineThrough === 'boolean') style.textLineThrough = value.textLineThrough;
  if (typeof value.textWrap === 'boolean') style.textWrap = value.textWrap;
  if (isFiniteNumber(value.textMaxWidth)) style.textMaxWidth = value.textMaxWidth;
  return normalizeUserDrawingStyle(style);
}

function parseBase(value: Record<string, unknown>): Omit<UserDrawingBase, 'kind'> | null {
  const style = parseStyle(value.style);
  if (
    typeof value.id !== 'string' ||
    typeof value.paneId !== 'string' ||
    !style
  ) {
    return null;
  }

  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : undefined,
    paneId: value.paneId,
    visible: typeof value.visible === 'boolean' ? value.visible : true,
    locked: typeof value.locked === 'boolean' ? value.locked : false,
    createdAt: isFiniteNumber(value.createdAt) ? value.createdAt : 0,
    updatedAt: isFiniteNumber(value.updatedAt) ? value.updatedAt : isFiniteNumber(value.createdAt) ? value.createdAt : 0,
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

function parseFourPointDrawing(
  value: Record<string, unknown>,
): [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor] | null {
  if (!Array.isArray(value.points) || value.points.length !== 4) return null;
  const first = parseAnchor(value.points[0]);
  const second = parseAnchor(value.points[1]);
  const third = parseAnchor(value.points[2]);
  const fourth = parseAnchor(value.points[3]);
  return first && second && third && fourth ? [first, second, third, fourth] : null;
}

function parseFivePointDrawing(
  value: Record<string, unknown>,
): [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor] | null {
  if (!Array.isArray(value.points) || value.points.length !== 5) return null;
  const first = parseAnchor(value.points[0]);
  const second = parseAnchor(value.points[1]);
  const third = parseAnchor(value.points[2]);
  const fourth = parseAnchor(value.points[3]);
  const fifth = parseAnchor(value.points[4]);
  return first && second && third && fourth && fifth ? [first, second, third, fourth, fifth] : null;
}

function parsePathDrawingPoints(value: Record<string, unknown>): readonly UserDrawingAnchor[] | null {
  if (!Array.isArray(value.points) || value.points.length < 2) return null;
  const points = value.points.map((point) => parseAnchor(point));
  return points.every((point): point is UserDrawingAnchor => point !== null) ? points : null;
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
    case 'image': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'image',
            points,
            src: typeof value.src === 'string' ? value.src : '',
            alt: typeof value.alt === 'string' ? value.alt : 'Image placeholder',
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
    case 'rotatedRectangle': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'rotatedRectangle',
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
    case 'datePriceRange': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'datePriceRange',
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
    case 'trendBasedFibExtension': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'trendBasedFibExtension',
            points,
          }
        : null;
    }
    case 'fibFan': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibFan',
            points,
          }
        : null;
    }
    case 'fibSpeedResistanceFan': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibSpeedResistanceFan',
            points,
          }
        : null;
    }
    case 'fibArcs': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibArcs',
            points,
          }
        : null;
    }
    case 'fibSpeedResistanceArcs': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibSpeedResistanceArcs',
            points,
          }
        : null;
    }
    case 'fibCircles': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibCircles',
            points,
          }
        : null;
    }
    case 'fibWedge': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibWedge',
            points,
          }
        : null;
    }
    case 'fibSpiral': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibSpiral',
            points,
          }
        : null;
    }
    case 'gannFan': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'gannFan',
            points,
          }
        : null;
    }
    case 'gannBox': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'gannBox',
            points,
          }
        : null;
    }
    case 'gannSquare': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'gannSquare',
            points,
          }
        : null;
    }
    case 'gannSquareFixed': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'gannSquareFixed',
            points,
          }
        : null;
    }
    case 'fibTimeZone': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibTimeZone',
            points,
          }
        : null;
    }
    case 'cyclicLines': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'cyclicLines',
            points,
          }
        : null;
    }
    case 'timeCycles': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'timeCycles',
            points,
          }
        : null;
    }
    case 'sineLine': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'sineLine',
            points,
          }
        : null;
    }
    case 'anchoredVwap': {
      const point = parseAnchor(value.point);
      return point
        ? {
            ...base,
            kind: 'anchoredVwap',
            point,
          }
        : null;
    }
    case 'path': {
      const points = parsePathDrawingPoints(value);
      return points
        ? {
            ...base,
            kind: 'path',
            points,
          }
        : null;
    }
    case 'brush': {
      const points = parsePathDrawingPoints(value);
      return points
        ? {
            ...base,
            kind: 'brush',
            points,
          }
        : null;
    }
    case 'highlighter': {
      const points = parsePathDrawingPoints(value);
      return points
        ? {
            ...base,
            kind: 'highlighter',
            points,
          }
        : null;
    }
    case 'polyline': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'polyline',
            points,
          }
        : null;
    }
    case 'curve': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'curve',
            points,
          }
        : null;
    }
    case 'doubleCurve': {
      const points = parseFourPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'doubleCurve',
            points,
          }
        : null;
    }
    case 'arc': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'arc',
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
    case 'fibChannel': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fibChannel',
            points,
          }
        : null;
    }
    case 'trendBasedFibTime': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'trendBasedFibTime',
            points,
          }
        : null;
    }
    case 'pitchfork': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'pitchfork',
            points,
          }
        : null;
    }
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: value.kind,
            points,
          }
        : null;
    }
    case 'pitchfan': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'pitchfan',
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
    case 'flatTopBottom': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'flatTopBottom',
            points,
          }
        : null;
    }
    case 'disjointChannel': {
      const points = parseFourPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'disjointChannel',
            points,
          }
        : null;
    }
    case 'regressionTrend': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'regressionTrend',
            points,
          }
        : null;
    }
    case 'longPosition':
    case 'shortPosition': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: value.kind,
            points,
          }
        : null;
    }
    case 'projection': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'projection',
            points,
          }
        : null;
    }
    case 'sector': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'sector',
            points,
          }
        : null;
    }
    case 'forecast': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'forecast',
            points,
          }
        : null;
    }
    case 'fixedRangeVolumeProfile': {
      const points = parseTwoPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'fixedRangeVolumeProfile',
            points,
          }
        : null;
    }
    case 'barsPattern': {
      const points = parseThreePointDrawing(value);
      if (!points || !Array.isArray(value.bars)) return null;
      const bars = value.bars.map((bar) => parseBarsPatternBar(bar));
      if (!bars.every((bar): bar is BarsPatternBarSnapshot => bar !== null) || bars.length === 0) return null;
      return {
        ...base,
        kind: 'barsPattern',
        points,
        bars,
      };
    }
    case 'xabcdPattern':
    case 'cypherPattern': {
      const points = parseFivePointDrawing(value);
      return points
        ? {
            ...base,
            kind: value.kind,
            points,
          }
        : null;
    }
    case 'threeDrivesPattern': {
      const points = parseFivePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'threeDrivesPattern',
            points,
        }
        : null;
    }
    case 'headShouldersPattern': {
      const points = parseFivePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'headShouldersPattern',
            points,
          }
        : null;
    }
    case 'elliottImpulseWave': {
      const points = parseFivePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'elliottImpulseWave',
            points,
          }
        : null;
    }
    case 'elliottTripleComboWave': {
      const points = parseFivePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'elliottTripleComboWave',
            points,
          }
        : null;
    }
    case 'elliottTriangleWave': {
      const points = parseFivePointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'elliottTriangleWave',
            points,
          }
        : null;
    }
    case 'elliottCorrectiveWave':
    case 'elliottDoubleComboWave': {
      const points = parseThreePointDrawing(value);
      return points
        ? {
            ...base,
            kind: value.kind,
            points,
          }
        : null;
    }
    case 'trianglePattern': {
      const points = parseFourPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'trianglePattern',
            points,
          }
        : null;
    }
    case 'abcdPattern': {
      const points = parseFourPointDrawing(value);
      return points
        ? {
            ...base,
            kind: 'abcdPattern',
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
    case 'anchoredVolumeProfile': {
      const point = parseAnchor(value.point);
      return point
        ? {
            ...base,
            kind: 'anchoredVolumeProfile',
            point,
          }
        : null;
    }
    case 'table': {
      const point = parseAnchor(value.point);
      const textAlign: UserDrawingTextAlign =
        value.textAlign === 'center' || value.textAlign === 'right' ? value.textAlign : 'left';
      return point
        ? {
            ...base,
            kind: 'table',
            point,
            cells: normalizeUserDrawingTableCells(Array.isArray(value.cells) ? value.cells : undefined),
            textAlign,
          }
        : null;
    }
    case 'arrowMarkLeft':
    case 'arrowMarkRight':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'pin':
    case 'flagMark': {
      const point = parseAnchor(value.point);
      return point
        ? {
            ...base,
            kind: value.kind,
            point,
          }
        : null;
    }
    case 'icon': {
      const point = parseAnchor(value.point);
      return point
        ? {
            ...base,
            kind: 'icon',
            point,
            iconName: normalizeUserDrawingIconName(value.iconName),
          }
        : null;
    }
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'priceLabel':
    case 'emoji':
    case 'sticker':
    case 'balloon':
    case 'signpost': {
      const point = parseAnchor(value.point);
      if (!point || typeof value.text !== 'string') return null;
      const textAlign: UserDrawingTextAnnotation['textAlign'] =
        value.textAlign === 'left' || value.textAlign === 'right' || value.textAlign === 'center'
          ? value.textAlign
          : 'center';
      return {
        ...base,
        kind: value.kind,
        point,
        text: value.text,
        textAlign,
      };
    }
    case 'anchoredText':
    case 'anchoredNote': {
      const position = parsePanePosition(value.position);
      if (!position || typeof value.text !== 'string') return null;
      const textAlign: UserDrawingTextAnnotation['textAlign'] =
        value.textAlign === 'left' || value.textAlign === 'right' || value.textAlign === 'center'
          ? value.textAlign
          : 'center';
      return {
        ...base,
        kind: value.kind,
        position,
        text: value.text,
        textAlign,
      };
    }
    case 'callout':
    case 'priceNote': {
      const points = parseTwoPointDrawing(value);
      if (!points || typeof value.text !== 'string') return null;
      const textAlign: UserDrawingTextAnnotation['textAlign'] =
        value.textAlign === 'left' || value.textAlign === 'right' || value.textAlign === 'center'
          ? value.textAlign
          : 'center';
      return {
        ...base,
        kind: value.kind,
        points,
        text: value.text,
        textAlign,
      };
    }
    default:
      return null;
  }
}

export function serializeUserDrawingStateForLayout(state?: UserDrawingState | null): UserDrawingState | undefined {
  if (
    !state ||
    (state.drawings.length === 0 && state.stayInDrawingMode !== false && (state.magnetMode ?? 'off') === 'off')
  )
    return undefined;

  return createUserDrawingState({
    version: USER_DRAWING_LAYOUT_SCHEMA_VERSION,
    drawings: state.drawings.map(cloneUserDrawing),
    stayInDrawingMode: state.stayInDrawingMode !== false,
    magnetMode: state.magnetMode ?? 'off',
  });
}

export function deserializeUserDrawingStateFromLayout(state?: unknown): UserDrawingState | undefined {
  if (!isRecord(state) || !Array.isArray(state.drawings)) return undefined;
  const layoutVersion = isFiniteNumber(state.version) ? state.version : LEGACY_VERSIONLESS_USER_DRAWING_LAYOUT_SCHEMA_VERSION;
  if (layoutVersion > USER_DRAWING_LAYOUT_SCHEMA_VERSION) return undefined;

  const drawings = state.drawings.map(parseUserDrawing).filter((drawing): drawing is UserDrawing => drawing !== null);
  const magnetMode = state.magnetMode === 'weak' || state.magnetMode === 'strong' ? state.magnetMode : 'off';
  if (drawings.length === 0 && state.stayInDrawingMode !== false && magnetMode === 'off') return undefined;

  return createUserDrawingState({
    version: USER_DRAWING_LAYOUT_SCHEMA_VERSION,
    drawings,
    stayInDrawingMode: state.stayInDrawingMode !== false,
    magnetMode,
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

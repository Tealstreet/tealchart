import type {
  BoxDrawingOutput,
  DrawingLimits,
  DrawingObjectType,
  DrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  PolylineDrawingOutput,
} from './types';

export const DEFAULT_DRAWING_LIMITS: DrawingLimits = {
  label: 50,
  line: 50,
  box: 50,
  polyline: 50,
};

export const MAX_DRAWING_LIMITS: DrawingLimits = {
  label: 500,
  line: 500,
  box: 500,
  polyline: 100,
};

type LimitedDrawingType = Extract<DrawingObjectType, keyof DrawingLimits>;

function isLimitedDrawingType(type: DrawingObjectType | keyof DrawingLimits): type is LimitedDrawingType {
  return type === 'label' || type === 'line' || type === 'box' || type === 'polyline';
}

export class DrawingStore {
  readonly drawings: DrawingOutput[] = [];
  private limits: DrawingLimits = { ...DEFAULT_DRAWING_LIMITS };

  add(drawing: DrawingOutput): void {
    this.drawings.push(drawing);
    this.enforceLimit(drawing.type);
  }

  count(): number {
    return this.drawings.length;
  }

  setLimit(type: keyof DrawingLimits, value: number): void {
    const max = MAX_DRAWING_LIMITS[type];
    const normalizedValue = Number.isFinite(value) ? Math.trunc(value) : 0;
    this.limits[type] = Math.min(max, Math.max(0, normalizedValue));
    this.enforceLimit(type);
  }

  getLimit(type: keyof DrawingLimits): number {
    return this.limits[type];
  }

  getIds(type: DrawingObjectType): string[] {
    return this.drawings.filter((drawing) => drawing.type === type).map((drawing) => drawing.id);
  }

  markPersistentFrom(index: number): void {
    for (let i = index; i < this.drawings.length; i++) {
      const drawing = this.drawings[i];
      if (drawing) {
        drawing.persistent = true;
      }
    }
  }

  get(id: string): DrawingOutput | undefined {
    return this.drawings.find((drawing) => drawing.id === id);
  }

  delete(id: string): void {
    const index = this.drawings.findIndex((drawing) => drawing.id === id);
    if (index !== -1) {
      this.drawings.splice(index, 1);
    }
  }

  copyLabel(id: string, newId: string, barIndex: number): LabelDrawingOutput | undefined {
    const source = this.get(id);
    if (!source || source.type !== 'label') return undefined;
    if (this.get(newId)) return undefined;

    const copy: LabelDrawingOutput = {
      ...source,
      id: newId,
      barIndex,
      persistent: false,
    };
    this.drawings.push(copy);
    this.enforceLimit('label');
    return copy;
  }

  copyLine(id: string, newId: string, barIndex: number): LineDrawingOutput | undefined {
    const source = this.get(id);
    if (!source || source.type !== 'line') return undefined;
    if (this.get(newId)) return undefined;

    const copy: LineDrawingOutput = {
      ...source,
      id: newId,
      barIndex,
      persistent: false,
    };
    this.drawings.push(copy);
    this.enforceLimit('line');
    return copy;
  }

  copyBox(id: string, newId: string, barIndex: number): BoxDrawingOutput | undefined {
    const source = this.get(id);
    if (!source || source.type !== 'box') return undefined;
    if (this.get(newId)) return undefined;

    const copy: BoxDrawingOutput = {
      ...source,
      id: newId,
      barIndex,
      persistent: false,
    };
    this.drawings.push(copy);
    this.enforceLimit('box');
    return copy;
  }

  copyPolyline(id: string, newId: string, barIndex: number): PolylineDrawingOutput | undefined {
    const source = this.get(id);
    if (!source || source.type !== 'polyline') return undefined;
    if (this.get(newId)) return undefined;

    const copy: PolylineDrawingOutput = {
      ...source,
      id: newId,
      points: source.points.map((point) => ({ ...point })),
      barIndex,
      persistent: false,
    };
    this.drawings.push(copy);
    this.enforceLimit('polyline');
    return copy;
  }

  all(): DrawingOutput[] {
    return [...this.drawings];
  }

  truncateFromBarIndex(fromBarIndex: number): void {
    const keepCount = this.drawings.findIndex((drawing) => drawing.barIndex >= fromBarIndex);
    if (keepCount >= 0) {
      const prefix = this.drawings.slice(0, keepCount);
      const persistentTail = this.drawings.slice(keepCount).filter((drawing) => drawing.persistent);
      this.drawings.length = 0;
      this.drawings.push(...prefix, ...persistentTail);
    }
  }

  clear(): void {
    this.drawings.length = 0;
    this.limits = { ...DEFAULT_DRAWING_LIMITS };
  }

  private enforceLimit(type: DrawingObjectType | keyof DrawingLimits): void {
    if (!isLimitedDrawingType(type)) return;

    let excess = this.drawings.filter((drawing) => drawing.type === type).length - this.limits[type];
    while (excess > 0) {
      const oldestIndex = this.drawings.findIndex((drawing) => drawing.type === type);
      if (oldestIndex === -1) return;
      this.drawings.splice(oldestIndex, 1);
      excess--;
    }
  }
}

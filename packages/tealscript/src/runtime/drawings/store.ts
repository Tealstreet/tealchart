import type {
  BoxDrawingOutput,
  DrawingLimits,
  DrawingObjectType,
  DrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
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

export interface DrawingStoreSnapshot {
  drawings: DrawingOutput[];
  limits: DrawingLimits;
  deletedTableIds: string[];
}

function isLimitedDrawingType(type: DrawingObjectType | keyof DrawingLimits): type is LimitedDrawingType {
  return type === 'label' || type === 'line' || type === 'box' || type === 'polyline';
}

export class PineTableReference {
  constructor(readonly id: string) {
    Object.freeze(this);
  }

  toString(): string {
    return this.id;
  }
}

export class DrawingStore {
  readonly drawings: DrawingOutput[] = [];
  private readonly referenceTypes = new Map<string, DrawingObjectType>();
  private limits: DrawingLimits = { ...DEFAULT_DRAWING_LIMITS };
  private drawingsById?: Map<string, DrawingOutput>;
  private readonly deletedTableIds = new Set<string>();
  private readonly tableReferences = new Map<string, PineTableReference>();
  private readonly duplicateIds = new Set<string>();
  private countsByType?: Map<DrawingObjectType, number>;

  add(drawing: DrawingOutput): void {
    this.referenceTypes.set(drawing.id, drawing.type);
    this.drawings.push(drawing);
    if (this.countsByType) {
      this.countsByType.set(drawing.type, (this.countsByType.get(drawing.type) ?? 0) + 1);
    }
    if (this.drawingsById) {
      if (this.drawingsById.has(drawing.id)) this.duplicateIds.add(drawing.id);
      else this.drawingsById.set(drawing.id, drawing);
    }
    this.enforceLimit(drawing.type, true);
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

  markPersistent(id: string): void {
    const drawing = this.get(id);
    if (drawing) {
      drawing.persistent = true;
    }
  }

  get(id: string): DrawingOutput | undefined {
    if (!this.drawingsById) {
      this.drawingsById = new Map();
      this.duplicateIds.clear();
      for (const drawing of this.drawings) {
        if (this.drawingsById.has(drawing.id)) this.duplicateIds.add(drawing.id);
        else this.drawingsById.set(drawing.id, drawing);
      }
    }
    return this.drawingsById.get(id);
  }

  getReferenceType(id: string): DrawingObjectType | undefined {
    return this.referenceTypes.get(id);
  }

  delete(id: string): void {
    const drawing = this.get(id);
    if (!drawing) return;
    const index = this.drawings.indexOf(drawing);
    if (index !== -1) {
      const [removed] = this.drawings.splice(index, 1);
      if (removed) this.removeFromIndexes(removed);
      if (removed?.type === 'table') this.deletedTableIds.add(id);
      if (removed?.type === 'line' && this.typeCount('linefill') > 0) {
        for (let i = this.drawings.length - 1; i >= 0; i--) {
          const drawing = this.drawings[i];
          if (drawing?.type === 'linefill' && (drawing.line1 === id || drawing.line2 === id)) {
            this.drawings.splice(i, 1);
            this.removeFromIndexes(drawing);
          }
        }
      }
    }
  }

  private removeFromIndexes(drawing: DrawingOutput): void {
    if (this.countsByType) {
      this.countsByType.set(drawing.type, (this.countsByType.get(drawing.type) ?? 0) - 1);
    }
    if (this.drawingsById?.get(drawing.id) !== drawing) return;
    const next = this.duplicateIds.has(drawing.id)
      ? this.drawings.find((remaining) => remaining.id === drawing.id)
      : undefined;
    if (next) this.drawingsById.set(drawing.id, next);
    else {
      this.drawingsById.delete(drawing.id);
      this.duplicateIds.delete(drawing.id);
    }
  }

  private typeCount(type: DrawingObjectType): number {
    if (!this.countsByType) {
      this.countsByType = new Map();
      for (const drawing of this.drawings) {
        this.countsByType.set(drawing.type, (this.countsByType.get(drawing.type) ?? 0) + 1);
      }
    }
    return this.countsByType.get(type) ?? 0;
  }

  private invalidateIndexes(): void {
    this.drawingsById = undefined;
    this.countsByType = undefined;
    this.duplicateIds.clear();
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
    this.add(copy);
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
    this.add(copy);
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
    this.add(copy);
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
    this.add(copy);
    return copy;
  }

  copyLineFill(id: string, newId: string, barIndex: number): LineFillDrawingOutput | undefined {
    const source = this.get(id);
    if (!source || source.type !== 'linefill') return undefined;
    if (this.get(newId)) return undefined;

    const copy: LineFillDrawingOutput = {
      ...source,
      id: newId,
      barIndex,
      persistent: false,
    };
    this.add(copy);
    return copy;
  }

  getTableReference(id: string): PineTableReference {
    let reference = this.tableReferences.get(id);
    if (!reference) {
      reference = new PineTableReference(id);
      this.tableReferences.set(id, reference);
    }
    return reference;
  }

  resolveTableReference(value: unknown): unknown {
    return value instanceof PineTableReference && this.deletedTableIds.has(value.id) ? Number.NaN : value;
  }

  all(): DrawingOutput[] {
    return [...this.drawings];
  }

  snapshot(): DrawingStoreSnapshot {
    return {
      drawings: this.drawings.map(cloneDrawing),
      limits: { ...this.limits },
      deletedTableIds: [...this.deletedTableIds],
    };
  }

  restore(snapshot: DrawingStoreSnapshot): void {
    this.drawings.length = 0;
    this.invalidateIndexes();
    this.drawings.push(...snapshot.drawings.map(cloneDrawing));
    for (const drawing of this.drawings) this.referenceTypes.set(drawing.id, drawing.type);
    this.limits = { ...snapshot.limits };
    this.deletedTableIds.clear();
    for (const id of snapshot.deletedTableIds) this.deletedTableIds.add(id);
  }

  truncateFromBarIndex(fromBarIndex: number): void {
    const kept = this.drawings.filter((drawing) => drawing.barIndex < fromBarIndex || drawing.persistent);
    if (kept.length === this.drawings.length) return;
    this.drawings.length = 0;
    this.invalidateIndexes();
    this.drawings.push(...kept);
  }

  clear(): void {
    this.tableReferences.clear();
    this.deletedTableIds.clear();
    this.drawings.length = 0;
    this.referenceTypes.clear();
    this.invalidateIndexes();
    this.limits = { ...DEFAULT_DRAWING_LIMITS };
  }

  private enforceLimit(type: DrawingObjectType | keyof DrawingLimits, isCreation = false): void {
    if (!isLimitedDrawingType(type)) return;

    const count = this.typeCount(type);
    const limit = this.limits[type];
    const collectionThreshold =
      isCreation && (type === 'line' || type === 'label') ? limit + (limit > 0 ? 5 : 0) : limit;
    if (count <= collectionThreshold) return;

    let excess = count - limit;
    while (excess > 0) {
      const oldestIndex = this.drawings.findIndex((drawing) => drawing.type === type);
      if (oldestIndex === -1) return;
      this.delete(this.drawings[oldestIndex]!.id);
      excess--;
    }
  }
}

function cloneDrawing(drawing: DrawingOutput): DrawingOutput {
  if (drawing.type === 'polyline') {
    return {
      ...drawing,
      points: drawing.points.map((point) => ({ ...point })),
    };
  }
  if (drawing.type === 'table') {
    return {
      ...drawing,
      cells: drawing.cells.map((cell) => ({ ...cell })),
      mergedCells: drawing.mergedCells?.map((cell) => ({ ...cell })),
    };
  }
  return { ...drawing };
}

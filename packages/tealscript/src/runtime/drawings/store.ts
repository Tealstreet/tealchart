import type { BoxDrawingOutput, DrawingOutput, LabelDrawingOutput, LineDrawingOutput } from './types';

export class DrawingStore {
  readonly drawings: DrawingOutput[] = [];

  add(drawing: DrawingOutput): void {
    this.drawings.push(drawing);
  }

  count(): number {
    return this.drawings.length;
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
  }
}

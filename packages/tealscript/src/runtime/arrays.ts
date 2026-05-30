export interface PineArray<T = unknown> {
  readonly __tealscriptArray: true;
  values: T[];
}

export function createPineArray<T = unknown>(size: number = 0, initialValue?: T): PineArray<T> {
  const safeSize = Math.max(0, Math.trunc(size));
  return {
    __tealscriptArray: true,
    values: Array.from({ length: safeSize }, () => initialValue as T),
  };
}

export function isPineArray(value: unknown): value is PineArray {
  return Boolean(value && typeof value === 'object' && (value as PineArray).__tealscriptArray === true);
}

export function getArraySize(array: PineArray): number {
  return array.values.length;
}

export function getArrayValue<T = unknown>(array: PineArray<T>, index: number): T | undefined {
  return array.values[Math.trunc(index)];
}

export function setArrayValue<T = unknown>(array: PineArray<T>, index: number, value: T): void {
  array.values[Math.trunc(index)] = value;
}

export function pushArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  return array.values.push(value);
}

export function popArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  return array.values.pop();
}

export function shiftArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  return array.values.shift();
}

export function unshiftArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  return array.values.unshift(value);
}

export function clearArray(array: PineArray): void {
  array.values.length = 0;
}

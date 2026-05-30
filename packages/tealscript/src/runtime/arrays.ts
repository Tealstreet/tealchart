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

function normalizeExistingIndex(index: number, size: number): number {
  let normalizedIndex = Math.trunc(index);

  if (normalizedIndex < 0) {
    normalizedIndex = size + normalizedIndex;
  }

  if (normalizedIndex < 0 || normalizedIndex >= size) {
    throw new Error(`Array index ${Math.trunc(index)} is out of bounds. Array size is ${size}`);
  }

  return normalizedIndex;
}

export function setArrayValue<T = unknown>(array: PineArray<T>, index: number, value: T): void {
  array.values[normalizeExistingIndex(index, getArraySize(array))] = value;
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

export function copyArray<T = unknown>(array: PineArray<T>): PineArray<T> {
  return {
    __tealscriptArray: true,
    values: [...array.values],
  };
}

export function firstArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  return array.values[0];
}

export function lastArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  return array.values[array.values.length - 1];
}

export function includesArrayValue<T = unknown>(array: PineArray<T>, value: T): boolean {
  return array.values.includes(value);
}

export function indexOfArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  return array.values.indexOf(value);
}

export function lastIndexOfArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  return array.values.lastIndexOf(value);
}

export function insertArrayValue<T = unknown>(array: PineArray<T>, index: number, value: T): number {
  let normalizedIndex = Math.trunc(index);
  const size = getArraySize(array);

  if (normalizedIndex < 0) {
    normalizedIndex = size + normalizedIndex + 1;
  }

  if (normalizedIndex < 0 || normalizedIndex > size) {
    throw new Error(`Array index ${Math.trunc(index)} is out of bounds. Array size is ${size}`);
  }

  array.values.splice(normalizedIndex, 0, value);
  return getArraySize(array);
}

export function removeArrayValue<T = unknown>(array: PineArray<T>, index: number): T | undefined {
  return array.values.splice(normalizeExistingIndex(index, getArraySize(array)), 1)[0];
}

export function minArrayValue(array: PineArray): number {
  if (array.values.length === 0) return Number.NaN;
  return Math.min(...array.values.map(Number));
}

export function maxArrayValue(array: PineArray): number {
  if (array.values.length === 0) return Number.NaN;
  return Math.max(...array.values.map(Number));
}

export function sumArrayValue(array: PineArray): number {
  return array.values.reduce<number>((sum, value) => sum + Number(value), 0);
}

export function avgArrayValue(array: PineArray): number {
  if (array.values.length === 0) return Number.NaN;
  return sumArrayValue(array) / array.values.length;
}

export interface PineArray<T = unknown> {
  readonly __tealscriptArray: true;
  values: T[];
  view?: {
    parent: PineArray<T>;
    from: number;
    to: number;
  };
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
  if (array.view) {
    assertSliceBounds(array);
    return array.view.to - array.view.from;
  }
  return array.values.length;
}

export function getArrayValue<T = unknown>(array: PineArray<T>, index: number): T | undefined {
  if (array.view) {
    return getArrayValue(array.view.parent, array.view.from + normalizeExistingIndex(index, getArraySize(array)));
  }
  return array.values[Math.trunc(index)];
}

function getArrayValues<T = unknown>(array: PineArray<T>): T[] {
  return Array.from({ length: getArraySize(array) }, (_, index) => getArrayValue(array, index) as T);
}

function assertSliceBounds(array: PineArray): void {
  if (!array.view) return;
  const parentSize = getArraySize(array.view.parent);
  if (array.view.from < 0 || array.view.to > parentSize || array.view.from > array.view.to) {
    throw new Error('Slice is out of bounds of the parent array');
  }
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
  const normalizedIndex = normalizeExistingIndex(index, getArraySize(array));
  if (array.view) {
    setArrayValue(array.view.parent, array.view.from + normalizedIndex, value);
    return;
  }
  array.values[normalizedIndex] = value;
}

export function pushArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  if (array.view) {
    insertArrayValue(array.view.parent, array.view.to, value);
    array.view.to += 1;
    return getArraySize(array);
  }
  return array.values.push(value);
}

export function popArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  if (array.view) {
    const size = getArraySize(array);
    if (size === 0) return undefined;
    const value = removeArrayValue(array.view.parent, array.view.from + size - 1);
    array.view.to -= 1;
    return value;
  }
  return array.values.pop();
}

export function shiftArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  if (array.view) {
    if (getArraySize(array) === 0) return undefined;
    const value = removeArrayValue(array.view.parent, array.view.from);
    array.view.to -= 1;
    return value;
  }
  return array.values.shift();
}

export function unshiftArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  if (array.view) {
    insertArrayValue(array.view.parent, array.view.from, value);
    array.view.to += 1;
    return getArraySize(array);
  }
  return array.values.unshift(value);
}

export function clearArray(array: PineArray): void {
  if (array.view) {
    while (getArraySize(array) > 0) {
      removeArrayValue(array, 0);
    }
    return;
  }
  array.values.length = 0;
}

export function copyArray<T = unknown>(array: PineArray<T>): PineArray<T> {
  return {
    __tealscriptArray: true,
    values: getArrayValues(array),
  };
}

export function firstArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  return getArrayValue(array, 0);
}

export function lastArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  const size = getArraySize(array);
  return size === 0 ? undefined : getArrayValue(array, size - 1);
}

export function includesArrayValue<T = unknown>(array: PineArray<T>, value: T): boolean {
  return getArrayValues(array).includes(value);
}

export function indexOfArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  return getArrayValues(array).indexOf(value);
}

export function lastIndexOfArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  return getArrayValues(array).lastIndexOf(value);
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

  if (array.view) {
    insertArrayValue(array.view.parent, array.view.from + normalizedIndex, value);
    array.view.to += 1;
    return getArraySize(array);
  }

  array.values.splice(normalizedIndex, 0, value);
  return getArraySize(array);
}

export function removeArrayValue<T = unknown>(array: PineArray<T>, index: number): T | undefined {
  const normalizedIndex = normalizeExistingIndex(index, getArraySize(array));
  if (array.view) {
    const value = removeArrayValue(array.view.parent, array.view.from + normalizedIndex);
    array.view.to -= 1;
    return value;
  }

  return array.values.splice(normalizedIndex, 1)[0];
}

export function sortArray(array: PineArray, order: unknown = 'ascending'): void {
  const descending = order === 'descending';
  const values = getArrayValues(array);
  values.sort((left, right) => {
    const leftMissing = left === '' || (typeof left === 'number' && Number.isNaN(left));
    const rightMissing = right === '' || (typeof right === 'number' && Number.isNaN(right));

    if (leftMissing || rightMissing) {
      if (leftMissing && rightMissing) return 0;
      return leftMissing === descending ? -1 : 1;
    }

    const result = typeof left === 'number' && typeof right === 'number' ? left - right : compareStrings(String(left), String(right));
    return descending ? -result : result;
  });
  values.forEach((value, index) => setArrayValue(array, index, value));
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function reverseArray(array: PineArray): void {
  const values = getArrayValues(array).reverse();
  values.forEach((value, index) => setArrayValue(array, index, value));
}

export function joinArray(array: PineArray, separator: unknown = ''): string {
  return getArrayValues(array).join(String(separator));
}

export function concatArray<T = unknown>(array: PineArray<T>, other: PineArray<T>): PineArray<T> {
  getArrayValues(other).forEach((value) => pushArrayValue(array, value));
  return array;
}

export function sliceArray<T = unknown>(array: PineArray<T>, from: number, to: number): PineArray<T> {
  const normalizedFrom = Math.trunc(from);
  const normalizedTo = Math.trunc(to);
  if (!Number.isFinite(normalizedFrom) || !Number.isFinite(normalizedTo)) {
    throw new Error('Slice indices must be finite numbers');
  }
  if (normalizedFrom >= normalizedTo) {
    throw new Error("Index 'from' should be less than index 'to'");
  }
  if (normalizedFrom < 0 || normalizedTo > getArraySize(array)) {
    throw new Error('Slice is out of bounds of the parent array');
  }

  return {
    __tealscriptArray: true,
    values: [],
    view: {
      parent: array,
      from: normalizedFrom,
      to: normalizedTo,
    },
  };
}

function numericArrayValues(array: PineArray): number[] {
  return getArrayValues(array).map(Number).filter((value) => !Number.isNaN(value));
}

export function minArrayValue(array: PineArray): number {
  const values = numericArrayValues(array);
  return values.length === 0 ? Number.NaN : Math.min(...values);
}

export function maxArrayValue(array: PineArray): number {
  const values = numericArrayValues(array);
  return values.length === 0 ? Number.NaN : Math.max(...values);
}

export function sumArrayValue(array: PineArray): number {
  const values = numericArrayValues(array);
  return values.length === 0 ? Number.NaN : values.reduce((sum, value) => sum + value, 0);
}

export function avgArrayValue(array: PineArray): number {
  const values = numericArrayValues(array);
  return values.length === 0 ? Number.NaN : values.reduce((sum, value) => sum + value, 0) / values.length;
}

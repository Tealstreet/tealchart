import { getUdtField, isPineUdtObject, type PineUdtObject } from './objects';

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

export function sortArray(array: PineArray, order: unknown = 'ascending', sortField?: unknown): void {
  const descending = order === 'descending';
  const values = getArrayValues(array);
  values.sort((left, right) => {
    const leftValue = comparableArraySortValue(left, sortField);
    const rightValue = comparableArraySortValue(right, sortField);
    const result = compareArrayValues(leftValue, rightValue);
    return descending ? -result : result;
  });
  values.forEach((value, index) => setArrayValue(array, index, value));
}

export function sortIndicesArrayValue(array: PineArray, order: unknown = 'ascending'): PineArray<number> {
  const descending = order === 'descending';
  const indices = getArrayValues(array).map((_value, index) => index);
  indices.sort((leftIndex, rightIndex) => {
    const result = compareArrayValues(getArrayValue(array, leftIndex), getArrayValue(array, rightIndex));
    return descending ? -result : result;
  });

  const result = createPineArray<number>();
  indices.forEach((index) => pushArrayValue(result, index));
  return result;
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

function sortedNumericArrayValues(array: PineArray): number[] {
  return numericArrayValues(array).sort((left, right) => left - right);
}

function compareArrayValues(left: unknown, right: unknown): number {
  const leftMissing = left === '' || (typeof left === 'number' && Number.isNaN(left));
  const rightMissing = right === '' || (typeof right === 'number' && Number.isNaN(right));

  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return compareStrings(String(left), String(right));
}

function comparableArraySortValue(value: unknown, sortField: unknown): unknown {
  if (sortField === undefined) return value;
  if (!isPineUdtObject(value)) {
    throw new Error('Array sort_field requires user-defined type values');
  }
  if (typeof sortField === 'string') {
    return getUdtField(value, sortField);
  }
  if (typeof sortField === 'number') {
    return getUdtFieldByIndex(value, sortField);
  }
  throw new Error('Array sort_field must be a field name or field index');
}

function getUdtFieldByIndex(object: PineUdtObject, fieldIndex: number): unknown {
  const normalizedIndex = Math.trunc(Number(fieldIndex));
  if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= object.fields.size) {
    throw new Error(`Array sort_field index ${normalizedIndex} is out of bounds for type ${object.typeName}`);
  }
  return Array.from(object.fields.values())[normalizedIndex];
}

export function absArrayValue(array: PineArray): PineArray<number> {
  const result = createPineArray<number>();
  getArrayValues(array).forEach((value) => pushArrayValue(result, Math.abs(Number(value))));
  return result;
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

export function rangeArrayValue(array: PineArray): number {
  const values = numericArrayValues(array);
  return values.length === 0 ? Number.NaN : Math.max(...values) - Math.min(...values);
}

export function medianArrayValue(array: PineArray): number {
  const values = sortedNumericArrayValues(array);
  if (values.length === 0) return Number.NaN;

  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1]! + values[middle]!) / 2 : values[middle]!;
}

export function modeArrayValue(array: PineArray): number {
  const values = sortedNumericArrayValues(array);
  if (values.length === 0) return Number.NaN;

  let bestValue = values[0]!;
  let bestCount = 0;
  let currentValue = values[0]!;
  let currentCount = 0;

  for (const value of values) {
    if (Object.is(value, currentValue)) {
      currentCount++;
    } else {
      if (currentCount > bestCount) {
        bestValue = currentValue;
        bestCount = currentCount;
      }
      currentValue = value;
      currentCount = 1;
    }
  }

  return currentCount > bestCount ? currentValue : bestValue;
}

export function varianceArrayValue(array: PineArray, biased: boolean = true): number {
  const values = numericArrayValues(array);
  const length = values.length;
  if (length === 0 || (!biased && length < 2)) return Number.NaN;

  const mean = values.reduce((sum, value) => sum + value, 0) / length;
  const sumSquaredDeviation = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return sumSquaredDeviation / (biased ? length : length - 1);
}

export function stdevArrayValue(array: PineArray, biased: boolean = true): number {
  const variance = varianceArrayValue(array, biased);
  return Number.isNaN(variance) ? Number.NaN : Math.sqrt(variance);
}

export function covarianceArrayValue(left: PineArray, right: PineArray, biased: boolean = true): number {
  const pairs = getArrayValues(left).map((leftValue, index) => [Number(leftValue), Number(getArrayValue(right, index))]);
  const numericPairs = pairs.filter(([leftValue, rightValue]) => !Number.isNaN(leftValue) && !Number.isNaN(rightValue));
  const length = numericPairs.length;
  if (length === 0 || (!biased && length < 2)) return Number.NaN;

  const leftWindow = numericPairs.map(([value]) => value);
  const rightWindow = numericPairs.map(([, value]) => value);
  const leftMean = leftWindow.reduce((sum, value) => sum + value, 0) / length;
  const rightMean = rightWindow.reduce((sum, value) => sum + value, 0) / length;
  const covariance = leftWindow.reduce((sum, value, index) => {
    return sum + (value - leftMean) * (rightWindow[index] - rightMean);
  }, 0);

  return covariance / (biased ? length : length - 1);
}

export function percentileNearestRankArrayValue(array: PineArray, percentage: number): number {
  const values = sortedNumericArrayValues(array);
  if (values.length === 0 || !Number.isFinite(percentage)) return Number.NaN;

  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const rank = Math.ceil((clampedPercentage / 100) * values.length);
  return values[Math.max(0, rank - 1)]!;
}

export function percentileLinearInterpolationArrayValue(array: PineArray, percentage: number): number {
  const values = sortedNumericArrayValues(array);
  if (values.length === 0 || !Number.isFinite(percentage)) return Number.NaN;
  if (values.length === 1) return values[0]!;

  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const rank = (clampedPercentage / 100) * (values.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const fraction = rank - lowerIndex;
  return values[lowerIndex]! + (values[upperIndex]! - values[lowerIndex]!) * fraction;
}

export function percentRankArrayValue(array: PineArray, index: number): number {
  const values = numericArrayValues(array);
  if (values.length === 0) return Number.NaN;

  const reference = Number(getArrayValue(array, index));
  if (Number.isNaN(reference)) return Number.NaN;

  const lessOrEqualCount = values.filter((value) => value <= reference).length;
  return (lessOrEqualCount / values.length) * 100;
}

export function standardizeArrayValue(array: PineArray): PineArray<number> {
  const values = numericArrayValues(array);
  const result = createPineArray<number>();
  if (values.length === 0) return result;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const stdev = stdevArrayValue(array);
  values.forEach((value) => pushArrayValue(result, stdev === 0 || Number.isNaN(stdev) ? Number.NaN : (value - mean) / stdev));
  return result;
}

export function binarySearchArrayValue(array: PineArray, value: unknown): number {
  const values = getArrayValues(array);
  let low = 0;
  let high = values.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const comparison = compareArrayValues(values[middle], value);
    if (comparison === 0) return middle;
    if (comparison < 0) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return -1;
}

export function binarySearchLeftmostArrayValue(array: PineArray, value: unknown): number {
  const values = getArrayValues(array);
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (compareArrayValues(values[middle], value) < 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return values[low] !== undefined && compareArrayValues(values[low], value) === 0 ? low : low - 1;
}

export function binarySearchRightmostArrayValue(array: PineArray, value: unknown): number {
  const values = getArrayValues(array);
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (compareArrayValues(values[middle], value) <= 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const foundIndex = low - 1;
  return foundIndex >= 0 && compareArrayValues(values[foundIndex], value) === 0 ? foundIndex : low;
}

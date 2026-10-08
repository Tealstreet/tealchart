import type { PineUdtObject } from './objects';

import { getUdtField, isPineUdtObject } from './objects';
import { PineRuntimeArgumentError } from './runtimeArgumentError';

const arraySearchState = Symbol('arraySearchState');

export interface PineArray<T = unknown> {
  [arraySearchState]?: ArraySearchState;
  readonly __tealscriptArray: true;
  persistent?: boolean;
  readOnly?: boolean;
  elementType?: 'udt';
  values: T[];
  view?: {
    parent: PineArray<T>;
    from: number;
    to: number;
  };
}

interface ArraySearchState {
  values: unknown[];
  frontValues?: unknown[];
  exposed: boolean;
  searches: number;
  firstIndices?: Map<unknown, number>;
}

function exposeArrayValues(this: PineArray): unknown[] {
  const state = this[arraySearchState]!;
  const values = arrayStorage(this);
  state.exposed = true;
  state.firstIndices = undefined;
  return values;
}

function replaceArrayValues(this: PineArray, values: unknown[]): void {
  const state = this[arraySearchState]!;
  state.values = values;
  state.frontValues = undefined;
  state.exposed = true;
  state.firstIndices = undefined;
}

function arrayStorage<T>(array: PineArray<T>): T[] {
  const state = array[arraySearchState];
  if (!state) return array.values;
  if (state.frontValues?.length) {
    state.values = copyArrayStorage(state);
    state.frontValues = undefined;
  }
  return state.values as T[];
}

function copyArrayStorage(state: ArraySearchState): unknown[] {
  const front = state.frontValues;
  if (!front?.length) return Array.from(state.values);
  const values = new Array(front.length + state.values.length);
  for (let index = 0; index < front.length; index++) values[index] = front[front.length - 1 - index];
  for (let index = 0; index < state.values.length; index++) values[front.length + index] = state.values[index];
  return values;
}

function invalidateArraySearch(array: PineArray): void {
  const state = array[arraySearchState];
  if (state) {
    state.firstIndices = undefined;
    state.searches = 0;
  }
}

const MAX_ARRAY_SIZE = 100_000;

export interface ArrayRuntimeApproximation {
  site: string;
  message: string;
}

type ArrayRuntimeApproximationReporter = (approximation: ArrayRuntimeApproximation) => void;

const arrayRuntimeApproximationReporters: ArrayRuntimeApproximationReporter[] = [];

export function pushArrayRuntimeApproximationReporter(reporter: ArrayRuntimeApproximationReporter): () => void {
  arrayRuntimeApproximationReporters.push(reporter);
  return () => {
    const index = arrayRuntimeApproximationReporters.lastIndexOf(reporter);
    if (index >= 0) arrayRuntimeApproximationReporters.splice(index, 1);
  };
}

export function normalizeArraySize(size: number): number {
  const safeSize = Math.trunc(Number(size));
  if (!Number.isFinite(safeSize) || safeSize < 0) {
    throw new Error('Cannot create an array with a negative size');
  }
  if (safeSize > MAX_ARRAY_SIZE) {
    throw new Error(`Array is too large. Maximum size is ${MAX_ARRAY_SIZE}`);
  }
  return safeSize;
}

export function createPineArray<T = unknown>(size: number = 0, initialValue?: T): PineArray<T> {
  const safeSize = normalizeArraySize(size);
  const value = initialValue === undefined ? Number.NaN : initialValue;
  const state: ArraySearchState = {
    values: safeSize === 0 ? [] : new Array<T>(safeSize).fill(value as T),
    exposed: false,
    searches: 0,
  };
  const array = {
    __tealscriptArray: true,
    elementType: isPineUdtObject(value) ? 'udt' : undefined,
  } as PineArray<T>;
  Object.defineProperty(array, arraySearchState, { value: state });
  Object.defineProperty(array, 'values', {
    get: exposeArrayValues,
    set: replaceArrayValues,
    enumerable: true,
    configurable: true,
  });
  return array;
}

export function isPineArray(value: unknown): value is PineArray {
  return Boolean(value && typeof value === 'object' && (value as PineArray).__tealscriptArray === true);
}

export function createReadOnlyPineArray<T>(values: T[]): PineArray<T> {
  const rejectMutation = (): never => {
    throw new Error('Array is read-only');
  };
  return {
    __tealscriptArray: true,
    readOnly: true,
    values: new Proxy([...values], { set: rejectMutation, deleteProperty: rejectMutation }),
  };
}

export function withUdtArrayElementType<T>(value: T): T {
  if (isPineArray(value)) value.elementType = 'udt';
  return value;
}

export function asReadOnlyPineArray<T>(array: PineArray<T>): PineArray<T> {
  return {
    ...array,
    ...createReadOnlyPineArray(getArrayValues(array)),
    // The copied element values already flatten a slice's parent view.
    view: undefined,
  };
}

export function getArraySize(array: PineArray): number {
  if (array.view) {
    assertSliceBounds(array);
    return array.view.to - array.view.from;
  }
  const state = array[arraySearchState];
  return state ? state.values.length + (state.frontValues?.length ?? 0) : array.values.length;
}

export function getArrayValue<T = unknown>(array: PineArray<T>, index: number): T | undefined {
  if (Number.isNaN(index)) {
    // Missing warmup indices yield na, but invalidated slices still error.
    getArraySize(array);
    return Number.NaN as T;
  }
  if (array.view) {
    return getArrayValue(
      array.view.parent,
      array.view.from + normalizeExistingIndex(Math.floor(index), getArraySize(array)),
    );
  }
  const state = array[arraySearchState];
  const front = state?.frontValues;
  if (front?.length) {
    const size = front.length + state!.values.length;
    const normalizedIndex =
      Number.isInteger(index) && index >= 0 && index < size ? index : normalizeExistingIndex(Math.floor(index), size);
    return (
      normalizedIndex < front.length
        ? front[front.length - 1 - normalizedIndex]
        : state!.values[normalizedIndex - front.length]
    ) as T;
  }
  const values = (state?.values as T[] | undefined) ?? array.values;
  if (Number.isInteger(index) && index >= 0 && index < values.length) return values[index];
  const normalizedIndex = normalizeExistingIndex(Math.floor(index), values.length);
  return values[normalizedIndex];
}

function getArrayValues<T = unknown>(array: PineArray<T>): T[] {
  if (!array.view) {
    const state = array[arraySearchState];
    return state ? (copyArrayStorage(state) as T[]) : Array.from(array.values);
  }
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

  if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= size) {
    throw new Error(`Array index ${Math.trunc(index)} is out of bounds. Array size is ${size}`);
  }

  return normalizedIndex;
}

export function setArrayValue<T = unknown>(array: PineArray<T>, index: number, value: T): void {
  if (isPineUdtObject(value)) array.elementType = 'udt';
  invalidateArraySearch(array);
  const normalizedIndex = normalizeExistingIndex(Math.floor(index), getArraySize(array));
  if (array.view) {
    setArrayValue(array.view.parent, array.view.from + normalizedIndex, value);
    return;
  }
  const state = array[arraySearchState];
  const front = state?.frontValues;
  if (front?.length) {
    if (normalizedIndex < front.length) front[front.length - 1 - normalizedIndex] = value;
    else state!.values[normalizedIndex - front.length] = value;
    return;
  }
  arrayStorage(array)[normalizedIndex] = value;
}

export function pushArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  if (isPineUdtObject(value)) array.elementType = 'udt';
  if (array.view) {
    insertArrayValue(array.view.parent, array.view.to, value);
    array.view.to += 1;
    return getArraySize(array);
  }
  const state = array[arraySearchState];
  const values = (state?.values as T[] | undefined) ?? array.values;
  const size = values.length + (state?.frontValues?.length ?? 0);
  if (size + 1 > MAX_ARRAY_SIZE) {
    throw new Error(`Array is too large. Maximum size is ${MAX_ARRAY_SIZE}`);
  }
  const firstIndices = state?.firstIndices;
  if (firstIndices && !firstIndices.has(value)) firstIndices.set(value, size);
  values.push(value);
  return size + 1;
}

export function popArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  invalidateArraySearch(array);
  if (array.view) {
    const size = getArraySize(array);
    if (size === 0) throw new Error('Cannot use pop() if array is empty.');
    const value = removeArrayValue(array.view.parent, array.view.from + size - 1);
    array.view.to -= 1;
    return value;
  }
  const state = array[arraySearchState];
  if (state?.values.length) return state.values.pop() as T;
  if (getArraySize(array) === 0) throw new Error('Cannot use pop() if array is empty.');
  return arrayStorage(array).pop();
}

export function shiftArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  invalidateArraySearch(array);
  if (array.view) {
    if (getArraySize(array) === 0) throw new Error('Cannot use shift() if array is empty.');
    const value = removeArrayValue(array.view.parent, array.view.from);
    array.view.to -= 1;
    return value;
  }
  const front = array[arraySearchState]?.frontValues;
  if (front?.length) return front.pop() as T;
  if (getArraySize(array) === 0) throw new Error('Cannot use shift() if array is empty.');
  return arrayStorage(array).shift();
}

export function unshiftArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  if (isPineUdtObject(value)) array.elementType = 'udt';
  invalidateArraySearch(array);
  if (array.view) {
    insertArrayValue(array.view.parent, array.view.from, value);
    array.view.to += 1;
    return getArraySize(array);
  }
  assertCanGrowArray(array, 1);
  const state = array[arraySearchState];
  if (state && !state.exposed && !array.readOnly) {
    (state.frontValues ??= []).push(value);
    return state.values.length + state.frontValues.length;
  }
  return arrayStorage(array).unshift(value);
}

export function clearArray(array: PineArray): void {
  invalidateArraySearch(array);
  if (array.view) {
    while (getArraySize(array) > 0) {
      removeArrayValue(array, 0);
    }
    return;
  }
  const state = array[arraySearchState];
  if (state) state.frontValues = undefined;
  arrayStorage(array).length = 0;
}

export function copyArray<T = unknown>(array: PineArray<T>, preserveReadOnly = false): PineArray<T> {
  const values = getArrayValues(array);
  const copy: PineArray<T> =
    preserveReadOnly && array.readOnly
      ? createReadOnlyPineArray(values)
      : {
          __tealscriptArray: true,
          values,
        };
  copy.persistent = array.persistent;
  copy.elementType = array.elementType;
  return copy;
}

export function firstArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  return getArrayValue(array, 0);
}

export function lastArrayValue<T = unknown>(array: PineArray<T>): T | undefined {
  return getArrayValue(array, -1);
}

export function includesArrayValue<T = unknown>(array: PineArray<T>, value: T): boolean {
  if (!array.view) return arrayStorage(array).indexOf(value) >= 0;
  return getArrayValues(array).indexOf(value) >= 0;
}

export function indexOfArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  if (!array.view) {
    const state = array[arraySearchState];
    const values = arrayStorage(array);
    if (state && !state.exposed && values.length >= 128 && ++state.searches >= 32) {
      if (typeof value === 'number' && Number.isNaN(value)) return -1;
      if (!state.firstIndices) {
        state.firstIndices = new Map();
        for (let index = 0; index < values.length; index += 1) {
          const entry = values[index];
          if (!state.firstIndices.has(entry)) state.firstIndices.set(entry, index);
        }
      }
      return state.firstIndices.get(value) ?? -1;
    }
    if (value === undefined) {
      for (let index = 0; index < values.length; index += 1) {
        if (values[index] === undefined) return index;
      }
      return -1;
    }
    return values.indexOf(value);
  }
  return getArrayValues(array).indexOf(value);
}

export function lastIndexOfArrayValue<T = unknown>(array: PineArray<T>, value: T): number {
  if (!array.view) {
    if (value === undefined) {
      for (let index = arrayStorage(array).length - 1; index >= 0; index -= 1) {
        if (arrayStorage(array)[index] === undefined) return index;
      }
      return -1;
    }
    return arrayStorage(array).lastIndexOf(value);
  }
  return getArrayValues(array).lastIndexOf(value);
}

export function insertArrayValue<T = unknown>(array: PineArray<T>, index: number, value: T): number {
  if (isPineUdtObject(value)) array.elementType = 'udt';
  invalidateArraySearch(array);
  let normalizedIndex = Math.trunc(index);
  const size = getArraySize(array);

  if (normalizedIndex < 0) {
    normalizedIndex = size + normalizedIndex;
  }

  if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex > size) {
    throw new Error(`Array index ${Math.trunc(index)} is out of bounds. Array size is ${size}`);
  }

  if (array.view) {
    insertArrayValue(array.view.parent, array.view.from + normalizedIndex, value);
    array.view.to += 1;
    return getArraySize(array);
  }

  assertCanGrowArray(array, 1);
  arrayStorage(array).splice(normalizedIndex, 0, value);
  return getArraySize(array);
}

export function removeArrayValue<T = unknown>(array: PineArray<T>, index: number): T | undefined {
  invalidateArraySearch(array);
  const normalizedIndex = normalizeExistingIndex(index, getArraySize(array));
  if (array.view) {
    const value = removeArrayValue(array.view.parent, array.view.from + normalizedIndex);
    array.view.to -= 1;
    return value;
  }

  return arrayStorage(array).splice(normalizedIndex, 1)[0];
}

function isDescendingOrder(order: unknown): boolean {
  return order === 'descending' || order === 'order.descending';
}

export function sortArray(array: PineArray, order: unknown = 'ascending', sortField?: unknown): void {
  const descending = isDescendingOrder(order);
  const values = getArrayValues(array);
  const field = resolveArraySortField(array, values, sortField);
  values.sort((left, right) => {
    const leftValue = comparableArraySortValue(left, field);
    const rightValue = comparableArraySortValue(right, field);
    const result = compareArrayValues(leftValue, rightValue);
    return descending ? -result : result;
  });
  values.forEach((value, index) => setArrayValue(array, index, value));
}

export function sortIndicesArrayValue(
  array: PineArray,
  order: unknown = 'ascending',
  sortField?: unknown,
): PineArray<number> {
  const descending = isDescendingOrder(order);
  const values = getArrayValues(array);
  const field = resolveArraySortField(array, values, sortField);
  const indices = values.map((_value, index) => index);
  indices.sort((leftIndex, rightIndex) => {
    const leftValue = comparableArraySortValue(values[leftIndex], field);
    const rightValue = comparableArraySortValue(values[rightIndex], field);
    const result = compareArrayValues(leftValue, rightValue);
    const tieOrder =
      isMissingArraySortValue(leftValue) || isMissingArraySortValue(rightValue) ? 0 : rightIndex - leftIndex;
    return descending ? -result || tieOrder : result;
  });

  const result = createPineArray<number>();
  indices.forEach((index) => pushArrayValue(result, index));
  return result;
}

export function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function reverseArray(array: PineArray): void {
  const values = getArrayValues(array).reverse();
  values.forEach((value, index) => setArrayValue(array, index, value));
}

export function joinArray(array: PineArray, separator: unknown = '', useV5NumericFormatting = false): string {
  const values = getArrayValues(array);
  const formatted = useV5NumericFormatting ? values.map((value) => (
    typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value)
      ? Number(value.toPrecision(16)) : value
  )) : values;
  return formatted.join(String(separator));
}

export function concatArray<T = unknown>(array: PineArray<T>, other: PineArray<T>): PineArray<T> {
  assertCanGrowArray(array, getArraySize(other));
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
    persistent: array.persistent,
    readOnly: array.readOnly,
    elementType: array.elementType,
    values: [],
    view: {
      parent: array,
      from: normalizedFrom,
      to: normalizedTo,
    },
  };
}

function numericArrayValues(array: PineArray): number[] {
  const values = getArrayValues(array);
  let count = 0;
  for (let index = 0; index < values.length; index++) {
    const value = Number(values[index]);
    if (!Number.isNaN(value)) values[count++] = value;
  }
  values.length = count;
  return values as number[];
}

function sortedNumericArrayValues(array: PineArray): number[] {
  return numericArrayValues(array).sort((left, right) => left - right);
}

export function selectNumericArrayRanks(values: number[], ranks: number[]): number[] {
  const indices = values.map((_value, index) => index);
  const compare = (left: number, right: number): number => {
    const a = values[left]!;
    const b = values[right]!;
    return a === b ? left - right : a < b ? -1 : 1;
  };
  return ranks.map((rank) => {
    if (rank < 0 || rank >= indices.length) return Number.NaN;
    let left = 0;
    let right = indices.length - 1;
    while (left < right) {
      const pivot = indices[(left + right) >>> 1]!;
      let lower = left;
      let upper = right;
      while (lower <= upper) {
        while (compare(indices[lower]!, pivot) < 0) lower++;
        while (compare(indices[upper]!, pivot) > 0) upper--;
        if (lower <= upper) {
          const temporary = indices[lower]!;
          indices[lower] = indices[upper]!;
          indices[upper] = temporary;
          lower++;
          upper--;
        }
      }
      if (rank <= upper) right = upper;
      else if (rank >= lower) left = lower;
      else break;
    }
    return values[indices[rank]!]!;
  });
}

function isMissingArraySortValue(value: unknown): boolean {
  return value === '' || (typeof value === 'number' && Number.isNaN(value));
}

function compareArrayValues(left: unknown, right: unknown): number {
  const leftMissing = isMissingArraySortValue(left);
  const rightMissing = isMissingArraySortValue(right);

  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return compareStrings(String(left), String(right));
}

function resolveArraySortField(array: PineArray, values: readonly unknown[], sortField: unknown): unknown {
  const field =
    sortField === undefined && (array.elementType === 'udt' || values.some(isPineUdtObject)) ? 0 : sortField;
  if (field !== undefined && values.some((value) => !isPineUdtObject(value))) {
    throw new Error('Array sort_field requires user-defined type values; cannot sort na object IDs');
  }
  return field;
}

function comparableArraySortValue(value: unknown, sortField: unknown): unknown {
  if (sortField === undefined) return isPineUdtObject(value) ? getUdtFieldByIndex(value, 0) : value;
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

function assertCanGrowArray(array: PineArray, additionalElements: number): void {
  if (getArraySize(array) + additionalElements > MAX_ARRAY_SIZE) {
    throw new Error(`Array is too large. Maximum size is ${MAX_ARRAY_SIZE}`);
  }
}

export function absArrayValue(array: PineArray): PineArray<number> {
  const result = createPineArray<number>();
  getArrayValues(array).forEach((value) => pushArrayValue(result, Math.abs(Number(value))));
  return result;
}

function arrayRankIndex(nth: unknown): number {
  const value = Number(nth);
  if (Number.isNaN(value)) return 0;
  return Math.trunc(value);
}

export function minArrayValue(array: PineArray, nth: unknown = 0): number {
  const values = numericArrayValues(array);
  const index = arrayRankIndex(nth);
  if (index === 0 && values.length > 0) {
    let result = values[0]!;
    for (let offset = 1; offset < values.length; offset++) {
      const value = values[offset]!;
      if (value < result) result = value;
    }
    return result;
  }
  return values.length === 0 || index < 0 || index >= values.length
    ? Number.NaN
    : values.sort((left, right) => left - right)[index]!;
}

export function maxArrayValue(array: PineArray, nth: unknown = 0): number {
  const values = numericArrayValues(array);
  const index = arrayRankIndex(nth);
  if (index === 0 && values.length > 0) {
    let result = values[0]!;
    for (let offset = 1; offset < values.length; offset++) {
      const value = values[offset]!;
      if (value > result) result = value;
    }
    return result;
  }
  return values.length === 0 || index < 0 || index >= values.length
    ? Number.NaN
    : values.sort((left, right) => right - left)[index]!;
}

export function sumArrayValue(array: PineArray): number {
  const state = array[arraySearchState];
  if (state && !state.exposed && !array.view) {
    const values = arrayStorage(array);
    let sum = 0;
    let count = 0;
    let numeric = true;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (typeof value !== 'number') {
        numeric = false;
        break;
      }
      if (!Number.isNaN(value)) {
        sum += value;
        count++;
      }
    }
    if (numeric) return count === 0 ? Number.NaN : sum;
  }
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
  const values = numericArrayValues(array);
  if (values.length === 0) return Number.NaN;

  const middle = Math.floor(values.length / 2);
  if (values.length % 2 !== 0) return selectNumericArrayRanks(values, [middle])[0]!;
  const selected = selectNumericArrayRanks(values, [middle - 1, middle]);
  return (selected[0]! + selected[1]!) / 2;
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
  const state = array[arraySearchState];
  if (state && !state.exposed && !array.view) {
    const values = arrayStorage(array);
    const length = values.length;
    let sum = 0;
    let numeric = true;
    for (let index = 0; index < length; index++) {
      const value = values[index];
      if (typeof value !== 'number' || Number.isNaN(value)) {
        numeric = false;
        break;
      }
      sum += value;
    }
    if (numeric) {
      if (length === 0 || (!biased && length < 2)) return Number.NaN;
      const mean = sum / length;
      if (biased) {
        let sumSquares = 0;
        for (let index = 0; index < length; index++) {
          const value = values[index] as number;
          sumSquares += value * value;
        }
        return Math.max(0, sumSquares / length - mean * mean);
      }
      let sumSquaredDeviation = 0;
      for (let index = 0; index < length; index++) {
        sumSquaredDeviation += ((values[index] as number) - mean) ** 2;
      }
      return sumSquaredDeviation / (length - 1);
    }
  }
  const values = numericArrayValues(array);
  const length = values.length;
  if (length === 0 || (!biased && length < 2)) return Number.NaN;

  const mean = values.reduce((sum, value) => sum + value, 0) / length;
  if (biased) {
    const meanSquare = values.reduce((sum, value) => sum + value * value, 0) / length;
    return Math.max(0, meanSquare - mean * mean);
  }
  const sumSquaredDeviation = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return sumSquaredDeviation / (length - 1);
}

export function stdevArrayValue(array: PineArray, biased: boolean = true): number {
  const variance = varianceArrayValue(array, biased);
  return Number.isNaN(variance) ? Number.NaN : Math.sqrt(variance);
}

export function covarianceArrayValue(left: PineArray, right: PineArray, biased: boolean = true): number {
  const rightSize = getArraySize(right);
  if (getArraySize(left) !== rightSize) {
    throw new PineRuntimeArgumentError('The sizes of the `id1` and `id2` arrays must be equal.', 'RE10073');
  }
  const pairs = getArrayValues(left).map((leftValue, index) => [
    Number(leftValue),
    index < rightSize ? Number(getArrayValue(right, index)) : NaN,
  ]);
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

function selectNumericArrayRank(values: number[], rank: number): number {
  if (rank < 0 || rank >= values.length) return Number.NaN;
  // Numeric ties share bits except signed zero; retain its original stable-sort order.
  let negativeCount = 0;
  let zeros: number[] | undefined;
  for (let index = 0; index < values.length; index++) {
    const value = values[index]!;
    if (value < 0) negativeCount++;
    else if (value === 0) (zeros ??= []).push(value);
  }
  if (zeros && rank >= negativeCount && rank < negativeCount + zeros.length) {
    return zeros[rank - negativeCount]!;
  }
  let left = 0;
  let right = values.length - 1;
  while (left < right) {
    const pivot = values[(left + right) >>> 1]!;
    let lower = left;
    let upper = right;
    while (lower <= upper) {
      while (values[lower]! < pivot) lower++;
      while (values[upper]! > pivot) upper--;
      if (lower <= upper) {
        const temporary = values[lower]!;
        values[lower] = values[upper]!;
        values[upper] = temporary;
        lower++;
        upper--;
      }
    }
    if (rank <= upper) right = upper;
    else if (rank >= lower) left = lower;
    else break;
  }
  return values[rank]!;
}

export function percentileNearestRankArrayValue(array: PineArray, percentage: number): number {
  const values = numericArrayValues(array);
  if (values.length === 0) return Number.NaN;
  if (Number.isNaN(percentage)) return selectNumericArrayRank(values, 0);
  if (!Number.isFinite(percentage)) return Number.NaN;

  if (percentage < 0 || percentage > 100) {
    throw new PineRuntimeArgumentError(
      `Invalid value of the 'percentage' argument (${percentage}) in the 'array.percentile_nearest_rank' function. It must be in the range [0..100].`,
    );
  }
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const rank = Math.ceil((clampedPercentage / 100) * getArraySize(array));
  return selectNumericArrayRank(values, Math.max(0, rank - 1));
}

export function percentileLinearInterpolationArrayValue(array: PineArray, percentage: number): number {
  const values = numericArrayValues(array);
  if (values.length === 0 || !Number.isFinite(percentage)) return Number.NaN;

  if (percentage < 0 || percentage > 100) {
    throw new PineRuntimeArgumentError(
      `Invalid value of the 'percentage' argument (${percentage}) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100].`,
      'RE10002',
    );
  }
  const size = getArraySize(array);
  const rank = Math.max(0, Math.min(size - 1, (percentage / 100) * size - 0.5));
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  if (lowerIndex !== upperIndex && values.length !== size) return Number.NaN;
  const fraction = rank - lowerIndex;
  const selected = selectNumericArrayRanks(values, [lowerIndex, upperIndex]);
  return selected[0]! + (selected[1]! - selected[0]!) * fraction;
}

export function percentRankArrayValue(array: PineArray, index: number): number {
  const size = getArraySize(array);
  if (size === 0) return Number.NaN;
  if (Number.isNaN(index)) return 0;
  const normalizedIndex = Math.trunc(Number(index));
  if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= size) {
    throw new Error(`Array index ${Math.trunc(index)} is out of bounds. Array size is ${size}`);
  }
  const reference = Number(getArrayValue(array, normalizedIndex));
  const values = numericArrayValues(array);
  if (values.length === 0) return Number.NaN;
  if (Number.isNaN(reference)) return Number.NaN;

  const lessOrEqualCount = values.filter((value) => value <= reference).length;
  if (values.length <= 2 || values.length !== size || values.some((value) => value < 0 || !Number.isFinite(value))) {
    return (lessOrEqualCount / values.length) * 100;
  }
  const distinctCount = new Set(values).size;
  const capturedMiddleTie =
    values.length === 4 &&
    distinctCount === 3 &&
    lessOrEqualCount === 3 &&
    values.filter((value) => value === reference).length === 2;
  if (distinctCount !== values.length && !capturedMiddleTie) {
    return (lessOrEqualCount / values.length) * 100;
  }
  // Native v7 midpoint and v14 minimum/tie captures pin normalization and multiply-before-divide.
  // Uncaptured tie shapes, negative/nonfinite elements, holes and sizes 1/2 retain prior behavior.
  return ((lessOrEqualCount - 1) * 100) / (values.length - 1);
}

export function standardizeArrayValue(array: PineArray): PineArray<number> {
  const values = numericArrayValues(array);
  if (values.length === 0) return createPineArray<number>(getArraySize(array), Number.NaN);
  const result = createPineArray<number>();

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const stdev = stdevArrayValue(array);
  getArrayValues(array).forEach((value) => {
    const numericValue = Number(value);
    pushArrayValue(
      result,
      Number.isNaN(numericValue) || stdev === 0 || Number.isNaN(stdev) ? Number.NaN : (numericValue - mean) / stdev,
    );
  });
  return result;
}

function binarySearchComparableValues(array: PineArray, sortField?: unknown): unknown[] {
  return getArrayValues(array).map((arrayValue) => comparableArraySortValue(arrayValue, sortField));
}

export function binarySearchArrayValue(array: PineArray, value: unknown, sortField?: unknown): number {
  const values = binarySearchComparableValues(array, sortField);
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

export function binarySearchLeftmostArrayValue(array: PineArray, value: unknown, sortField?: unknown): number {
  const values = binarySearchComparableValues(array, sortField);
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

  if (low === 0 && values.length > 0) return 0;

  return values[low] !== undefined && compareArrayValues(values[low], value) === 0 ? low : low - 1;
}

export function binarySearchRightmostArrayValue(array: PineArray, value: unknown, sortField?: unknown): number {
  const values = binarySearchComparableValues(array, sortField);
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

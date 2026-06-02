import { createPineArray, pushArrayValue, type PineArray } from './arrays';

type PineMapKey = string | number | boolean;

export interface PineMap<K extends PineMapKey = PineMapKey, V = unknown> {
  readonly __tealscriptMap: true;
  entries: Map<K, V>;
}

export function createPineMap<K extends PineMapKey = PineMapKey, V = unknown>(): PineMap<K, V> {
  return {
    __tealscriptMap: true,
    entries: new Map<K, V>(),
  };
}

export function isPineMap(value: unknown): value is PineMap {
  return Boolean(value && typeof value === 'object' && (value as PineMap).__tealscriptMap === true);
}

export function getMapSize(map: PineMap): number {
  return map.entries.size;
}

export function putMapValue<K extends PineMapKey = PineMapKey, V = unknown>(map: PineMap<K, V>, key: unknown, value: V): V | number {
  assertMapCapacity(map, key);
  const normalizedKey = normalizeMapKey(key) as K;
  const previousValue = map.entries.has(normalizedKey) ? (map.entries.get(normalizedKey) as V) : Number.NaN;
  map.entries.set(normalizedKey, value);
  return previousValue;
}

export function getMapValue<V = unknown>(map: PineMap<PineMapKey, V>, key: unknown): V | number {
  const normalizedKey = normalizeMapKey(key);
  return map.entries.has(normalizedKey) ? (map.entries.get(normalizedKey) as V) : Number.NaN;
}

export function containsMapKey(map: PineMap, key: unknown): boolean {
  return map.entries.has(normalizeMapKey(key));
}

export function removeMapValue<V = unknown>(map: PineMap<PineMapKey, V>, key: unknown): V | number {
  const normalizedKey = normalizeMapKey(key);
  if (!map.entries.has(normalizedKey)) return Number.NaN;
  const value = map.entries.get(normalizedKey) as V;
  map.entries.delete(normalizedKey);
  return value;
}

export function clearMap(map: PineMap): void {
  map.entries.clear();
}

export function copyMap<K extends PineMapKey = PineMapKey, V = unknown>(map: PineMap<K, V>): PineMap<K, V> {
  return {
    __tealscriptMap: true,
    entries: new Map(map.entries),
  };
}

export function mapKeys<K extends PineMapKey = PineMapKey>(map: PineMap<K>): PineArray<K> {
  const keys = createPineArray<K>();
  for (const key of map.entries.keys()) {
    pushArrayValue(keys, key);
  }
  return keys;
}

export function mapValues<V = unknown>(map: PineMap<PineMapKey, V>): PineArray<V> {
  const values = createPineArray<V>();
  for (const value of map.entries.values()) {
    pushArrayValue(values, value);
  }
  return values;
}

export function putAllMapValues<K extends PineMapKey = PineMapKey, V = unknown>(target: PineMap<K, V>, source: PineMap<K, V>): void {
  for (const [key, value] of source.entries) {
    assertMapCapacity(target, key);
    target.entries.set(key, value);
  }
}

export function mapEntries(map: PineMap): Array<[PineMapKey, unknown]> {
  return Array.from(map.entries.entries());
}

function assertMapCapacity(map: PineMap, key: unknown): void {
  if (!map.entries.has(normalizeMapKey(key)) && map.entries.size >= 50_000) {
    throw new Error('Map cannot contain more than 50000 key-value pairs');
  }
}

function normalizeMapKey(key: unknown): PineMapKey {
  if (typeof key === 'number') {
    if (!Number.isFinite(key)) {
      throw new Error('Map keys must be finite value types');
    }
    return key;
  }
  if (typeof key === 'string' || typeof key === 'boolean') {
    return key;
  }
  throw new Error('Map keys must be value types');
}

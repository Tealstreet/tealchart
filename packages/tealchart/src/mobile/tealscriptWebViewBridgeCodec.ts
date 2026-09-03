const BRIDGE_TAG = '__tealchartWebViewBridge';

type TaggedBridgeValue =
  | { [BRIDGE_TAG]: 'undefined' }
  | { [BRIDGE_TAG]: 'number'; value: 'NaN' | 'Infinity' | '-Infinity' | '-0' }
  | { [BRIDGE_TAG]: 'map'; entries: [unknown, unknown][] }
  | { [BRIDGE_TAG]: 'typed-array'; name: string; values: number[] };

type TypedArrayValue =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

const TYPED_ARRAY_CTORS = {
  Float32Array,
  Float64Array,
  Int16Array,
  Int32Array,
  Int8Array,
  Uint16Array,
  Uint32Array,
  Uint8Array,
  Uint8ClampedArray,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTypedArray(value: unknown): value is TypedArrayValue {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

function isTaggedBridgeValue(value: unknown): value is TaggedBridgeValue {
  return isRecord(value) && typeof value[BRIDGE_TAG] === 'string';
}

export function encodeTealscriptWebViewBridgeValue(value: unknown): unknown {
  if (value === undefined) return { [BRIDGE_TAG]: 'undefined' };

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { [BRIDGE_TAG]: 'number', value: 'NaN' };
    if (value === Infinity) return { [BRIDGE_TAG]: 'number', value: 'Infinity' };
    if (value === -Infinity) return { [BRIDGE_TAG]: 'number', value: '-Infinity' };
    if (Object.is(value, -0)) return { [BRIDGE_TAG]: 'number', value: '-0' };
    return value;
  }

  if (value instanceof Map) {
    return {
      [BRIDGE_TAG]: 'map',
      entries: Array.from(value.entries(), ([key, entryValue]) => [
        encodeTealscriptWebViewBridgeValue(key),
        encodeTealscriptWebViewBridgeValue(entryValue),
      ]),
    };
  }

  if (isTypedArray(value)) {
    return {
      [BRIDGE_TAG]: 'typed-array',
      name: value.constructor.name,
      values: Array.from(value, (entry) => encodeTealscriptWebViewBridgeValue(entry)),
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => encodeTealscriptWebViewBridgeValue(entry));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, encodeTealscriptWebViewBridgeValue(entryValue)]),
    );
  }

  return value;
}

export function decodeTealscriptWebViewBridgeValue(value: unknown): unknown {
  if (isTaggedBridgeValue(value)) {
    switch (value[BRIDGE_TAG]) {
      case 'undefined':
        return undefined;
      case 'number':
        if (value.value === 'NaN') return Number.NaN;
        if (value.value === 'Infinity') return Infinity;
        if (value.value === '-Infinity') return -Infinity;
        return -0;
      case 'map':
        return new Map(
          value.entries.map(([key, entryValue]) => [
            decodeTealscriptWebViewBridgeValue(key),
            decodeTealscriptWebViewBridgeValue(entryValue),
          ]),
        );
      case 'typed-array': {
        const Ctor = TYPED_ARRAY_CTORS[value.name as keyof typeof TYPED_ARRAY_CTORS];
        const values = value.values.map((entry) => decodeTealscriptWebViewBridgeValue(entry)) as number[];
        return Ctor ? new Ctor(values) : values;
      }
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => decodeTealscriptWebViewBridgeValue(entry));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, decodeTealscriptWebViewBridgeValue(entryValue)]),
    );
  }

  return value;
}

export function stringifyTealscriptWebViewBridgeMessage(message: unknown): string {
  return JSON.stringify(encodeTealscriptWebViewBridgeValue(message));
}

export function parseTealscriptWebViewBridgeMessage(message: string): unknown {
  return decodeTealscriptWebViewBridgeValue(JSON.parse(message));
}

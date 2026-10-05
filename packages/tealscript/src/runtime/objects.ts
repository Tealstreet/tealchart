export interface PineUdtObject {
  readonly __tealscriptUdt: true;
  readonly typeName: string;
  readonly varipFields: Set<string>;
  persistent?: boolean;
  fields: Map<string, unknown>;
}

interface IntrabarFields {
  barTime?: number;
  initial: Map<string, unknown> | { names: readonly string[]; values: readonly unknown[] };
  ordinary?: Map<string, unknown>;
}

const intrabarFields = Symbol('tealscript.intrabarFields');

function getIntrabarFields(object: PineUdtObject): IntrabarFields | undefined {
  return (object as PineUdtObject & { [intrabarFields]?: IntrabarFields })[intrabarFields];
}

function setIntrabarFields(object: PineUdtObject, state: IntrabarFields): void {
  Object.defineProperty(object, intrabarFields, { value: state, writable: true });
}

function registerInitialFields(
  object: PineUdtObject,
  initial: IntrabarFields['initial'] = new Map(object.fields),
): PineUdtObject {
  setIntrabarFields(object, { initial });
  return object;
}

function copyInitialFields(initial: IntrabarFields['initial'], clone?: (value: unknown) => unknown): Map<string, unknown> {
  if (initial instanceof Map) {
    return clone ? new Map(Array.from(initial, ([name, value]) => [name, clone(value)])) : new Map(initial);
  }
  const fields = new Map<string, unknown>();
  for (let i = 0; i < initial.names.length; i++) {
    const value = initial.values[i];
    fields.set(initial.names[i], clone ? clone(value) : value);
  }
  return fields;
}

export function createPineUdtObject(
  typeName: string,
  fields: Iterable<[string, unknown]> = [],
  varipFields: Iterable<string> = [],
): PineUdtObject {
  const object: PineUdtObject = {
    __tealscriptUdt: true,
    typeName,
    varipFields: new Set(varipFields),
    fields: new Map(fields),
  };
  return registerInitialFields(object);
}

export function createPineUdtFactory(typeName: string, fieldNames: readonly string[], varipFields: readonly string[]) {
  const names = fieldNames.slice();
  return (values: readonly unknown[]): PineUdtObject => {
    const fields = new Map<string, unknown>();
    for (let i = 0; i < names.length; i++) fields.set(names[i], values[i]);
    const object: PineUdtObject = { __tealscriptUdt: true, typeName, varipFields: new Set(varipFields), fields };
    return registerInitialFields(object, { names, values: values.slice(0, names.length) });
  };
}

export function isPineUdtObject(value: unknown): value is PineUdtObject {
  return Boolean(value && typeof value === 'object' && (value as PineUdtObject).__tealscriptUdt === true);
}

export function getUdtField(object: PineUdtObject, fieldName: string): unknown {
  if (!object.fields.has(fieldName)) {
    throw new Error(`Unknown field '${fieldName}' on type ${object.typeName}`);
  }
  return object.fields.get(fieldName);
}

export function setUdtField(object: PineUdtObject, fieldName: string, value: unknown): void {
  if (!object.fields.has(fieldName)) {
    throw new Error(`Unknown field '${fieldName}' on type ${object.typeName}`);
  }
  object.fields.set(fieldName, value);
}

export function copyUdtObject(
  object: PineUdtObject,
  cloneValue: (value: unknown) => unknown = (value) => value,
): PineUdtObject {
  const copy = createPineUdtObject(
    object.typeName,
    Array.from(object.fields.entries(), ([fieldName, value]) => [fieldName, cloneValue(value)]),
    object.varipFields,
  );
  copy.persistent = object.persistent;
  return copy;
}

export function captureVaripReference(value: unknown, barTime: number, before: boolean): unknown {
  if (!isPineUdtObject(value)) return value;
  const state = getIntrabarFields(value)!;
  if (state.barTime !== barTime) {
    state.barTime = barTime;
    state.ordinary = before ? new Map(value.fields) : copyInitialFields(state.initial);
  }
  return value;
}

export function restoreVaripReference(value: unknown): unknown {
  if (!isPineUdtObject(value)) return value;
  const state = getIntrabarFields(value);
  for (const [name, field] of state?.ordinary ?? []) {
    if (!value.varipFields.has(name)) value.fields.set(name, field);
  }
  return value;
}

export function cloneIntrabarFields(
  source: PineUdtObject,
  target: PineUdtObject,
  clone: (value: unknown) => unknown,
): void {
  const state = getIntrabarFields(source);
  if (!state) return;
  const cloneFields = (fields: Map<string, unknown>) =>
    new Map(Array.from(fields, ([name, value]) => [name, clone(value)]));
  setIntrabarFields(target, {
    barTime: state.barTime,
    initial: copyInitialFields(state.initial, clone),
    ordinary: state.ordinary && cloneFields(state.ordinary),
  });
}

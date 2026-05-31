export interface PineUdtObject {
  readonly __tealscriptUdt: true;
  readonly typeName: string;
  fields: Map<string, unknown>;
}

export function createPineUdtObject(typeName: string, fields: Iterable<[string, unknown]> = []): PineUdtObject {
  return {
    __tealscriptUdt: true,
    typeName,
    fields: new Map(fields),
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

export function copyUdtObject(object: PineUdtObject, cloneValue: (value: unknown) => unknown = (value) => value): PineUdtObject {
  return createPineUdtObject(
    object.typeName,
    Array.from(object.fields.entries(), ([fieldName, value]) => [fieldName, cloneValue(value)]),
  );
}

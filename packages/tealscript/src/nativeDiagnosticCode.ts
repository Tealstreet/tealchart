const witnessedCodes = {
  namespaceName: 'CE10093',
  calledDefault: 'CE10133',
  calculatedDefault: 'CE10134',
  tupleModifier: 'CE10150',
  namespaceMethod: 'CE10153',
  tupleInitializer: 'CE10156',
  missingBoxId: 'CE10165',
  collectionReassignment: 'CE10173',
  overloadGlobal: 'CE10182',
  builtinShadow: 'CE10195',
  unusedReferenceReceiver: 'CE10236',
  privateCallable: 'CE10271',
  undeclaredIdentifier: 'CE10272',
  timestampString: 'CE10275',
} as const;

export function witnessedNativeDiagnosticCode(
  version: number | undefined,
  rule: keyof typeof witnessedCodes,
  witnessed: boolean,
) {
  return version === 6 && witnessed ? witnessedCodes[rule] : undefined;
}

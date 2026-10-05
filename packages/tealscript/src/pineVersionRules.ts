export type SupportedPineVersion = 3 | 4 | 5 | 6;

export const RESERVED_VARIABLE_AND_FUNCTION_NAMES = new Set([
  'catch', 'class', 'do', 'ellipse', 'in', 'is', 'polygon', 'range',
  'return', 'struct', 'text', 'throw', 'try',
]);

export interface PineVersionRules {
  readonly version: SupportedPineVersion;
  readonly allowsSelfReferencingInitializers: boolean;
  readonly disallowsReservedVariableAndFunctionNames: boolean;
  readonly allowsImplicitNumericToBool: boolean;
  readonly rejectsStringArrayPredicates: boolean;
  readonly allowsBoolNaHelpers: boolean;
  readonly directNaComparisonSeverity: 'error' | 'warning';
  readonly minVisualLineWidth: number;
  readonly dynamicRequestsDefault: boolean;
  readonly allowsNonExportedFunctionRequestsWithoutDynamicRequests: boolean;
  readonly constIntDivisionCanReturnFractional: boolean;
  readonly strategyWhenParameterAllowed: boolean;
  readonly strategyDefaultMarginPercent: number;
  readonly strategyTrimsOrdersAboveLimit: boolean;
  readonly strategyExitUsesRelativeAndAbsoluteTargets: boolean;
  readonly disallowsLiteralOrUdtFieldHistory: boolean;
  readonly disallowsDuplicateCallArguments: boolean;
  readonly disallowsSeriesVisualOffset: boolean;
  readonly plotOffsetUsesLastValue: boolean;
  readonly disallowsNaUniqueConstants: boolean;
  readonly timeframePeriodIncludesMultiplier: boolean;
  readonly allowsNegativeArrayIndices: boolean;
  readonly fixesMutableConstInference: boolean;
  readonly supportsLegacyTranspParameter: boolean;
  readonly supportsLegacyColorTransparencyOverload: boolean;
  readonly usesV6DefaultColors: boolean;
  readonly normalizesNaTableCellRow: boolean;
  readonly forLoopEndBoundaryIsDynamic: boolean;
  readonly allowsConditionalOperandRequestsWithoutDynamicRequests: boolean;
  readonly usesLazyLogicalOperators: boolean;
  readonly allowsRawUniqueParameterValues: boolean;
  readonly supportsLegacyBareColorConstants: boolean;
  readonly columnsStyleNumericValue?: number;
  readonly defaultSessionDays: string;
  readonly allowsNoOpStrategyExit: boolean;
  readonly supportsIffFunction: boolean;
  readonly supportsOffsetFunction: boolean;
  readonly allowsLegacyGenericInputTypeArgument: boolean;
  readonly requiresConstOrSourceGenericInputDefault: boolean;
  readonly usesSourceGenericInputMetadataOrder: boolean;
  readonly supportsLegacyResolutionDeclarationParams: boolean;
  readonly supportsLegacyTimeResolutionArgument: boolean;
  readonly allowsLegacyGlobalBuiltinAliases: boolean;
  readonly supportsNamespacedHistogramStyle: boolean;
  readonly allowsUntypedNaDeclaration: boolean;
  readonly supportsLegacyBarIndexAlias: boolean;
  readonly supportsLegacyTimeframeVariableAliases: boolean;
  readonly supportsLegacySundayConstant: boolean;
  readonly securityDefaultLookahead: 'barmerge.lookahead_off';
  readonly allowsBoolToNumberArithmetic: boolean;
  readonly allowsStyleConstantStringConcatenation: boolean;
  readonly disallowedEqualityOperandKinds: Readonly<
    Partial<Record<'==' | '!=', readonly ('box' | 'chart.point' | 'linefill' | 'polyline' | 'table')[]>>
  >;
}

export const PINE_VERSION_RULES: Record<SupportedPineVersion, PineVersionRules> = {
  3: {
    version: 3,
    allowsSelfReferencingInitializers: false,
    disallowsReservedVariableAndFunctionNames: false,
    rejectsStringArrayPredicates: false,
    allowsImplicitNumericToBool: true,
    allowsBoolNaHelpers: true,
    directNaComparisonSeverity: 'error',
    minVisualLineWidth: 0,
    dynamicRequestsDefault: false,
    allowsNonExportedFunctionRequestsWithoutDynamicRequests: true,
    constIntDivisionCanReturnFractional: false,
    strategyWhenParameterAllowed: true,
    strategyDefaultMarginPercent: 0,
    strategyTrimsOrdersAboveLimit: false,
    strategyExitUsesRelativeAndAbsoluteTargets: false,
    disallowsLiteralOrUdtFieldHistory: false,
    disallowsDuplicateCallArguments: false,
    disallowsSeriesVisualOffset: false,
    plotOffsetUsesLastValue: false,
    disallowsNaUniqueConstants: false,
    timeframePeriodIncludesMultiplier: false,
    allowsNegativeArrayIndices: false,
    fixesMutableConstInference: false,
    supportsLegacyTranspParameter: true,
    supportsLegacyColorTransparencyOverload: true,
    usesV6DefaultColors: false,
    normalizesNaTableCellRow: false,
    forLoopEndBoundaryIsDynamic: false,
    allowsConditionalOperandRequestsWithoutDynamicRequests: true,
    usesLazyLogicalOperators: false,
    allowsRawUniqueParameterValues: true,
    supportsLegacyBareColorConstants: true,
    defaultSessionDays: '23456',
    allowsNoOpStrategyExit: true,
    supportsIffFunction: true,
    supportsOffsetFunction: true,
    allowsLegacyGenericInputTypeArgument: true,
    requiresConstOrSourceGenericInputDefault: false,
    usesSourceGenericInputMetadataOrder: false,
    supportsLegacyResolutionDeclarationParams: true,
    supportsLegacyTimeResolutionArgument: true,
    allowsLegacyGlobalBuiltinAliases: true,
    supportsNamespacedHistogramStyle: false,
    allowsUntypedNaDeclaration: true,
    supportsLegacyBarIndexAlias: true,
    supportsLegacyTimeframeVariableAliases: true,
    supportsLegacySundayConstant: true,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
    allowsStyleConstantStringConcatenation: true,
    disallowedEqualityOperandKinds: {},
  },
  4: {
    version: 4,
    columnsStyleNumericValue: 5,
    allowsSelfReferencingInitializers: false,
    disallowsReservedVariableAndFunctionNames: false,
    rejectsStringArrayPredicates: false,
    allowsImplicitNumericToBool: true,
    allowsBoolNaHelpers: true,
    directNaComparisonSeverity: 'error',
    minVisualLineWidth: 0,
    dynamicRequestsDefault: false,
    allowsNonExportedFunctionRequestsWithoutDynamicRequests: true,
    constIntDivisionCanReturnFractional: false,
    strategyWhenParameterAllowed: true,
    strategyDefaultMarginPercent: 0,
    strategyTrimsOrdersAboveLimit: false,
    strategyExitUsesRelativeAndAbsoluteTargets: false,
    disallowsLiteralOrUdtFieldHistory: false,
    disallowsDuplicateCallArguments: false,
    disallowsSeriesVisualOffset: false,
    plotOffsetUsesLastValue: false,
    disallowsNaUniqueConstants: false,
    timeframePeriodIncludesMultiplier: false,
    allowsNegativeArrayIndices: false,
    fixesMutableConstInference: false,
    supportsLegacyTranspParameter: true,
    supportsLegacyColorTransparencyOverload: false,
    usesV6DefaultColors: false,
    normalizesNaTableCellRow: false,
    forLoopEndBoundaryIsDynamic: false,
    allowsConditionalOperandRequestsWithoutDynamicRequests: true,
    usesLazyLogicalOperators: false,
    allowsRawUniqueParameterValues: true,
    supportsLegacyBareColorConstants: false,
    defaultSessionDays: '23456',
    allowsNoOpStrategyExit: true,
    supportsIffFunction: true,
    supportsOffsetFunction: true,
    allowsLegacyGenericInputTypeArgument: true,
    requiresConstOrSourceGenericInputDefault: false,
    usesSourceGenericInputMetadataOrder: false,
    supportsLegacyResolutionDeclarationParams: true,
    supportsLegacyTimeResolutionArgument: true,
    allowsLegacyGlobalBuiltinAliases: true,
    supportsNamespacedHistogramStyle: true,
    allowsUntypedNaDeclaration: false,
    supportsLegacyBarIndexAlias: false,
    supportsLegacyTimeframeVariableAliases: false,
    supportsLegacySundayConstant: false,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
    allowsStyleConstantStringConcatenation: true,
    disallowedEqualityOperandKinds: {},
  },
  5: {
    version: 5,
    allowsSelfReferencingInitializers: false,
    disallowsReservedVariableAndFunctionNames: true,
    rejectsStringArrayPredicates: true,
    allowsImplicitNumericToBool: true,
    allowsBoolNaHelpers: true,
    directNaComparisonSeverity: 'warning',
    minVisualLineWidth: Number.NEGATIVE_INFINITY,
    dynamicRequestsDefault: false,
    allowsNonExportedFunctionRequestsWithoutDynamicRequests: true,
    constIntDivisionCanReturnFractional: false,
    strategyWhenParameterAllowed: true,
    strategyDefaultMarginPercent: 0,
    strategyTrimsOrdersAboveLimit: false,
    strategyExitUsesRelativeAndAbsoluteTargets: false,
    disallowsLiteralOrUdtFieldHistory: false,
    disallowsDuplicateCallArguments: false,
    disallowsSeriesVisualOffset: false,
    plotOffsetUsesLastValue: true,
    disallowsNaUniqueConstants: false,
    timeframePeriodIncludesMultiplier: false,
    allowsNegativeArrayIndices: false,
    fixesMutableConstInference: false,
    supportsLegacyTranspParameter: true,
    supportsLegacyColorTransparencyOverload: false,
    usesV6DefaultColors: false,
    normalizesNaTableCellRow: true,
    forLoopEndBoundaryIsDynamic: false,
    allowsConditionalOperandRequestsWithoutDynamicRequests: true,
    usesLazyLogicalOperators: false,
    allowsRawUniqueParameterValues: false,
    supportsLegacyBareColorConstants: false,
    defaultSessionDays: '1234567',
    allowsNoOpStrategyExit: false,
    supportsIffFunction: false,
    supportsOffsetFunction: false,
    allowsLegacyGenericInputTypeArgument: false,
    requiresConstOrSourceGenericInputDefault: false,
    usesSourceGenericInputMetadataOrder: false,
    supportsLegacyResolutionDeclarationParams: false,
    supportsLegacyTimeResolutionArgument: false,
    allowsLegacyGlobalBuiltinAliases: false,
    supportsNamespacedHistogramStyle: true,
    allowsUntypedNaDeclaration: false,
    supportsLegacyBarIndexAlias: false,
    supportsLegacyTimeframeVariableAliases: false,
    supportsLegacySundayConstant: false,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
    allowsStyleConstantStringConcatenation: true,
    disallowedEqualityOperandKinds: {},
  },
  6: {
    version: 6,
    allowsSelfReferencingInitializers: false,
    disallowsReservedVariableAndFunctionNames: true,
    rejectsStringArrayPredicates: true,
    allowsImplicitNumericToBool: false,
    allowsBoolNaHelpers: false,
    directNaComparisonSeverity: 'error',
    minVisualLineWidth: 1,
    dynamicRequestsDefault: true,
    allowsNonExportedFunctionRequestsWithoutDynamicRequests: false,
    constIntDivisionCanReturnFractional: true,
    strategyWhenParameterAllowed: false,
    strategyDefaultMarginPercent: 100,
    strategyTrimsOrdersAboveLimit: true,
    strategyExitUsesRelativeAndAbsoluteTargets: true,
    disallowsLiteralOrUdtFieldHistory: true,
    disallowsDuplicateCallArguments: true,
    disallowsSeriesVisualOffset: true,
    plotOffsetUsesLastValue: false,
    disallowsNaUniqueConstants: true,
    timeframePeriodIncludesMultiplier: true,
    allowsNegativeArrayIndices: true,
    fixesMutableConstInference: true,
    supportsLegacyTranspParameter: false,
    supportsLegacyColorTransparencyOverload: false,
    usesV6DefaultColors: true,
    normalizesNaTableCellRow: false,
    forLoopEndBoundaryIsDynamic: true,
    allowsConditionalOperandRequestsWithoutDynamicRequests: false,
    usesLazyLogicalOperators: true,
    allowsRawUniqueParameterValues: false,
    supportsLegacyBareColorConstants: false,
    defaultSessionDays: '1234567',
    allowsNoOpStrategyExit: false,
    supportsIffFunction: false,
    supportsOffsetFunction: false,
    allowsLegacyGenericInputTypeArgument: false,
    requiresConstOrSourceGenericInputDefault: true,
    usesSourceGenericInputMetadataOrder: true,
    supportsLegacyResolutionDeclarationParams: false,
    supportsLegacyTimeResolutionArgument: false,
    allowsLegacyGlobalBuiltinAliases: false,
    supportsNamespacedHistogramStyle: true,
    allowsUntypedNaDeclaration: false,
    supportsLegacyBarIndexAlias: false,
    supportsLegacyTimeframeVariableAliases: false,
    supportsLegacySundayConstant: false,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
    allowsStyleConstantStringConcatenation: false,
    disallowedEqualityOperandKinds: {
      '==': ['box', 'chart.point', 'linefill', 'polyline', 'table'],
      '!=': ['box', 'chart.point', 'polyline', 'table'],
    },
  },
};

const LEGACY_PINE_V2_RULES: PineVersionRules = {
  ...PINE_VERSION_RULES[3],
  allowsSelfReferencingInitializers: true,
};

export function pineVersionListDescription(versions: readonly SupportedPineVersion[]): string {
  if (versions.length === 0) return 'no supported Pine version';
  const ranges: string[] = [];
  let rangeStart = versions[0]!;
  let previous = rangeStart;

  for (const version of versions.slice(1)) {
    if (version === previous + 1) {
      previous = version;
      continue;
    }
    ranges.push(rangeStart === previous ? `Pine v${rangeStart}` : `Pine v${rangeStart}-v${previous}`);
    rangeStart = version;
    previous = version;
  }
  ranges.push(rangeStart === previous ? `Pine v${rangeStart}` : `Pine v${rangeStart}-v${previous}`);

  if (ranges.length === 1) return ranges[0]!;
  if (ranges.length === 2) return `${ranges[0]} and ${ranges[1]}`;
  return `${ranges.slice(0, -1).join(', ')}, and ${ranges.at(-1)}`;
}

export function pineVersionsWhere(predicate: (rules: PineVersionRules) => boolean): SupportedPineVersion[] {
  return (Object.keys(PINE_VERSION_RULES).map(Number) as SupportedPineVersion[]).filter((version) =>
    predicate(PINE_VERSION_RULES[version]),
  );
}

export function pineVersionRules(version: number): PineVersionRules {
  if (version === 2) return LEGACY_PINE_V2_RULES;
  if (version <= 3) return PINE_VERSION_RULES[3];
  if (version === 4) return PINE_VERSION_RULES[4];
  if (version === 5) return PINE_VERSION_RULES[5];
  return PINE_VERSION_RULES[6];
}

export function isPineBuiltinGlobalAvailable(version: number, name: string): boolean {
  return version !== 3 || name !== 'bar_index';
}

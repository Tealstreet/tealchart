export type SupportedPineVersion = 3 | 4 | 5 | 6;

export interface PineVersionRules {
  readonly version: SupportedPineVersion;
  readonly allowsImplicitNumericToBool: boolean;
  readonly allowsBoolNaHelpers: boolean;
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
  readonly disallowsNaUniqueConstants: boolean;
  readonly timeframePeriodIncludesMultiplier: boolean;
  readonly allowsNegativeArrayIndices: boolean;
  readonly fixesMutableConstInference: boolean;
  readonly supportsLegacyTranspParameter: boolean;
  readonly usesV6DefaultColors: boolean;
  readonly forLoopEndBoundaryIsDynamic: boolean;
  readonly allowsConditionalOperandRequestsWithoutDynamicRequests: boolean;
  readonly usesLazyLogicalOperators: boolean;
  readonly allowsRawUniqueParameterValues: boolean;
  readonly defaultSessionDays: string;
  readonly allowsNoOpStrategyExit: boolean;
  readonly supportsIffFunction: boolean;
  readonly supportsOffsetFunction: boolean;
  readonly allowsLegacyGenericInputTypeArgument: boolean;
  readonly supportsLegacyResolutionDeclarationParams: boolean;
  readonly allowsLegacyGlobalBuiltinAliases: boolean;
  readonly allowsUntypedNaDeclaration: boolean;
  readonly supportsLegacyBarIndexAlias: boolean;
  readonly securityDefaultLookahead: 'barmerge.lookahead_off';
  readonly allowsBoolToNumberArithmetic: boolean;
}

export const PINE_VERSION_RULES: Record<SupportedPineVersion, PineVersionRules> = {
  3: {
    version: 3,
    allowsImplicitNumericToBool: true,
    allowsBoolNaHelpers: true,
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
    disallowsNaUniqueConstants: false,
    timeframePeriodIncludesMultiplier: false,
    allowsNegativeArrayIndices: false,
    fixesMutableConstInference: false,
    supportsLegacyTranspParameter: true,
    usesV6DefaultColors: false,
    forLoopEndBoundaryIsDynamic: false,
    allowsConditionalOperandRequestsWithoutDynamicRequests: true,
    usesLazyLogicalOperators: false,
    allowsRawUniqueParameterValues: true,
    defaultSessionDays: '23456',
    allowsNoOpStrategyExit: true,
    supportsIffFunction: true,
    supportsOffsetFunction: true,
    allowsLegacyGenericInputTypeArgument: true,
    supportsLegacyResolutionDeclarationParams: true,
    allowsLegacyGlobalBuiltinAliases: true,
    allowsUntypedNaDeclaration: true,
    supportsLegacyBarIndexAlias: true,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
  },
  4: {
    version: 4,
    allowsImplicitNumericToBool: true,
    allowsBoolNaHelpers: true,
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
    disallowsNaUniqueConstants: false,
    timeframePeriodIncludesMultiplier: false,
    allowsNegativeArrayIndices: false,
    fixesMutableConstInference: false,
    supportsLegacyTranspParameter: true,
    usesV6DefaultColors: false,
    forLoopEndBoundaryIsDynamic: false,
    allowsConditionalOperandRequestsWithoutDynamicRequests: true,
    usesLazyLogicalOperators: false,
    allowsRawUniqueParameterValues: true,
    defaultSessionDays: '23456',
    allowsNoOpStrategyExit: true,
    supportsIffFunction: true,
    supportsOffsetFunction: true,
    allowsLegacyGenericInputTypeArgument: true,
    supportsLegacyResolutionDeclarationParams: true,
    allowsLegacyGlobalBuiltinAliases: true,
    allowsUntypedNaDeclaration: false,
    supportsLegacyBarIndexAlias: false,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
  },
  5: {
    version: 5,
    allowsImplicitNumericToBool: true,
    allowsBoolNaHelpers: true,
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
    disallowsNaUniqueConstants: false,
    timeframePeriodIncludesMultiplier: false,
    allowsNegativeArrayIndices: false,
    fixesMutableConstInference: false,
    supportsLegacyTranspParameter: true,
    usesV6DefaultColors: false,
    forLoopEndBoundaryIsDynamic: false,
    allowsConditionalOperandRequestsWithoutDynamicRequests: true,
    usesLazyLogicalOperators: false,
    allowsRawUniqueParameterValues: false,
    defaultSessionDays: '1234567',
    allowsNoOpStrategyExit: false,
    supportsIffFunction: false,
    supportsOffsetFunction: false,
    allowsLegacyGenericInputTypeArgument: false,
    supportsLegacyResolutionDeclarationParams: false,
    allowsLegacyGlobalBuiltinAliases: false,
    allowsUntypedNaDeclaration: false,
    supportsLegacyBarIndexAlias: false,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
  },
  6: {
    version: 6,
    allowsImplicitNumericToBool: false,
    allowsBoolNaHelpers: false,
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
    disallowsNaUniqueConstants: true,
    timeframePeriodIncludesMultiplier: true,
    allowsNegativeArrayIndices: true,
    fixesMutableConstInference: true,
    supportsLegacyTranspParameter: false,
    usesV6DefaultColors: true,
    forLoopEndBoundaryIsDynamic: true,
    allowsConditionalOperandRequestsWithoutDynamicRequests: false,
    usesLazyLogicalOperators: true,
    allowsRawUniqueParameterValues: false,
    defaultSessionDays: '1234567',
    allowsNoOpStrategyExit: false,
    supportsIffFunction: false,
    supportsOffsetFunction: false,
    allowsLegacyGenericInputTypeArgument: false,
    supportsLegacyResolutionDeclarationParams: false,
    allowsLegacyGlobalBuiltinAliases: false,
    allowsUntypedNaDeclaration: false,
    supportsLegacyBarIndexAlias: false,
    securityDefaultLookahead: 'barmerge.lookahead_off',
    allowsBoolToNumberArithmetic: false,
  },
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
  return (Object.keys(PINE_VERSION_RULES).map(Number) as SupportedPineVersion[])
    .filter((version) => predicate(PINE_VERSION_RULES[version]));
}

export function pineVersionRules(version: number): PineVersionRules {
  if (version <= 3) return PINE_VERSION_RULES[3];
  if (version === 4) return PINE_VERSION_RULES[4];
  if (version === 5) return PINE_VERSION_RULES[5];
  return PINE_VERSION_RULES[6];
}

import { PINE_V6_REFERENCE_BUILTINS } from './pineV6BuiltinReference';
import { PINE_V6_GRAMMAR_CONSTRUCTS } from './pineV6GrammarReference';
import {
  PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX,
  PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX,
} from './pineV6ReferenceManualIndex';

export interface PineV6ManualAuditReasonGroup {
  reason: string;
  names: readonly string[];
}

export const PINE_V6_REFERENCE_MANUAL_UNRESOLVED_BUILTIN_GROUPS = {
  providerFutureFields: {
    reason:
      'Future corporate-action fields are in the v6 manual, but the provider seam currently implements historical/current request fields only and has no forecast freshness contract.',
    names: [
      'dividends.future_amount',
      'dividends.future_ex_date',
      'dividends.future_pay_date',
      'earnings.future_eps',
      'earnings.future_period_end_time',
      'earnings.future_revenue',
      'earnings.future_time',
    ],
  },
  declarationsAndStrategyHelpers: {
    reason:
      'Manual strategy conversion/default-quantity helpers are strategy-only convenience queries outside the deterministic position-ledger slice.',
    names: ['strategy.convert_to_account', 'strategy.convert_to_symbol', 'strategy.default_entry_qty'],
  },
  providerRecommendationSeries: {
    reason:
      'Reference manual exposes provider-tail recommendation series not currently available through the host metadata seam.',
    names: [
      'syminfo.recommendations_buy',
      'syminfo.recommendations_buy_strong',
      'syminfo.recommendations_hold',
      'syminfo.recommendations_sell',
      'syminfo.recommendations_sell_strong',
      'syminfo.recommendations_total',
    ],
  },
} as const satisfies Record<string, PineV6ManualAuditReasonGroup>;

export const PINE_V6_REFERENCE_MANUAL_LOCAL_EXTENSION_GROUPS = {
  localAliasesOrExtensions: {
    reason:
      'Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.',
    names: [
      'array.new_chart_point',
      'array.new_polyline',
      'box.get_bgcolor',
      'box.get_border_color',
      'box.get_text',
      'box.get_text_halign',
      'box.get_text_valign',
      'color.none',
      'label.get_color',
      'label.get_size',
      'label.get_style',
      'label.get_textcolor',
      'label.get_tooltip',
      'label.get_xloc',
      'label.get_yloc',
      'linefill.copy',
      'linefill.get_color',
      'math.clamp',
      'math.trunc',
      'matrix.add_column',
      'matrix.column',
      'matrix.is_valid',
      'matrix.new_bool',
      'matrix.new_color',
      'matrix.new_float',
      'matrix.new_int',
      'matrix.new_string',
      'matrix.remove_column',
      'polyline.copy',
      'strategy.percent_profitable',
      'syminfo.exchange',
      'ta.adx',
      'ta.bar_index',
      'ta.covariance',
      'ta.dema',
      'ta.kst',
      'ta.smma',
      'ta.tema',
      'timeframe.to_seconds',
    ],
  },
} as const satisfies Record<string, PineV6ManualAuditReasonGroup>;

export const PINE_V6_REFERENCE_MANUAL_MISSING_GRAMMAR_GROUPS = {
  // Keep this object empty when the committed grammar inventory covers every
  // manual-index grammar entry. Future omissions should be added here with a
  // source-backed reason rather than silently shrinking the denominator.
} as const satisfies Record<string, PineV6ManualAuditReasonGroup>;

export interface PineV6ReferenceManualAuditSummary {
  officialBuiltinNames: number;
  committedBuiltinNames: number;
  builtinNamesAbsentFromCommittedList: string[];
  builtinNamesAbsentFromCommittedListCount: number;
  unresolvedManualBuiltinNames: string[];
  unresolvedManualBuiltinNamesCount: number;
  committedBuiltinNamesAbsentFromManual: string[];
  committedBuiltinNamesAbsentFromManualCount: number;
  manualGrammarEntries: number;
  committedGrammarConstructs: number;
  grammarEntriesAbsentFromCommittedList: string[];
  grammarEntriesAbsentFromCommittedListCount: number;
}

export interface PineV6ReferenceManualAuditOptions {
  resolvesBuiltinReferenceName?: (name: string) => boolean;
}

export function pineV6ReferenceManualBuiltinNames(): string[] {
  return uniqueSorted(Object.values(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX).flat());
}

export function committedPineV6BuiltinReferenceNames(): string[] {
  return uniqueSorted(Object.values(PINE_V6_REFERENCE_BUILTINS).flat());
}

export function pineV6ReferenceManualGrammarEntries(): string[] {
  return uniqueSorted([
    ...PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.keywords,
    ...PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.operators.map((name) => `operator:${name}`),
    ...PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.types.map((name) => `type:${name}`),
    ...PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.annotations,
  ]);
}

export function summarizePineV6ReferenceManualAudit(
  options: PineV6ReferenceManualAuditOptions = {},
): PineV6ReferenceManualAuditSummary {
  const manualBuiltins = pineV6ReferenceManualBuiltinNames();
  const committedBuiltins = committedPineV6BuiltinReferenceNames();
  const manualBuiltinSet = new Set(manualBuiltins);
  const committedBuiltinSet = new Set(committedBuiltins);
  const manualGrammarEntries = pineV6ReferenceManualGrammarEntries();
  const missingGrammar = flattenedAuditGroupNames(PINE_V6_REFERENCE_MANUAL_MISSING_GRAMMAR_GROUPS);
  const unresolvedManualBuiltinNames = options.resolvesBuiltinReferenceName
    ? manualBuiltins.filter((name) => !options.resolvesBuiltinReferenceName!(name))
    : flattenedAuditGroupNames(PINE_V6_REFERENCE_MANUAL_UNRESOLVED_BUILTIN_GROUPS);

  return {
    officialBuiltinNames: manualBuiltins.length,
    committedBuiltinNames: committedBuiltins.length,
    builtinNamesAbsentFromCommittedList: manualBuiltins.filter((name) => !committedBuiltinSet.has(name)),
    builtinNamesAbsentFromCommittedListCount: manualBuiltins.filter((name) => !committedBuiltinSet.has(name)).length,
    unresolvedManualBuiltinNames,
    unresolvedManualBuiltinNamesCount: unresolvedManualBuiltinNames.length,
    committedBuiltinNamesAbsentFromManual: committedBuiltins.filter((name) => !manualBuiltinSet.has(name)),
    committedBuiltinNamesAbsentFromManualCount: committedBuiltins.filter((name) => !manualBuiltinSet.has(name)).length,
    manualGrammarEntries: manualGrammarEntries.length,
    committedGrammarConstructs: PINE_V6_GRAMMAR_CONSTRUCTS.length,
    grammarEntriesAbsentFromCommittedList: missingGrammar,
    grammarEntriesAbsentFromCommittedListCount: missingGrammar.length,
  };
}

export function flattenedAuditGroupNames(groups: Record<string, PineV6ManualAuditReasonGroup>): string[] {
  return uniqueSorted(Object.values(groups).flatMap((group) => [...group.names]));
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

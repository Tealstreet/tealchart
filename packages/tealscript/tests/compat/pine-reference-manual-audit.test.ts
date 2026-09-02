import { describe, expect, it } from 'vitest';

import {
  type PineV6KnownMissingBuiltinReview,
  PINE_V6_KNOWN_MISSING_BUILTIN_GROUPS,
  PINE_V6_KNOWN_MISSING_BUILTIN_REVIEW,
  PINE_V6_KNOWN_MISSING_BUILTINS,
} from '../../src/compat/pineV6BuiltinReference';
import {
  flattenedAuditGroupNames,
  PINE_V6_REFERENCE_MANUAL_LOCAL_EXTENSION_GROUPS,
  PINE_V6_REFERENCE_MANUAL_MISSING_GRAMMAR_GROUPS,
  PINE_V6_REFERENCE_MANUAL_UNRESOLVED_BUILTIN_GROUPS,
  summarizePineV6ReferenceManualAudit,
} from '../../src/compat/pineV6ReferenceManualAudit';
import {
  PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX,
  PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX,
} from '../../src/compat/pineV6ReferenceManualIndex';
import { resolvesBuiltinReferenceNameForCoverage } from '../../src/semantic/checker';

const summarizeManualAudit = () =>
  summarizePineV6ReferenceManualAudit({ resolvesBuiltinReferenceName: resolvesBuiltinReferenceNameForCoverage });

type ManualBuiltinCategory = keyof typeof PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX;

const manualCategoriesForBuiltin = (name: string): ManualBuiltinCategory[] =>
  (['functions', 'variables', 'methods', 'constants'] as const).filter((category) =>
    (PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX[category] as readonly string[]).includes(name),
  );

describe('Pine v6 reference manual audit', () => {
  it('pins the official manual index snapshot shape', () => {
    expect(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.functions).toHaveLength(475);
    expect(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.variables).toHaveLength(161);
    expect(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.methods).toHaveLength(213);
    expect(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.constants).toHaveLength(239);

    expect(PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.keywords).toHaveLength(23);
    expect(PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.operators).toHaveLength(21);
    expect(PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.types).toHaveLength(20);
    expect(PINE_V6_REFERENCE_MANUAL_GRAMMAR_INDEX.annotations).toHaveLength(10);
  });

  it('reports the committed inventory differences against the manual index', () => {
    const audit = summarizeManualAudit();

    expect(audit.officialBuiltinNames).toBe(860);
    expect(audit.committedBuiltinNames).toBe(899);
    expect(audit.builtinNamesAbsentFromCommittedListCount).toBe(0);
    expect(audit.unresolvedManualBuiltinNamesCount).toBe(16);
    expect(audit.committedBuiltinNamesAbsentFromManualCount).toBe(39);
    expect(audit.grammarEntriesAbsentFromCommittedListCount).toBe(0);
  });

  it('keeps unresolved manual builtin names reasoned and grouped', () => {
    const audit = summarizeManualAudit();

    expect(audit.unresolvedManualBuiltinNames).toEqual(
      flattenedAuditGroupNames(PINE_V6_REFERENCE_MANUAL_UNRESOLVED_BUILTIN_GROUPS),
    );
  });

  it('keeps known-missing builtin names reasoned and grouped', () => {
    expect(PINE_V6_KNOWN_MISSING_BUILTINS).toEqual(
      flattenedAuditGroupNames(PINE_V6_KNOWN_MISSING_BUILTIN_GROUPS),
    );
  });

  it('keeps known-missing builtin review complete and tied to the manual index', () => {
    const reviews = PINE_V6_KNOWN_MISSING_BUILTIN_REVIEW as Record<string, PineV6KnownMissingBuiltinReview>;

    expect(Object.keys(reviews).sort()).toEqual(PINE_V6_KNOWN_MISSING_BUILTINS);

    for (const name of PINE_V6_KNOWN_MISSING_BUILTINS) {
      const review = reviews[name];

      expect(review.decision).toBe('keep-allowlisted');
      expect(review.manualCategories).toEqual(manualCategoriesForBuiltin(name));
      expect(review.reason.length).toBeGreaterThan(40);
    }
  });

  it('keeps local non-manual builtin names reasoned and grouped', () => {
    const audit = summarizeManualAudit();

    expect(audit.committedBuiltinNamesAbsentFromManual).toEqual(
      flattenedAuditGroupNames(PINE_V6_REFERENCE_MANUAL_LOCAL_EXTENSION_GROUPS),
    );
  });

  it('keeps manual grammar omissions reasoned and grouped', () => {
    const audit = summarizeManualAudit();

    expect(audit.grammarEntriesAbsentFromCommittedList).toEqual(
      flattenedAuditGroupNames(PINE_V6_REFERENCE_MANUAL_MISSING_GRAMMAR_GROUPS),
    );
  });
});

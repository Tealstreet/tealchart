import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { getPineVersionAdvisory, parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function selectAdvisories<T extends { code?: string; severity: string; kind?: string }>(diagnostics: readonly T[]): T[] {
  return diagnostics.filter((diagnostic) => diagnostic.severity === 'warning'
    || diagnostic.kind === 'advisory' || diagnostic.code === 'PINE_VERSION_OUTDATED');
}

describe('native outdated-version advisory', () => {
  it.each([4, 5])('warns without refusing explicit version %s', (version) => {
    const result = checkProgram(parse(`//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Advisory")\nplot(close)`));
    expect(result.diagnostics).toEqual([{
      code: 'PINE_VERSION_OUTDATED',
      message: `Version ${version} of Pine Script® is outdated. We recommend using the current version, which is 6.`,
      severity: 'warning', line: 1, column: 3,
    }]);
  });
});

const captures = [
  "v58/captures/v58/consumers/g02-v5-array-reassigned-before-int-int-int-first-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g03-v5-array-reassigned-before-float-int-int-first-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g04-v5-array-if-two-origins-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g06-v5-array-int-if-expression-once-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g07-v5-array-varip-alias-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g08-v5-array-conditional-initializer-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g09-v5-array-namespace-copy-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g10-v5-array-udt-field-int-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/g11-v5-array-int-identity-initializer-untyped/default/attempt-v1/observation-v2.json",
  "v58/captures/v58/consumers/local-precedence-natural-v5-v1/binding-v1/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-collection-5-namespace-v58-v1/collection-5/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-direct-5-false-namespace-v58-v1/direct-5-False/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-direct-5-true-namespace-v58-v1/direct-5-True/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-nested-5-namespace-v58-v1/nested-5/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-widening-5-namespace-v58-v1/widening-5/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-widening-5-receiver-v58-v1/widening-5/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-wrapper-5-false-namespace-v58-v1/wrapper-5-False/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/root2-wrapper-5-true-namespace-v58-v1/wrapper-5-True/attempt-v1/observation-v3.json",
  "v58/captures/v58/consumers/v5-direct-array-float-first-typed-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-float-first-typed-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-float-first-typed/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-float-first-untyped-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-float-first-untyped-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-float-first-untyped/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-int-first-typed-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-int-first-typed-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-int-first-typed/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-int-first-untyped-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-int-first-untyped-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-array-int-first-untyped/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-body-frame/default/attempt-v2/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-float-first-function-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-float-first-method-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-float-function-omitted-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-float-function-supplied-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-float-method-omitted-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-float-method-supplied-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-function-cum-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-function-sma-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-independent/default/attempt-v2/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-int-first-function-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-int-first-method-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-float-first-typed-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-float-first-typed-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-float-first-typed/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-float-first-untyped-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-float-first-untyped-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-float-first-untyped/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-int-first-typed-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-int-first-typed-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-int-first-typed/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-int-first-untyped-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-int-first-untyped-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-map-int-first-untyped/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-float-first-typed-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-float-first-typed-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-float-first-typed/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-float-first-untyped-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-float-first-untyped-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-float-first-untyped/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-int-first-typed-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-int-first-typed-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-int-first-typed/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-int-first-untyped-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-int-first-untyped-var/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-matrix-int-first-untyped/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-method-sma-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-nested-function-range-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-nested-function-twice-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-nested-method-twice-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-omitted/default/attempt-v2/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-root-function-range-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-root-function-twice-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-root-method-range-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-direct-root-method-twice-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-body-frame/default/attempt-v2/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-float-first-function-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-float-first-method-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-float-function-omitted-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-float-function-supplied-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-float-method-omitted-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-float-method-supplied-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-function-cum-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-function-sma-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-independent/default/attempt-v2/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-int-first-function-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-int-first-method-v1/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-method-cum-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-method-sma-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-nested-function-range-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-nested-function-twice-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-nested-method-range-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-nested-method-twice-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-omitted/default/attempt-v2/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-root-function-range-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-root-function-twice-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-root-method-range-omitted/default/attempt-v1/observation-v1.json",
  "v58/captures/v58/consumers/v5-security-root-method-twice-omitted/default/attempt-v1/observation-v1.json",
  "v59/captures/v59/local-import-collision-library-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/local-import-collision-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-array-local-renamed-control-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-array-local-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-array-parameter-renamed-control-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-array-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-box-local-renamed-control-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-box-local-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-box-parameter-renamed-control-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-box-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-array-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-box-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-color-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-label-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-line-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-linefill-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-map-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-math-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-matrix-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-polyline-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-str-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-namespace-call-table-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-ta-custom-ema-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-ta-custom-sma-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-ta-custom-w0Value-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-array-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-box-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-label-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-line-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-map-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-matrix-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-renamed-control-v5-v59-v1/attempt-v1/observation-v4.json",
  "v59/captures/v59/ns-param-naming-udt-table-parameter-v5-v59-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/default-boundary-volume-multiply-v5-1x-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/method-header-helper-default-function-v5-1x-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/method-header-helper-default-receiver-v5-1x-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/optional-only-overloads-v5-declaration-v60-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/optional-only-overloads-v5-omitted-v60-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/optional-only-overloads-v5-supplied-v60-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/private-method-exported-forward-control-v5-v2/attempt-v1/observation-v5.json",
  "v60/captures/v60/private-method-private-receiver-v5-v2/attempt-v1/observation-v5.json",
  "v60/captures/v60/tuple-rhs-literal-v5-v60-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/tuple-rhs-mixed-v5-v60-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/unused-udt-v5-indicator-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/unused-udt-v5-library-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/v60-array-reassign-v5-typed-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/v60-array-reassign-v5-untyped-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/v60-map-reassign-v5-typed-v1/attempt-v1/observation-v4.json",
  "v60/captures/v60/v60-map-reassign-v5-untyped-v1/attempt-v1/observation-v4.json",
  "v61/captures/v61/private-transitive-base-v5-v61-v1/attempt-v1/observation-v3.json",
  "v61/captures/v61/private-transitive-v5-control-v2-indicator-v1/attempt-v1/observation-v3.json",
  "v61/captures/v61/private-transitive-v5-control-v2/attempt-v1/observation-v3.json",
  "v61/captures/v61/private-transitive-v5-private-v2/attempt-v1/observation-v3.json",
  "v61/captures/v61/tuple-rhs-booleans-v5-v61-v1/attempt-v1/observation-v3.json",
  "v61/captures/v61/tuple-rhs-identifiers-v5-v61-v1/attempt-v1/observation-v3.json",
  "v61/captures/v61/tuple-rhs-strings-v5-v61-v1/attempt-v1/observation-v3.json",
  "v62/captures/v62/ns-param-naming-box-handle-builtin-dot-v5-natural-v61-v1/attempt-v1/observation-v3.json",
  "v62/captures/v62/ns-param-naming-box-handle-builtin-dot-v5-renamed-control-v61-v1/attempt-v1/observation-v3.json",
  "v62/captures/v62/ns-param-naming-local-udt-custom-dot-v5-natural-v61-v1/attempt-v1/observation-v3.json",
  "v62/captures/v62/ns-param-naming-local-udt-custom-dot-v5-renamed-control-v61-v1/attempt-v1/observation-v3.json",
  "v63/captures/v63/custom-ta-change-v5-v61-v1/attempt-v1/observation-v4.json",
  "v63/captures/v63/custom-ta-crossover-v5-v61-v1/attempt-v1/observation-v4.json",
  "v63/captures/v63/custom-ta-highest-v5-v61-v1/attempt-v1/observation-v4.json",
  "v63/captures/v63/custom-ta-rsi-v5-v61-v1/attempt-v1/observation-v4.json",
  "v65/captures/v65/v61-v5-optional-only-typed-method-declaration-g6-v1/attempt-v1/observation-v3.json",
  "v65/captures/v65/v61-v5-optional-only-untyped-function-declaration-g6-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-color-v5-natural-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-color-v5-renamed-control-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-label-v5-natural-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-label-v5-renamed-control-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-line-v5-natural-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-line-v5-renamed-control-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-linefill-v5-natural-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-linefill-v5-renamed-control-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-table-v5-natural-v1/attempt-v1/observation-v3.json",
  "v66/captures/v66/ns-local-udt-no-call-table-v5-renamed-control-v1/attempt-v1/observation-v3.json",
  "v67/captures/v67/private-function-namespace-exported-control-v5-g6-v1/attempt-v1/observation-v3.json",
  "v67/captures/v67/private-function-namespace-private-v5-g6-v1/attempt-v1/observation-v3.json",
  "v68/captures/v68/unused-udt-receiver-only-v5-control-v1/attempt-v1/observation-v3.json",
  "v68/captures/v68/unused-udt-receiver-only-v5-natural-v1/attempt-v1/observation-v3.json",
  "v69/captures/v69/custom-ta-cum-v5-v63-followup-v1/attempt-v1/observation-v3.json",
  "v69/captures/v69/custom-ta-lowest-v5-v63-followup-v1/attempt-v1/observation-v3.json",
  "v69/captures/v69/custom-ta-stdev-v5-v63-followup-v1/attempt-v1/observation-v3.json",
  "v69/captures/v69/custom-ta-valuewhen-v5-v63-followup-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-bool-v4-direct-be-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-bool-v4-function-control-be-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-identifier-v4-direct-be-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-identifier-v4-function-control-be-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-numeric-v4-direct-be-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-numeric-v4-function-control-be-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-string-v4-direct-be-v1/attempt-v1/observation-v3.json",
  "v70/captures/v70/tuple-rhs-string-v4-function-control-be-v1/attempt-v1/observation-v3.json",
  "v71/captures/v71/unused-builtin-box-v5-control-v2/attempt-v1/observation-v3.json",
  "v71/captures/v71/unused-builtin-box-v5-natural-v2/attempt-v1/observation-v3.json",
  "v71/captures/v71/unused-builtin-footprint-v5-control-v2/attempt-v1/observation-v3.json",
  "v71/captures/v71/unused-builtin-footprint-v5-natural-v2/attempt-v1/observation-v3.json",
  "v72/captures/v72/custom-ta-max-v5-v69-followup-v1/attempt-v1/observation-v3.json",
  "v72/captures/v72/custom-ta-min-v5-v69-followup-v1/attempt-v1/observation-v3.json",
  "v72/captures/v72/custom-ta-variance-v5-v69-followup-v1/attempt-v1/observation-v3.json",
  "v72/captures/v72/custom-ta-wma-v5-v69-followup-v1/attempt-v1/observation-v3.json",
  "v73/captures/v73/ns-param-set-top-box-v5-v1/attempt-v1/observation-v3.json",
  "v73/captures/v73/ns-param-set-top-label-v5-v1/attempt-v1/observation-v3.json",
  "v73/captures/v73/ns-param-set-top-line-v5-v1/attempt-v1/observation-v3.json",
  "v73/captures/v73/ns-param-set-top-linefill-v5-v1/attempt-v1/observation-v3.json",
  "v73/captures/v73/ns-param-set-top-table-v5-v1/attempt-v1/observation-v3.json",
  "v74/captures/v74/inferred-box-parameter-box-v5-v1/attempt-v1/observation-v3.json",
  "v74/captures/v74/inferred-box-parameter-fresh-v5-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-box-v4-natural-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-box-v4-renamed-control-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-label-v4-natural-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-label-v4-renamed-control-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-line-v4-natural-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-line-v4-renamed-control-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-linefill-v4-natural-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-linefill-v4-renamed-control-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-table-v4-natural-v1/attempt-v1/observation-v3.json",
  "v75/captures/v75/ns-param-set-top-table-v4-renamed-control-v1/attempt-v1/observation-v3.json"
] as const;

describe('census class 17 native advisory captures', () => {
  it.each(captures)('%s', (observation) => {
    const native = JSON.parse(readFileSync(new URL(`../../oracle-probes/${observation}`, import.meta.url), 'utf8'));
    const input = native.executedSource as string;
    expect(createHash('sha256').update(input).digest('hex')).toBe(native.executedSha256);
    const expected = selectAdvisories(native.markers.map((marker: {
      code?: string; message: string; severity: number; startLineNumber: number; startColumn: number;
    }) => ({
      ...(marker.code === undefined ? {} : { code: marker.code }),
      message: marker.message,
      severity: marker.severity === 8 ? 'error' : marker.severity === 4 ? 'warning' : 'info',
      line: marker.startLineNumber,
      column: marker.startColumn,
    })));
    let result;
    try { result = parse(input); } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const advisory = getPineVersionAdvisory(error as Error);
      expect(selectAdvisories(advisory ? [advisory] : [])).toEqual(expected);
      return;
    }
    expect(selectAdvisories(checkProgram(result).diagnostics)).toEqual(expected);
  });

  it.each([
    'indicator("Implicit")\nplot(close)',
    'study("Implicit study")\nplot(close)',
    '\n//@version=5\nindicator("Later")\nplot(close)',
    '// @version=5\nindicator("Spaced")\nplot(close)',
    '//@VERSION=5\nindicator("Uppercase")\nplot(close)',
    '//@version=5\r\nindicator("CRLF")\r\nplot(close)',
    '//@version=5',
    '\ufeff//@version=5\nindicator("BOM")\nplot(close)',
    '//@version=6\nindicator("Current")\nplot(close)',
    '//@version=6\nindicator("Quoted")\nplot(str.length("//@version=5"))',
  ])('keeps unwitnessed versions and quoted directives free of the advisory: %s', (source) => {
    const ast = parse(source);
    expect(getPineVersionAdvisory(ast)).toBeUndefined();
    expect(checkProgram(ast).diagnostics).toEqual([]);
  });

  it('emits the v85-witnessed v3 LF-header advisory without a trace-body exception', () => {
    // V85 trace series/zero-control, attempts 1–5: the version-header advisory is present at 1:3.
    const ast = parse('//@version=3\nstudy("Legacy")\nplot(close)');
    const advisory = {
      code: 'PINE_VERSION_OUTDATED',
      message: 'Version 3 of Pine Script® is outdated. We recommend using the current version, which is 6.',
      severity: 'warning',
      line: 1,
      column: 3,
    };
    expect(getPineVersionAdvisory(ast)).toEqual(advisory);
    expect(checkProgram(ast).diagnostics).toEqual([advisory]);
  });

  it('keeps an advisory available without changing the parse error', () => {
    expect(() => parse('//@version=4\nstudy("Broken")\nplot(')).toThrow();
  });
});

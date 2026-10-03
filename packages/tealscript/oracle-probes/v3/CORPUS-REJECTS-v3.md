# Corpus-1 compile outcome capture v3

19 non-host minimal witnesses are registered in the shared bundle manifest and predictions. Copy-ready sources are in [PROBES-v3.md](PROBES-v3.md); follow [HANDOFF-v3.md](HANDOFF-v3.md). Native outcomes remain NOT-CAPTURED.

These 19 programs cover the first diagnostics of 30 rejected corpus rows. Ten additional rows require third-party host library sources and remain BLOCKED-HOST on Sam's library-source decision. Two programs isolate cbrt and hypot from the same row; related causes can share one program. Original corpus source paths, hashes, first diagnostics, and original minimized-source hashes are preserved in [corpus-reject-witnesses-v3.json](corpus-reject-witnesses-v3.json) and the shared expected-outcome JSON. A minimal outcome does not certify later constructs in an original script.

| Source | Corpus rows | Registered owner | Prediction |
|---|---|---|---|
| [corpus-matrix-sum-namespace.pine](corpus-matrix-sum-namespace.pine) | 154, 200, 201, 202, 203, 204, 205, 206 | codex-pjlp6t | COMPILE-REJECTION |
| [corpus-matrix-sum-method.pine](corpus-matrix-sum-method.pine) | 166, 167 | codex-pjlp6t | COMPILE-REJECTION |
| [corpus-matrix-float-to-int-id.pine](corpus-matrix-float-to-int-id.pine) | 2 | codex-776dnu | COMPILE-REJECTION |
| [corpus-matrix-string-element.pine](corpus-matrix-string-element.pine) | 153, 165 | codex-776dnu | COMPILE-REJECTION |
| [corpus-array-string-element.pine](corpus-array-string-element.pine) | 156 | codex-776dnu | COMPILE-REJECTION |
| [corpus-array-string-percentile.pine](corpus-array-string-percentile.pine) | 61 | codex-776dnu | COMPILE-REJECTION |
| [corpus-v6-na-bool.pine](corpus-v6-na-bool.pine) | 8, 30, 194 | codex-9tqhik | COMPILE-REJECTION |
| [corpus-fill-optional-color.pine](corpus-fill-optional-color.pine) | 9 | codex-uk9554 | SUCCESS |
| [corpus-hline-chart-point.pine](corpus-hline-chart-point.pine) | 87 | codex-uk9554 | COMPILE-REJECTION |
| [corpus-hline-matrix.pine](corpus-hline-matrix.pine) | 207 | codex-uk9554 | COMPILE-REJECTION |
| [corpus-fractional-series-division-int.pine](corpus-fractional-series-division-int.pine) | 46 | corpus-1 evidence work | COMPILE-REJECTION |
| [corpus-fractional-timeframe-division-int.pine](corpus-fractional-timeframe-division-int.pine) | 117 | corpus-1 evidence work | COMPILE-REJECTION |
| [corpus-v5-tuple-call-target.pine](corpus-v5-tuple-call-target.pine) | 32 | corpus-1 evidence work | COMPILE-REJECTION |
| [corpus-v5-ellipsis-placeholder.pine](corpus-v5-ellipsis-placeholder.pine) | 77 | corpus-1 evidence work | COMPILE-REJECTION |
| [corpus-v5-unary-plus-string.pine](corpus-v5-unary-plus-string.pine) | 78 | corpus-1 evidence work | UNSPECIFIED |
| [corpus-v5-unknown-cbrt.pine](corpus-v5-unknown-cbrt.pine) | 139 | corpus-1 evidence work | UNSPECIFIED |
| [corpus-v5-unknown-hypot.pine](corpus-v5-unknown-hypot.pine) | 139 | corpus-1 evidence work | UNSPECIFIED |
| [corpus-footprint-missing-ticks.pine](corpus-footprint-missing-ticks.pine) | 247 | corpus-1 evidence work | COMPILE-REJECTION |
| [corpus-function-value-shared-name.pine](corpus-function-value-shared-name.pine) | 57, 130 | codex-cnf04e | SUCCESS |

Capture distinctions:

- Do not repair the tuple call target or replace literal `...` with a valid expression. Retain v5 headers on these syntax probes and the unary-string/math probes.
- Capture unary plus applied to a string independently of ordinary binary string concatenation. The v5 manual does not explicitly settle that unary case.
- V6 division-to-int probes keep explicit `int` declarations. A whole numeric quotient on the selected chart interval does not settle static type acceptance.
- Matrix sum namespace and receiver probes deliberately omit `id2`. The collection owner accepted the exact originals, then the overseer reassigned the missing-id2 ten-row subset to codex-pjlp6t. These captures supply independent native evidence; other collection causes remain with codex-776dnu.
- The fill probe requires two handle plots (`FILL_FIRST`, `FILL_SECOND`) plus `OUTCOME`, for a total budget of three. Export all three if it runs; save a chart screenshot. Its sentinel only proves acceptance of the omitted color.
- Shared-name OUTCOME observes `ma(ma)` with separate function/value bindings. An accepted minimal source does not clear the remaining missing library in original row130.
- A footprint subscription/provider error is not a captured required-ticks compiler refusal. Preserve unrelated diagnostic evidence and leave the arity target unresolved if masked.
- Every exact native compile/runtime diagnostic needs full text, code if exposed, line/column, and screenshot. For a successful source, retain the complete CSV with missingness and required visual evidence.

Local validation is separate in `corpus-local-validation-v3.json` once dependencies are restored. Reproducing our own rejection does not prove native invalid Pine.

For registration after a shared-manifest rebuild, run `python3 add-corpus-rejects-v3.py`, then `python3 build-staging-v3.py`. The registration extension reads only shipped files and preserves unrelated existing entries. Sources remain fixed; regeneration verifies every code block byte-for-byte.

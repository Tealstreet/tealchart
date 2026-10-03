# Matrix.sum omitted-id2 value probes v4

Three separate v6 probes isolate namespace, receiver and returned-receiver forms. Copy their exact sources from [PROBES-v4.md](PROBES-v4.md), following [HANDOFF-v4.md](HANDOFF-v4.md). Sources deliberately omit id2; do not supply a default or change them to a binary addition.

The float inputs are2.5,5.25,11.125,-17.0625 (conditional scalar total1.8125). The int inputs are2,5,11,-17 (conditional total1). These are hypotheses for discrimination, not predicted native outcomes. Capture the exact native phase. If accepted, copy the complete first-bar RESULT= text from Pine Logs and retain a table screenshot; it can reveal a scalar or a matrix. Export the OUTCOME sentinel CSV separately. OUTCOME=1 does not establish either total.

The probe does not settle empty/all-na behavior, return qualifiers, reference sharing or numeric-only eligibility. A helper failure can mask the value; preserve it without treating it as target refusal. No native error code/text is invented. Native result semantics are still unpinned, and our engine retains its current refusal.

Sources:

- [corpus1-matrix-sum-omitted-id2-namespace-float-v1.pine](corpus1-matrix-sum-omitted-id2-namespace-float-v1.pine) — SHA256 `648a40f61bd4fa0dd8ad8fb77c9cf158334291e7258f658e79b790fccd836a79`.
- [corpus1-matrix-sum-omitted-id2-receiver-int-v1.pine](corpus1-matrix-sum-omitted-id2-receiver-int-v1.pine) — SHA256 `7a9b43ead84e059ec1f2e1a9b5b1b124a02c6419ce2971ab2c0d2059207340e1`.
- [corpus1-matrix-sum-omitted-id2-returned-receiver-float-v1.pine](corpus1-matrix-sum-omitted-id2-returned-receiver-float-v1.pine) — SHA256 `0574e171678061e4cb07a809c988a101d326d55d4f7998e3016f2964f6bf3c1f`.

# group-14 — capture instructions v1

inherited omitted-default roots: named calls, nested requests, parameter header references, optional overloads and imported defaults

Record native phase and values without prediction: both are UNSPECIFIED. Preserve every diagnostic, warning, code, line/column, runtime bar and source location. Capture successful CSVs with timestamps, OHLCV, all observer columns, settings, inputs, capture time and the last confirmed-bar cutoff. Keep open-row updates separate from historical rows.

Preserve exact source bytes. Unavailable REMOTE/REMOTE:ALT or unpublished-library diagnostics must be retained; do not silently substitute a symbol or helper. Earlier errors mask later value questions. Preserve duplicate unnamed plot headers and their column positions. Local engine observations and controls do not predict native admission or values.

For an authorized library capture, first record prerequisite admission/publication and its exact source hash plus actual owner/title/version. Bind paired consumers to the SAME immutable publication; change only the import identity, save the executed source, its SHA256 and the import-only diff. Keep the original template hash. A refused or unavailable prerequisite is PUBLICATION-BLOCKED, not consumer-form evidence. Do not rewrite an exported method as a function or inline helper to get admission.

This assembled v58 capture order supersedes the submitted packets' staging-only/no-assembly directions. Publication has not been performed by the assembler. Record any unmet physical/live context as CONTEXT-UNMET; do not invent a feed or infer realtime behavior from historical CSVs.

Capture the primary seed discriminator and cross-reference its title-only variant; it has zero independent coverage credit. Retain both assets. Nested omitted/explicit requests change call path as well as the default; do not call that pair a single-token causal test. TK/Lib/1 remains a placeholder and REMOTE may be unavailable.

## Assets

- [first-named-omitted-v1.pine](../first-named-omitted-v1.pine) — omitted; [instructions](./first-named-omitted-v1-instructions-v1.md).
- [first-named-explicit-v1.pine](../first-named-explicit-v1.pine) — explicit-companion; [instructions](./first-named-explicit-v1-instructions-v1.md).
- [nested-request-omitted-v1.pine](../nested-request-omitted-v1.pine) — omitted; [instructions](./nested-request-omitted-v1-instructions-v1.md).
- [nested-request-explicit-v1.pine](../nested-request-explicit-v1.pine) — explicit-companion; [instructions](./nested-request-explicit-v1-instructions-v1.md).
- [parameter-reference-omitted-v1.pine](../parameter-reference-omitted-v1.pine) — omitted; [instructions](./parameter-reference-omitted-v1-instructions-v1.md).
- [parameter-reference-explicit-v1.pine](../parameter-reference-explicit-v1.pine) — explicit-companion; [instructions](./parameter-reference-explicit-v1-instructions-v1.md).
- [default-presence-overload-omitted-v1.pine](../default-presence-overload-omitted-v1.pine) — omitted; [instructions](./default-presence-overload-omitted-v1-instructions-v1.md).
- [default-presence-overload-explicit-v1.pine](../default-presence-overload-explicit-v1.pine) — explicit-companion; [instructions](./default-presence-overload-explicit-v1-instructions-v1.md).
- [imported-omitted-v1.pine](../imported-omitted-v1.pine) — omitted; [instructions](./imported-omitted-v1-instructions-v1.md).
- [imported-explicit-v1.pine](../imported-explicit-v1.pine) — explicit-companion; [instructions](./imported-explicit-v1-instructions-v1.md).
- [default-request-omitted-original-v1.pine](../default-request-omitted-original-v1.pine) — omitted-seed-variant; [instructions](./default-request-omitted-original-v1-instructions-v1.md).
- [default-request-omitted-reversed-v1.pine](../default-request-omitted-reversed-v1.pine) — omitted-seed-variant; [instructions](./default-request-omitted-reversed-v1-instructions-v1.md).
- [TK-Lib-1-v1.pine](../TK-Lib-1-v1.pine) — library prerequisite; [instructions](./TK-Lib-1-v1-instructions-v1.md).

## Pair and capture plan v1

The hash-bound plan below resolves retained assets by bundle path; original absolute paths are submission provenance.

```json
{
  "omittedExplicitPairs": [
    {
      "family": "first-named",
      "omitted": "first-named-omitted",
      "explicit": "first-named-explicit",
      "omittedSha256": "74d7ca3b30d099196e884f8121a3c9e0d4b2beed6e9a256840c9ad313a6be3d8",
      "explicitSha256": "ecb06a0ff39c28664c30ac4e8086f96259e1204a94edd7070022ca010b7b69b6",
      "sourceDiff": [
        "--- ",
        "+++ ",
        "@@ -10,5 +10,5 @@",
        " int scalar=1",
        " if false",
        "     ignored=inner(scalar)",
        "-tkRun()=>read(b=7)",
        "+tkRun()=>read(a=close.wrap(),b=7)",
        " plot(tkRun())"
      ],
      "admissionAssumed": false,
      "omittedBundlePath": "first-named-omitted-v1.pine",
      "explicitBundlePath": "first-named-explicit-v1.pine"
    },
    {
      "family": "nested-request",
      "omitted": "nested-request-omitted",
      "explicit": "nested-request-explicit",
      "omittedSha256": "b691a64b186cdbbcaabd3bca22a614e9964129663a29124c092405e20e1da286",
      "explicitSha256": "3088c856090fbd2e13cc43f0baf68633b23be853555ed5dbd18a4abf66f0e12a",
      "sourceDiff": [
        "--- ",
        "+++ ",
        "@@ -11,5 +11,5 @@",
        " int scalar=1",
        " if false",
        "     ignored=inner(scalar)",
        "-tkRun()=>outer()",
        "+tkRun()=>request.security(\"REMOTE\",\"1D\",read(close.wrap()),lookahead=barmerge.lookahead_on)",
        " plot(tkRun())"
      ],
      "admissionAssumed": false,
      "omittedBundlePath": "nested-request-omitted-v1.pine",
      "explicitBundlePath": "nested-request-explicit-v1.pine"
    },
    {
      "family": "parameter-reference",
      "omitted": "parameter-reference-omitted",
      "explicit": "parameter-reference-explicit",
      "omittedSha256": "7eaf2fee8d1523765a0f3cafbaa438037a5b3194b28ac2c8809e9261c53df676",
      "explicitSha256": "e967d49f3257d8b6ebb69e0f2e85375d9a81e525dabc779901994e0ec3edf64d",
      "sourceDiff": [
        "--- ",
        "+++ ",
        "@@ -10,5 +10,5 @@",
        " int scalar=1",
        " if false",
        "     ignored=inner(scalar)",
        "-tkRun()=>read(a=5)",
        "+tkRun()=>read(a=5,b=5+close.wrap())",
        " plot(tkRun())"
      ],
      "admissionAssumed": false,
      "omittedBundlePath": "parameter-reference-omitted-v1.pine",
      "explicitBundlePath": "parameter-reference-explicit-v1.pine"
    },
    {
      "family": "default-presence-overload",
      "omitted": "default-presence-overload-omitted",
      "explicit": "default-presence-overload-explicit",
      "omittedSha256": "918380e2e81542281854d2145ae78cf89eb7a34fe9f04cb9496b9c7109be3c23",
      "explicitSha256": "42e5bfc483cee4d19f25b252945324d1d2a42f80088b83d40b1e0b6a0850197c",
      "sourceDiff": [
        "--- ",
        "+++ ",
        "@@ -11,5 +11,5 @@",
        " int scalar=1",
        " if false",
        "     ignored=inner(scalar)",
        "-tkRun()=>read(2)",
        "+tkRun()=>read(2,close.wrap())",
        " plot(tkRun())"
      ],
      "admissionAssumed": false,
      "omittedBundlePath": "default-presence-overload-omitted-v1.pine",
      "explicitBundlePath": "default-presence-overload-explicit-v1.pine"
    },
    {
      "family": "imported",
      "omitted": "imported-omitted",
      "explicit": "imported-explicit",
      "omittedSha256": "76dc6e3fd8f5474284d71d52ecbe3e765b0c77ee8809c43bc0bc19043f7cb47a",
      "explicitSha256": "c4e4f90dadc6651a0299815341523c949412cb5867017580dc35e3c8d0c278a4",
      "sourceDiff": [
        "--- ",
        "+++ ",
        "@@ -1,5 +1,5 @@",
        " //@version=6",
        " indicator(\"TK library\",dynamic_requests=true)",
        " import TK/Lib/1 as l",
        "-tkRun()=>l.read()",
        "+tkRun()=>l.read(request.security(\"REMOTE\",\"1D\",close,lookahead=barmerge.lookahead_on))",
        " plot(tkRun())"
      ],
      "admissionAssumed": false,
      "omittedBundlePath": "imported-omitted-v1.pine",
      "explicitBundlePath": "imported-explicit-v1.pine"
    }
  ],
  "sameDiscriminatorSeedVariants": {
    "primary": "default-request-omitted-original",
    "crossReferenceOnly": "default-request-omitted-reversed",
    "primarySha256": "84704165612d3b7cd3aa5c95605b9e29c4761f25174bb7345c36ca756c800414",
    "aliasSha256": "ae6393cac9d98adab0e4aa6fb2ae20334e8b5593a8b0379d8b0758c12ba78933",
    "difference": "Indicator title only; same executable discriminator.",
    "independentCoverageCredit": 0
  },
  "knownBlockers": [
    "REMOTE symbol unavailable",
    "synthetic TK/Lib/1 not published"
  ]
}
```

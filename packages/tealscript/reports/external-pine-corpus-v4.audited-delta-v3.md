> Superseded by external-pine-corpus-v4.audited-delta-v4.md. Historical measurement only; use the superseding report for current figures.

# V4 Audited Delta V3: Hostile-Vector-Head Rerun

This is a fixed-corpus rerun after the engine changes for Pine array history,
extrema warmup, drawing receiver binding, and qualified user-method calls. No
source was re-harvested. The classifier ran the 649-row no-timeout view; the
125 KB timeout row `0254` is restored in the audited 650-row universe with its
previously established execute-stage timeout disposition.

## Comparable Headline

The same audited exclusions are used for both measurements: 61 invalid-Pine
rows, 20 unsupported-by-design rows, and 11 corpus-hygiene rows. The resulting
achievable denominator is 558 rows.

| Measure | Previous audited result | Current audited rerun | Delta |
| --- | ---: | ---: | ---: |
| Supported | 527 | 523 | -4 |
| TealScript gap | 31 | 35 | +4 |
| Achievable denominator | 558 | 558 | 0 |
| Parity | `527 / 558` (94.44%) | `523 / 558` (93.73%) | -0.72 pp |

The decrease is measured, not inferred. The current raw report is
`/tmp/pine-corpus-v4-rerun/report-20260905-after-hostile-rerun.json`; its raw
validity buckets are `523 supported / 86 TealScript gap / 20 invalid Pine / 20
unsupported by design` over 649 completed rows. Applying the committed audits
and restoring `0254` produces the single 558-row headline above. Raw and
audited denominators are not mixed in the headline.

## Audited Funnel

| Stage | Current count | Percent of 558 |
| --- | ---: | ---: |
| Parse | 557 | 99.82% |
| Semantic | 542 | 97.13% |
| Compile | 542 | 97.13% |
| Execute | 527 | 94.44% |
| Output | 512 | 91.76% |

The parse count excludes the one genuine parser gap (`0329`); the timeout row's
parser probe passed and its execution timeout remains a gap. The current raw
run uses the same checked-in TypeScript parser/checker/compiler and the supplied
official-library registry; it does not load a generated report or build cache.

## Row Movement Since 527

Comparison with the immediately preceding value-vector-head report found these
behavior changes:

| Row | Previous | Current | Interpretation |
| --- | --- | --- | --- |
| `0111` | semantic box receiver gap | produced compiled output | drawing receiver binding now exercises successfully |
| `0571` | array bounds runtime gap | produced compiled output | array history/runtime path now exercises successfully |
| `0120` | line receiver gap | execute `runtime.error: Not enough data to calculate Pivot Points` | advanced to a later, data-window-dependent failure |
| `0171` | produced compiled output | semantic `label.set_xy() expects at most 2 arguments` | current signature checking exposes an unrelated remaining gap |
| `0226` | produced compiled output | semantic duplicate `table.cell(column=...)` argument | current audit classifies the source as invalid Pine |
| `0279` | array semantic gap | array runtime `Cannot read properties of undefined (reading 'length')` | moved from semantic to runtime failure, not a pass |
| `0468` | output undecided | semantic `str.split source must be a string, got array<string>` | current type checking exposes a remaining gap |

The extrema warmup fix did not change a row in this corpus run; its hostile
value vectors remain the direct evidence for that behavior. The net headline is
therefore 523 supported, not a claim that every landed fix improved this
particular sample.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus \
  --input /tmp/pine-corpus-v4-rerun-no-timeout \
  --output /tmp/pine-corpus-v4-rerun/report-20260905-after-hostile-rerun.json
```

The corpus remains the pinned v4 manifest: 650 rows from 243 repositories. The
no-timeout input is only an execution guard; it does not alter the audited
denominator or silently drop `0254`.

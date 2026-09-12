# External Pine Corpus Version-Rule Settlement Rerun V1

Date: 2026-09-12

Purpose: verify the prediction in
`external-pine-corpus-version-refusal-prediction-v1.md` after the parser lane
settled the four version-rule diagnostics on merged parity.

Current measurement commit: `5da61fcb1a`
(`5da61fcb1ac8023ddb3cd80b6810620df0615a42`).

Baseline measurement commit: `8db55d66ae`
(`8db55d66aeb6503072350ffe31f31ff4b33745c2`).

Prediction commit: `9b55fe5a1d`.

## Headline

The prediction holds: `0` corpus rows moved.

| Corpus | Baseline | Current | New repairs | New refusals | Outcome changes |
| --- | ---: | ---: | ---: | ---: | ---: |
| v5 | `867/925` | `867/925` | `0` | `0` | `0` |
| v6 | `787/935` | `787/935` | `0` | `0` | `0` |
| v7 | `305/400` | `305/400` | `0` | `0` | `0` |

Rerun artifacts:

- `external-pine-corpus-v5.daily-rerun-5da61fcb1a.json`
- `external-pine-corpus-v6.daily-rerun-5da61fcb1a.json`
- `external-pine-corpus-v7.daily-rerun-5da61fcb1a.json`

Both corpus gates were green before the full rerun:

- Fast acceptance gate: `12/12` output rows.
- Expected-refusal gate: `6/6` expected refusals, `0` output rows.

## Attribution

There are no acceptance deltas to attribute. The parser settlement changed
stale vector bookkeeping and diagnostic wording rather than corpus acceptance
behavior:

- v5 global `sma()` and v4 untyped `x = na` were already rejected before this
  rerun; the value-vector expected-red entries were stale.
- v5 generic `input(..., type=input.integer)` and v3 bool-to-number arithmetic
  already produced diagnostics; the oracle expected different wording.

The corpus row diff confirms there were no hidden offsetting movements:

- repairs from non-output to output: `0`;
- refusals from output to non-output: `0`;
- total row outcome or failed-stage changes: `0`.

## Source-Scan Check

The source-scan half of the earlier prediction was re-run at `5da61fcb1a` into
`/tmp/external-pine-corpus-version-refusal-prediction-current`. It again found
`0` source rows for all four shapes under declared versions:

| Rule | Source rows | Producing rows | Predicted drop |
| --- | ---: | ---: | ---: |
| v5 generic `input(..., type=input.integer)` | `0` | `0` | `0` |
| v5 bare global `sma()` | `0` | `0` | `0` |
| v4 statement-level untyped `= na` | `0` | `0` | `0` |
| v3 bool-to-number arithmetic | `0` | `0` | `0` |

So the zero movement is not merely because the four refusals had already landed
before the `8db55d66ae` baseline. The constructs also remain absent from the
measured v5/v6/v7 corpus rows. The legacy-version surface is therefore now
six-for-six cold in this GitHub corpus sample, with the same caveat recorded in
`PINE_CORPUS_BRIEFING.md`: dormant user-owned legacy scripts may still depend on
these rules even if the public corpus does not.

# External Pine Corpus Version-Refusal Prediction V1

Date: 2026-09-12

Measurement commit for this static source scan: `8528648ef3`.

Baseline acceptance reports:

| Corpus | Report | Measurement commit |
| --- | --- | --- |
| v5 | `reports/external-pine-corpus-v5.daily-rerun-8db55d66ae.json` | `8db55d66aeb6503072350ffe31f31ff4b33745c2` |
| v6 | `reports/external-pine-corpus-v6.daily-rerun-8db55d66ae.json` | `8db55d66aeb6503072350ffe31f31ff4b33745c2` |
| v7 | `reports/external-pine-corpus-v7.daily-rerun-8db55d66ae.json` | `8db55d66aeb6503072350ffe31f31ff4b33745c2` |

## Headline

Predicted output drop when the four currently-missing version refusals land: `0` rows.

The prediction is a source scan, not a rerun. It counts a row as a headline-risk
row only when the construct appears under the row's declared Pine version and
the latest baseline report says the row currently produces output.

The v4 `= na` detector requires statement-level parenthesis depth zero. This
intentionally excludes named arguments such as `y=na` inside `label.new(...)`,
which occur in declared-v4 Everget scripts but are not untyped declarations and
should not predict a version-refusal drop.

| Rule | Source rows | Currently producing rows | Predicted output drop | Notes |
| --- | ---: | ---: | ---: | --- |
| `v5-generic-input-type-integer` | `0` | `0` | `0-0` | Static source match under the declared Pine version; predicted drop counts only currently producing rows. |
| `v5-global-sma` | `0` | `0` | `0-0` | Rows with a local sma() definition are reported as shadowed candidates and excluded from the predicted drop range. |
| `v4-untyped-na` | `0` | `0` | `0-0` | Static source match under the declared Pine version; predicted drop counts only currently producing rows. |
| `v3-bool-number-arithmetic` | `0` | `0` | `0-0` | Static source match under the declared Pine version; predicted drop counts only currently producing rows. |

## v5-generic-input-type-integer

No corpus rows matched this shape under their declared Pine version.

## v5-global-sma

No corpus rows matched this shape under their declared Pine version.

## v4-untyped-na

No corpus rows matched this shape under their declared Pine version.

## v3-bool-number-arithmetic

No corpus rows matched this shape under their declared Pine version.


> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Follow-up Audit v1

This report audits the next four semantic causes against the pinned v4 source
files. It does not change source code. Each row below names the exact construct
that caused the classifier result and its v6 validity verdict.

## Verdicts

| Cause | Rows | Valid Pine gaps | Invalid Pine | Evidence |
| --- | ---: | ---: | ---: | --- |
| `argument-count` | 5 | 3 | 2 | receiver binding, `ta.min(source)`, and `ta.max(source)` are valid; `matrix.sum()` and three-argument `color.from_gradient()` are not v6 calls |
| `unknown-argument` | 5 | 0 | 5 | `explicit_plot_display`, `label.new(text_size=...)`, `color.new(linewidth=...)`, `box.new(title=...)`, and `indicator(linktoseries=...)` are not accepted v6 parameter shapes |
| `duplicate-argument` | 4 | 0 | 4 | each calls `plot()` with `color` twice; Pine rejects duplicate named arguments |
| `implicit-numeric-bool` | 3 | 0 | 3 | v6 removed implicit numeric-to-bool conversion; each uses an integer directly as a condition |

## Argument Count

| Row | Repo / path @ SHA | Source construct | Verdict | Minimal reproducer |
| --- | --- | --- | --- | --- |
| `0091` | `helenananaa/pine-compat-runtime` / `tests/fixtures/sema/supported_matrix_new_int.pine` @ `62192b7f37bdd9be34d5b2af5768e943d7e55a9c` | `matrix.sum(stats)` | invalid-Pine | `matrix<int> m = matrix.new<int>(2, 2, 1)\nmatrix.sum(m)`; v6 requires `matrix.sum(id1, id2)` |
| `0216` | `helenananaa/pine-compat-runtime` / `tests/fixtures/sema/supported_bound_matrix_inv_call_result_reads.pine` @ `ab3ccbea61b5a97b5686ff73409922766c9c11fa` | `values.inv().fill(2.0)` | tealscript-gap | Method syntax supplies the matrix receiver plus the value; the checker incorrectly counts the receiver as missing |
| `0566` | `ferranbt/pinecone` / `tests/testdata/ta/min.pine` @ `5c22d14b0af0ba1714420cdf738b6dd9ff36a8b8` | `ta.min(src)` | tealscript-gap | `//@version=5\nindicator("ta/min")\nsrc = bar_index % 4\nplot(ta.min(src))`; v6 has the one-argument all-time-low overload |
| `0574` | `mitchell-917/tradingview-pinescript-lab` / `examples/snippets/plotting/color-themes-and-gradients.pine` @ `ce04d33eb7288c8b4d899a4ac9721201e385b21b` | `color.from_gradient(v, col1, col2)` | invalid-Pine | v6 requires `value, bottom_value, top_value, bottom_color, top_color` |
| `0638` | `btcjon/pine` / `archive/docs_archive/code_examples/Consolidation Filter.pine` @ `4bb621e0116dd22c94a824293fa89a9812230f94` | `ta.max(data)` | tealscript-gap | The method wraps the one-argument all-time-high overload; the checker incorrectly requires a length |

Reference: [TradingView v6 language reference](https://www.tradingview.com/pine-script-reference/v6/), including `matrix.sum()` and `color.from_gradient()` signatures.

## Unknown Arguments

| Row | Repo / path @ SHA | Source construct | Verdict | Why |
| --- | --- | --- | --- | --- |
| `0016` | `satyaa2212/Trading-Indicator---COT-Report` / `COT_Report_Indicator.pine` @ `e7454aa6713571f441cc4b16afa601ea6ea00cfc` | `indicator(..., explicit_plot_display=false)` | invalid-Pine | v6 uses `explicit_plot_zorder`; `explicit_plot_display` is not an indicator parameter |
| `0148` | `tradesdontlie/pine-script-v6-extension` / `test/fixtures/v6-all-features.pine` @ `17ee8ee4e51399c659bed32c9c4d08907c263291` | `label.new(..., text_size=16, ...)` | invalid-Pine | `label.new()` uses `size`; `text_size` is for box/table text, not labels |
| `0301` | `mushroom-men-Trading/clean-litter` / `Indicators/indicators/premade indicators/statistics/mode.pine` @ `95f5f5d4bcb4e0e95cff86291bf343484842fbe6` | `color.new(color.green, 0, color.yellow, linewidth=2)` | invalid-Pine | `color.new()` accepts a color and transparency only |
| `0463` | `timoteewo404/SS_media-pipe` / `goldbach_indicator.pine` @ `edb68e0d327236cbce0d3ea5e48767f1847c1801` | `box.new(..., title="Accumulation OB")` | invalid-Pine | `box.new()` has no `title` parameter |
| `0560` | `jimfa07/lupown-chart-studio` / `src/pine-script/comprehensive-strategy.pine` @ `2ad77bfcbe087e2eca02a71e91988cc70ab8a29a` | `indicator(..., linktoseries=true)` | invalid-Pine | `linktoseries` is not a v5 indicator declaration parameter |

## Duplicate Arguments

All four rows are invalid Pine because each repeats the named `color` argument in one `plot()` call: `0188` @ `ainell-owi/LePine` (`log.pine`, `5c8667271dbc56f27d3f9cfa53d71e8fbab90391`), `0542`, `0556`, and `0620` @ `Leci37/tuisku_Web_selling` (all `b5b8edf74680334ab3a79348992c810ffd76579e`). Minimal reproducer: `plot(close, color=color.red, color=color.blue)`.

## Implicit Numeric Bool

All three rows are invalid Pine v6 because an integer is used directly as a condition after v6 removed numeric-to-bool coercion: `0076` @ `DexWilder/algo-lab` (`37dee015edf6a677b556c434f22db6cd4da43196`), `0159` @ `knectardev/pine_scripts` (`56f1a63d4417e4e7480ed4c12be91a803aa3787e`), and `0168` @ `majixai/majixai.github.io` (`85beb0fbcb12adeb83356f6cf289f238ea933483`). Minimal reproducer: `int n = 1\nif n\n    plot(close)`; use `if n != 0` or a bool expression.

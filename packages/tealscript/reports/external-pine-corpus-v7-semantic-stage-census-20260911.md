# External Pine Corpus V7 Semantic-Stage Census

Measured: 2026-09-11
Code under test: `69c43143ac + this report's parser/semantic changes`
Worktree: `tealscript-parser`
Data: `pine-corpus-v7-20260911`
Full row data: `external-pine-corpus-v7-semantic-stage-census-20260911.json`

## Purpose

This is the semantic-stage census for the targeted v7 external corpus. It runs
every cached v7 source through parser acceptance and then `checkProgram()` at
current HEAD, using the same official-library registry policy as the external
corpus runner.

The v7 corpus was harvested for previously untouched members, so failures here
skew toward hard-tail syntax, rare signatures, and synthetic edge fixtures.
This report classifies only what can be judged from declared version,
committed Pine reference metadata, source shape, and existing corpus evidence.
Rows needing live compiler evidence remain unclassified.

This pass does not compile, execute, or compare output values.

## Method

- Source set: every case-insensitive `.pine` file in
  `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-corpus/packages/tealscript/.cache/tealscript/pine-corpus-v7-20260911/sources`.
- Manifest versions: v5 214, v6 242.
- Parse step: `parse(source, { grammarSource: file })`.
- Semantic step: `checkProgram(ast, { libraries })`.
- Library registry: official TradingView imports are supplied from
  `getOfficialTradingViewLibrary()`. Third-party imports without source remain
  host-library dependency failures.

## Stage Census

| Corpus | Total | Parse pass | Parse fail | Semantic pass | Semantic fail |
| --- | ---: | ---: | ---: | ---: | ---: |
| v7 | 456 | 440 | 16 | 338 | 102 |

For comparison only, the committed v7 fixture profile measured parse 436 and
semantic 329 at its earlier fixture-profile SHA. This census is measured at
`69c43143ac` plus the parser/semantic fixes described below, so the current
accepted surface is larger.

## Semantic Split

| Split | Rows | Meaning |
| --- | ---: | --- |
| Confirmed TealScript semantic acceptance gaps | 0 | None remain after the request-field and matrix/array inference fixes. |
| Confirmed invalid Pine / source mistake | 51 | Correct refusals by declared version, committed Pine signature metadata, or obvious source mistake. |
| Host dependency, trace boundary, or unsupported-by-design | 36 | Valid Pine shape may require third-party library source, host data, or TradingView trace parity. |
| Still unclassified | 15 | Needs TradingView/compiler evidence before being called invalid or ours. |

## Bucket Census

| Bucket | Rows | Split | Current classification |
| --- | ---: | --- | --- |
| Unresolved third-party import | 31 | Host/trace/unsupported | Host-library dependency; not a language acceptance gap. |
| Function/value duplicate-name collision | 10 | Unclassified | Needs compiler evidence. This deliberately disagrees with the fixture profile's broad invalid classification for these rows. |
| `matrix.sum()` one-argument call | 10 | Invalid Pine | Committed v6 signature requires two matrix arguments; one-argument aggregate examples are not accepted without contrary compiler evidence. |
| Nonexistent table text-wrap API | 8 | Invalid Pine | Committed v6 reference includes box text wrapping, not `table.cell(text_wrap=...)` or `table.cell_set_text_wrap(...)`. |
| Implicit float-to-int assignment | 5 | Invalid Pine | Correct refusal; Pine requires explicit `int(...)` conversion. |
| Pine v6 bool/numeric version mismatch | 4 | Invalid Pine | Correct v6 refusal; v3-v5 compatibility does not apply to declared v6 source. |
| `request.footprint()` missing `va_percent` | 4 | Invalid Pine | Committed v6 signature requires `ticks_per_row` and `va_percent`; one-argument forms are invalid. |
| Collection element type mismatch | 3 | Invalid Pine | Correct refusal: collection element writes must match element type. |
| Invalid `strategy.exit` trailing stop | 3 | Invalid Pine | Correct refusal for missing/invalid trailing-stop parameters. |
| Undefined source identifier | 3 | Invalid Pine | Source references a name with no visible declaration. |
| Comma-chain assignment plus `break` scoping | 2 | Unclassified | Needs compiler evidence; this resembles earlier block-boundary/scoping evidence rows. |
| `hline()` nonnumeric price | 2 | Invalid Pine | Correct refusal: `hline` price must be numeric. |
| Standard-OHLC host data boundary | 2 | Host/trace/unsupported | Requires host-supplied standard OHLC bars for non-standard charts. |
| `strategy(calc_on_order_fills=true)` | 2 | Host/trace/unsupported | Trace-required fill-triggered re-entry boundary. |
| Collection receiver method on unsupported call-result fixture | 1 | Unclassified | Disputed with the corpus-lane invalid judgement; source fixture is explicitly unsupported, so do not accept without compiler evidence. |
| Direct `na` comparison | 1 | Invalid Pine | Correct refusal; use `na(value)`. |
| Duplicate call argument | 1 | Invalid Pine | Correct refusal; a Pine parameter can be bound once. |
| Duplicate global/source concatenation | 1 | Invalid Pine | Multiple complete scripts or same-scope globals are concatenated in one cached source. |
| Expected `matrix<int>` mismatch | 1 | Invalid Pine | After matrix/vector and array return inference, only the fixture's TV-probed bad `matrix<int>` assignment remains. |
| Legacy generic `input(..., step=...)` in v5 | 1 | Invalid Pine | Current version rules/tests keep this only for older legacy input forms; declared v5 should use typed input helpers. |
| Nested local declaration visibility | 1 | Unclassified | Needs compiler evidence before changing semantic scoping. |
| Nonexistent `math.cbrt` | 1 | Invalid Pine | Not in the committed Pine v6 manual snapshot; correct refusal absent compiler evidence. |
| Strategy report metric trace boundary | 1 | Host/trace/unsupported | Requires TradingView report-metric trace parity. |
| `strategy.opentrades.capital_held` called as function | 1 | Invalid Pine | The committed reference has `strategy.opentrades.capital_held` as a variable, not a callable trade accessor. |
| `ticker.kagi()` two-argument form | 1 | Unclassified | Committed v6 signature requires `symbol`, `style`, and `param`, while the corpus lane called the harvested two-argument form a thin real gap; needs compiler evidence. |
| `time_close("", 1)` session argument type | 1 | Invalid Pine | The second positional argument is `session`, not `bars_back`; correct refusal. |
| Unknown `strategy.close_all(when=...)` argument | 1 | Invalid Pine | Committed signature has `comment`, `alert_message`, `immediately`, and `disable_alert`. |

## Semantic-Owned Queue

Zero semantic-owned rows remain.

The previous evidence-backed queue is closed:

1. `sources/0003__folknor-pine-tools__INV147-generic-overload-return.pine`
   - Fixed: `matrix.mult(matrix<float>, array<float>)` now infers
     `array<float>`, and `array.abs(array<int>)` preserves `array<int>`.
   - Remaining verdict: invalid Pine, because only the fixture's TV-probed
     `matrix<int> bad = matrix.mult(mf, mf)` mismatch remains.
2. `sources/0100__TommyPang-TradingBot__pillar7_catalysts.pine`
   - Fixed: future `request.dividends()` and `request.earnings()` fields are
     accepted by the request field validator.
3. `sources/0153__helenananaa-pine-compat-runtime__supported_matrix_fixed_float_collection_return_qualifier.pine`
   - Fixed: mixed int/float matrix helper returns promote to float.

Two rows that looked semantic-owned before reconciliation were deliberately not
accepted:

- `0010`: `array.copy(values).fill(3)` is from an explicitly unsupported
  call-result fixture, and the corpus lane calls it invalid. It stays
  unclassified without compiler evidence for method calls on call results.
- `0249`: `ticker.kagi(symbol, param)` conflicts with the committed three-arg
  signature, while the corpus lane calls the harvested two-arg form thin-real.
  It stays unclassified pending compiler evidence.

## Unclassified Semantic Queue

Fifteen semantic rows remain deliberately unclassified:

- Ten function/value duplicate-name collisions, including `ma() => ...`
  followed by `ma = ma(...)`. The fixture profile classifies these as invalid,
  but this census does not import that judgement without compiler evidence
  because the same namespace area has already produced accepted published rows.
- Two `swept := true, break` comma-chain rows where a later final `swept`
  expression is reported unknown. This may be invalid Pine or a block/scoping
  bug; it needs compiler evidence.
- One unsupported collection receiver method on a call result (`0010`).
- One nested local declaration visibility row (`found`) whose source shape is
  not enough to distinguish invalid block scoping from a checker bug.
- One two-argument `ticker.kagi()` row (`0249`), where committed signatures and
  corpus-lane classification disagree.

## Corpus-Lane Cross-Check

This census agrees with the host-dependency and many invalid classifications,
but intentionally disagrees in three places:

- Function/value duplicate-name rows remain unclassified rather than imported
  as invalid.
- `0003` was not broadly invalid: after matrix/vector and array inference fixes,
  only its intentional bad `matrix<int>` assignment remains.
- `0249` remains unclassified rather than accepted or rejected from source shape
  alone.

Those disagreements are evidence-bearing. A live compiler trace or published
TradingView source should settle them before semantic behavior changes.

## Measurement Notes

The JSON report records one first semantic error per source, plus manifest
metadata, upstream repo/path, commit SHA, matched targeted members, source line,
and classification. Rows that fail parse are excluded from the semantic split
because semantic checking never ran for them.

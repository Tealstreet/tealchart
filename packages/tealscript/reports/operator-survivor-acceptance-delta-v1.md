# Operator Survivor Acceptance Delta v1

Date: 2026-09-12

Measurement commit: `cb0f29f78c`

Baseline commit: `37a7dc7375`

Raw current reports:

- `external-pine-corpus-v5.operator-survivors-cb0f29f78c.json`
- `external-pine-corpus-v6.operator-survivors-cb0f29f78c.json`
- `external-pine-corpus-v7.operator-survivors-cb0f29f78c.json`

## Scope

This measures the two surviving operator changes after reverting the uncited v5
const-int division rule:

- `%` in declared Pine v5/v6 now uses the documented floor-quotient modulo
  formula for negative operands.
- Invalid operator operand pairs now refuse instead of inheriting JavaScript
  coercion.

The combined measurement includes parity parser fix `9809d486d9`, which restored
three v5 continuation rows that the invalid-operand diagnostic had surfaced.
Those rows are not fallout and are not intentional refusals.

The reverted v5 const-int division change is not part of this measurement.

## Acceptance Headline

The merged tree moved from `1949/2260` achievable output rows to `1947/2261`.
That is not a net-only movement: it is `2` produced-output losses and `0`
recoveries. One v6 row moved only in corpus validity classification, from
`unsupported-by-design` to `tealscript-gap`; it did not cross the produced-output
boundary and is not an operator regression.

| Corpus | Baseline | Current | Raw output | Achievable output | Produced to non-output | Non-output to produced |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v5 | `37a7dc7375` | `cb0f29f78c` | `866/1000` to `866/1000` (`0`) | `866/925` to `866/925` (`0`) | 0 | 0 |
| v6 | `37a7dc7375` | `cb0f29f78c` | `776/1000` to `776/1000` (`0`) | `776/935` to `776/936` (`0`) | 0 | 0 |
| v7 | `37a7dc7375` | `cb0f29f78c` | `307/456` to `305/456` (`-2`) | `307/400` to `305/400` (`-2`) | 2 | 0 |
| Total |  |  | `1949/2456` to `1947/2456` (`-2`) | `1949/2260` to `1947/2261` (`-2`) | 2 | 0 |

## Loss Attribution

Clean intentional invalid-operand refusals:

- v7 `sources/0079__btcjon-pine__TTB_MTF_SnD.pine`
  - Diagnostic: `339:61: invalid-operator-operands: Operator + requires a numeric operand, got string`
  - Source shape: `"New demand zone formed on " +  + TF_Display(...)`
  - Attribution: invalid-operator operand refusal. The second `+` is unary plus
    applied to a string result.
- v7 `sources/0080__btcjon-pine__TTB_MTF_SnD_strat.pine`
  - Diagnostic: `335:61: invalid-operator-operands: Operator + requires a numeric operand, got string`
  - Source shape: `"New demand zone formed on " +  + TF_Display(...)`
  - Attribution: invalid-operator operand refusal. Same double-plus shape as
    v7 `0079`.

No unattributed produced-output loss remains on the combined tree.

Parser-recovered rows:

- v5 `sources/0497__casoon-pine-scripts__wavetrend_strategy.pine`
- v5 `sources/0554__casoon-pine-scripts__wavetrend.pine`
- v5 `sources/0924__g-moe-Trading-Indicators__tbm-wick-test.pine`

These three rows parse, check, compile, execute, and produce output after
`9809d486d9`. The invalid-operand refusal exposed a latent parser defect:
`isBlockIndentedOperator()` treated `<=` / `>=` inside a completed conditional
operand as block-indented, so the next leading `+` / `-` parsed as unary instead
of binary. The earlier JavaScript-coercion leak hid that parse defect as long as
both bugs coexisted.

Denominator-only movement:

- v6 `sources/0551__Electrified-Trading-Indicators__MACD-Duo.pine` changed
  validity bucket from `unsupported-by-design` to `tealscript-gap` because the
  parser now reaches a parse-gap classification instead of the previous closed
  import classification. It did not cross the produced-output boundary.

## Modulo Value Impact

Acceptance is the wrong primary instrument for negative modulo. A script that
computed the wrong remainder before usually still produces output after the fix;
only the values change. I therefore ran a second, value-focused pass over rows
that produced output in the combined report and contain actual AST `%` / `%=`
operator sites.

AST modulo rows that produced output:

| Corpus | Rows |
| --- | ---: |
| v5 | 150 |
| v6 | 56 |
| v7 | 37 |
| Total | 243 |

The first broad baseline-to-current payload hash comparison was not usable for
attribution because `37a7dc7375` to `cb0f29f78c` includes many unrelated runtime
value fixes. To isolate modulo, I compared the combined tree against the same
tree with only commit `8a1fb60dac`'s modulo lowering temporarily reversed, then
restored the patch. Both fix-on and fix-off controls were run for every changed
candidate row.

| Corpus | Isolated hash changes | Unstable by controls | Stable modulo value changes |
| --- | ---: | ---: | ---: |
| v5 | 3 | 2 | 1 |
| v6 | 3 | 1 | 2 |
| v7 | 2 | 0 | 2 |
| Total | 8 | 3 | 5 |

Stable visible payload changes attributable to the negative-modulo fix:

- v5 `sources/0041__mihakralj-pinescript__lunar.pine`
  - Shape: lunar/solar angle normalization, e.g. `(L_moon - L_sun) % 360.0`.
- v6 `sources/0421__alboogycOdR-dev-projects__apx3.2.gem.pine`
  - Shape: FVG/fib indexing and countdown math, including
    `timeDifference % 3600000`.
- v6 `sources/0490__regalouisei-collect-tradingview__mxwll-price-action-suite-mxwll.pine`
  - Shape: same FVG/fib indexing and countdown modulo family.
- v7 `sources/0209__majixai-majixai.github.io__jinx.pine`
  - Shape: signed phase normalization, ring-buffer index math, and
    `bar_index % dynamic_gc_interval`.
- v7 `sources/0210__majixai-majixai.github.io__differentiated_conic_projection_engine.pine`
  - Shape: same signed phase and ring-buffer modulo family as v7 `0209`.

Unstable candidates excluded by controls:

- v5 `sources/0456__everget-tradingview-pinescript-indicators__litecoin_halving_utc_countdown.pine`
- v5 `sources/0460__everget-tradingview-pinescript-indicators__utc_clock.pine`
- v6 `sources/0455__deepentropy-oakscriptJS__Session-Sweeps-LuxAlgo-.pine`

Those rows use time/countdown/session-clock modulo. Re-running the same fix-on
tree and the same fix-off tree produced different hashes, so they are
nondeterministic payload rows rather than stable evidence of a modulo semantic
delta.

Measured acceptance impact from negative modulo is `0` output-boundary rows.
Measured stable visible-payload impact on the standard synthetic corpus window
is `5` rows. That does not replace the earlier static exposure count from
`operator-negative-modulo-fix-v1.md`: `165` rows have at least one syntactically
negative-capable operand and `78` more have unknown operand sign. The dynamic
pass only says the standard bars/output window surfaced five stable visible
payload differences.

Instrument note: a naive `%` substring pass is unusable. It collects percent
signs in strings/comments and time-derived payload noise. The number above uses
parsed AST modulo sites and both-side stability controls.

## Manual Evidence

The invalid-operand refusal follows the documented operator type rules already
recorded in `operator-invalid-operand-fix-v1.md`: arithmetic operators require
numeric operands except that `+` can concatenate two strings; ordered
comparisons require numeric operands; equality/inequality preserve legal
non-numeric comparisons; logical operands must be bool subject to existing
version rules.

The modulo value fix follows the v5/v6 operator pages, which specify modulo as
`a - b * math.floor(a / b)`. Do not reuse that nearby floor formula for `/`; the
compile-evidence queue explicitly calls out that trap for legacy const-int
division.

## Verdict

- Negative modulo: no acceptance losses, but five stable visible payload rows
  changed under the standard synthetic corpus window. This was a documented
  wrong-value fix, not an acceptance fix.
- Invalid operands: two clean produced-output losses are intentional refusals
  of malformed double-plus string expressions.
- Parser recovery: the three previously suspected v5 losses are recovered by
  `9809d486d9` and must not be published as fallout or intentional refusals.
- No unattributed regression remains on this combined tree.

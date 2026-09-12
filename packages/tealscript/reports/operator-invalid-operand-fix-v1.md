# Operator Invalid Operand Refusal Fix v1

Date: 2026-09-12  
Branch: `tealscript-runtime`

## Verdict

Real defect class fixed: operator validation allowed JavaScript-style operand
coercions where Pine requires semantic refusal.

The cluster is tight, not broad: string and other non-numeric operands leaked
through arithmetic, ordered-comparison, logical, and unary operator paths. The
existing checker already covered numeric-to-bool version rules and
bool-to-number arithmetic; the missing rule was the general operator operand
compatibility check.

## Documentation Basis

- TradingView v6 operators documentation says arithmetic operators require
  numerical operands, except `+` can concatenate two strings.
- TradingView v6 operators documentation says ordered comparisons require
  numerical operands, while equality and inequality can compare non-numeric
  fundamental values.
- TradingView v6 type-system/operator rules reject implicit non-bool values in
  logical contexts; TealScript keeps the existing version rule that v3-v5
  numeric-to-bool behavior is legacy-accepted.

This makes `"5" - 2`, `"price: " + close`, `"b" > "a"`,
`color.red > color.blue`, and `close > open and "yes"` semantic errors rather
than JavaScript coercions.

## Red-First Evidence

Added four discriminating value vectors before the fix:

- `language.operator-rejects-string-arithmetic`
- `language.operator-rejects-string-number-plus`
- `language.operator-rejects-ordered-string-comparison`
- `language.operator-rejects-non-bool-logical-v6`

Pre-fix vector run:

- `cases`: 997
- `compiledMatches`: 992
- `publicPathMatches`: 992
- unexpected failures: the four vectors above
- expected failure: `strategy.calc-on-order-fills-values`

Each vector discriminates against JavaScript behavior: JavaScript would coerce
or truth-test the operand and continue, while Pine must refuse.

## Blast Radius Measurement

First measurement was discarded as an instrument artifact: it reported 121 rows
because the classifier treated boolean-returning TA predicates such as
`ta.crossover()` and `ta.rising()` as floats.

Corrected measurement reused the known TA return families and chart/syminfo
member types, and excluded scripts the current semantic checker already
diagnosed. Scope: produced-output v5/v6 rows from the committed external corpus
reports that were readable in the local cache.

- measured rows: 1,091
- skipped because current checker already diagnosed them: 28
- newly diagnosed rows under the proposed rule: 10
- findings: 15
- by version: v5 = 2 findings, v6 = 13 findings

Rows newly refusing under the dry-run classifier:

- `0285:https://github.com/webcrack4/pine-script-combine:33VPLuxAlgo.pine`
  - v5, `string - string`
- `0417:https://github.com/Moustaphasow01/TV_Automation:tradingview/volume_profile.pine`
  - v5, `string - string`
- `0915:https://github.com/Jmoney1214/Market-Insight-Engine:tools/pine/morning_scan_strategy.pine`
  - v6, `bool and string`
- `0996:https://github.com/deepentropy/oakscriptJS:docs/official/libraries/TradingView/Strategy-v5.pine`
  - v6, `string - string`
- `0098:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/coverage-vars-consts.pine`
  - v6, `string + float`
- `0121:https://github.com/duclongho/RichTradingBot:TradingView/RichToolScaping.pine`
  - v6, `string - string`
- `0219:https://github.com/regalouisei/collect-tradingview:pinescript/volatility/tasc-202603-one-percent-a-week.pine`
  - v6, three `bool and string` findings
- `0220:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/tasc-202603-one-percent-a-week.pine`
  - v6, three `bool and string` findings
- `0221:https://github.com/n8rzz/trading-view-indicators:opening-range-breakout-with-opportunity-window.pine`
  - v6, two `not string` findings
- `0396:https://github.com/Focal-QuantAI/QuantAI-Blog:strategies/vwap_volatility_bands_boswaves/dsV9tixIZjRr9a8RPGRI_code.pine`
  - v6, `string or bool`

The fast corpus gate remained green; it is a sentinel set, not a full corpus
census, so the row list above is the attribution for the dry-run blast-radius
measurement.

## Implementation

Added one shared semantic checker path:

- binary arithmetic: numeric/numeric, plus string/string for `+`
- ordered comparisons: numeric/numeric
- equality/inequality: unchanged, preserving legal non-numeric comparisons
- logical operators: bool/bool, preserving legacy numeric-to-bool by declared
  version
- unary `+`/`-`: numeric only
- unary `not`: bool, preserving legacy numeric-to-bool by declared version

Class checks added:

- string arithmetic
- mixed string/numeric `+`
- ordered string comparison
- ordered color comparison
- logical bool/string
- unary string negation
- legal string equality remains accepted

## Gates

- Value vectors: `996` cases, `995` matches, only expected red
  `strategy.calc-on-order-fills-values`
- Checker focused suite: `src/semantic/checker.test.ts`, `420` tests passed
- Corpus fast gate: `12` rows, `12` output rows, `12` achievable output rows
- Corpus refusal gate: `6` rows, `6` expected refusals, `0` output rows
- Lint: `0` errors, `22` pre-existing warnings
- Typecheck: passed in `2:52.83` wall time with no diagnostics after merging parity

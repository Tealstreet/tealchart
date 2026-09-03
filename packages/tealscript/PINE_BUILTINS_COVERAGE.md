# Pine Built-In Coverage

This file is the Epic 5 phase-1 inventory for Pine Script v6 built-in parity.
It is not a claim of full parity. It records local TealScript runtime
registrations, the official source links used for audit work, and the owner
epic for each namespace so built-in gaps are tracked instead of discovered
ad hoc.

## Sources

- [TradingView Pine Script v6 Reference Manual](https://www.tradingview.com/pine-script-reference/v6/)
- [Built-ins](https://www.tradingview.com/pine-script-docs/language/built-ins/)
- [Type system](https://www.tradingview.com/pine-script-docs/language/type-system/)
- [Time series](https://www.tradingview.com/pine-script-docs/language/time-series/)
- [Execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## Local Inventory Method

The local count is generated from runtime registrations in:

- `src/runtime/engine.ts`
- `src/runtime/builtins/drawings.ts`

Extraction pattern:

```text
builtins.set("...")
this.builtins.set("...")
```

Last audited: 2026-08-30

Local runtime registrations: 429

## Namespace Coverage

| Namespace | Local registrations | Status | Follow-up |
| --- | ---: | --- | --- |
| `(global)` | 23 | Partial | Epic 5 global helpers, Epic 10 visuals, Epic 13 alerts |
| `adjustment` | 3 | Partial | Epic 9 ticker and request data |
| `alert` | 3 | Partial | Epic 13 alerts |
| `array` | 56 | Partial | Epic 12 collections |
| `backadjustment` | 3 | Partial | Epic 9 ticker and request data |
| `barmerge` | 4 | Partial | Epic 8 request data |
| `box` | 31 | Partial | Epic 11 drawing objects |
| `chart` | 5 | Partial | Epic 11 drawing objects |
| `color` | 7 | Partial | Epic 5 `color.*` pass |
| `dayofweek` | 7 | Partial | Epic 7 time and sessions |
| `hline` | 3 | Partial | Epic 10 visuals |
| `input` | 12 | Partial | Epic 6 inputs |
| `label` | 25 | Partial | Epic 11 drawing objects |
| `line` | 20 | Partial | Epic 11 drawing objects |
| `linefill` | 6 | Partial | Epic 11 drawing objects |
| `log` | 3 | Partial | Epic 13 alerts and logs |
| `map` | 11 | Partial | Epic 12 collections |
| `math` | 28 | Partial | Epic 5 `math.*` pass |
| `matrix` | 34 | Partial | Epic 12 collections |
| `plot` | 10 | Partial | Epic 10 visuals |
| `polyline` | 4 | Partial | Epic 11 drawing objects |
| `runtime` | 1 | Partial | Epic 2 and Epic 13 runtime errors/logs |
| `session` | 2 | Partial | Epic 7 time and sessions |
| `settlement_as_close` | 3 | Partial | Epic 9 ticker and request data |
| `str` | 18 | Partial | Epic 5 `str.*` pass |
| `strategy` | 95 | Partial | Epic 14 strategy broker emulator; foundation signatures and compiled parity |
| `ta` | 56 | Partial | Epic 5 `ta.*` pass |
| `table` | 8 | Partial | Epic 11 drawing objects |
| `ticker` | 9 | Partial | Epic 9 ticker and request data |
| `timeframe` | 3 | Partial | Epic 7 time and sessions |

## Epic 5 Audit Targets

Epic 5 is limited to the common standard-library namespaces that unblock a
large share of public indicators. Namespaces listed below should move from
approximate coverage to tested Pine-compatible behavior.

| Namespace | Current local surface | Main gaps to audit |
| --- | --- | --- |
| `ta.*` | 56 registrations covering moving averages, oscillators, pivots, ranges, tuples, and volume helpers | Exact `na` handling, warmup lengths, tuple return shapes, source defaults, oscillator variants, smoothing variants, edge-case parity |
| `math.*` | 28 registrations covering constants, numeric operators, rounding, trig, logs, random, and mintick rounding | Overloads, integer vs float return behavior, deterministic random semantics, `na` propagation, mintick rounding exactness |
| `str.*` | 18 registrations covering search, replace, split, case, formatting, conversion, and trimming | `str.tonumber`, `str.format_time`, placeholder compatibility, Unicode and escape handling, exact `na` conversion behavior |
| `color.*` | 7 registrations covering RGB construction, channel extraction, transparency, and gradients | Channel precision and theme-sensitive behavior where possible |
| Global helpers | 23 mixed global registrations including casts, `na`, `nz`, `fixnan`, time helpers, and visual functions | Typed casts, `na`/`nz`/`fixnan` parity across types, and separation of visual/data helpers into later epics |

## Task 13 Namespace Diff

Reference source: TradingView Pine Script v6 Reference Manual and Built-ins
manual pages. The official reference is client-rendered, so the 2026-08-30
diff used the official manual URLs plus a raw TradingView-reference mirror as
an extraction aid, then checked candidates against local runtime, semantic, and
compiled registrations.

| Namespace | v6 reference candidates audited | Local result | Ranked gaps |
| --- | --- | --- | --- |
| `math.*` | `abs`, `avg`, `ceil`, `cos`, `exp`, `floor`, `log`, `log10`, `max`, `min`, `pow`, `random`, `round`, `round_to_mintick`, `sign`, `sin`, `sqrt`, `sum`, `tan`, `todegrees`, `toradians` plus constants | Covered by runtime/checker/codegen through `math.*` and legacy global aliases | 1. Exact overload/qualifier return behavior; 2. `math.random()` seed/session parity; 3. edge-case `na` propagation |
| `str.*` | `contains`, `format`, `format_time`, `length`, `lower`, `match`, `pos`, `repeat`, `replace`, `replace_all`, `split`, `startswith`, `substring`, `tonumber`, `tostring`, `trim`, `upper` | Covered by runtime/checker/codegen; TealScript also covers `str.endswith` | 1. Placeholder compatibility across mixed numeric/string inputs; 2. Unicode and escape edge behavior; 3. `na` conversion details |
| `ta.*` | `accdist`, `alma`, `atr`, `barssince`, `bb`, `bbw`, `cci`, `change`, `cmo`, `cog`, `cross`, `crossover`, `crossunder`, `cum`, `dev`, `dmi`, `ema`, `falling`, `highest`, `highestbars`, `iii`, `kc`, `kcw`, `lowest`, `lowestbars`, `macd`, `mfi`, `nvi`, `obv`, `pivot_point_levels`, `pivothigh`, `pivotlow`, `pvi`, `pvt`, `range`, `rising`, `rma`, `rsi`, `sar`, `sma`, `stdev`, `stoch`, `supertrend`, `swma`, `tr`, `tsi`, `valuewhen`, `vwap`, `vwma`, `wad`, `wma`, `wpr`, `wvad` | Broadly covered by runtime/checker/codegen, including additional common local entries such as `adx`, `correlation`, `covariance`, `dema`, `hma`, `kst`, `linreg`, `median`, `mode`, `mom`, percentile helpers, `rci`, `roc`, `smma`, `tema`, and `variance` | 1. Exact warmup/`na` parity for covered TA state machines; 2. source-default and series-length qualifier edge cases |

## Task 15 Executable Reference Coverage

`src/compat/pineV6BuiltinReference.ts` now records v6 reference name data for
`ta`, `math`, `str`, `array`, `matrix`, `map`, `request`, `ticker`,
`timeframe`, `session`, `syminfo`, `chart`, `color`, `box`, `line`, `label`,
`table`, `polyline`, `linefill`, and `strategy`.

`src/semantic/checker.test.ts` asserts every listed name resolves through the
semantic checker's own builtin/signature/context-member tables unless the name
is present in `PINE_V6_KNOWN_MISSING_BUILTINS`. No v6 reference builtin names
are currently allowlisted as missing.

Current `math.*` progress:

- Common scalar helpers support Pine-style named arguments, including
  `number=`, `base=`, `exponent=`, and `precision=`.
- Variadic `math.max()`, `math.min()`, and `math.avg()` support Pine-style
  `number0=`, `number1=`, and later `numberN=` arguments.
- `math.round_to_mintick()` normalizes floating-point residue to the symbol
  tick precision and supports Pine-style `number=` named arguments.
- `math.sum()` supports `source=` and `length=` named arguments while preserving
  the existing latest non-`na` window behavior.
- `math.random()` already supports named `min=`, `max=`, and `seed=`.

Current `ta.*` progress:

- Common `ta.*` helpers accept Pine-style named arguments for covered
  parameters.
- `ta.accdist` is available as a variable-only cumulative A/D series in both
  interpreter and compiled execution, with history and callable-use diagnostics
  matching the other TA variables.
- A table-driven compiled/interpreter warmup sweep covers 64 implemented `ta.*`
  state-machine and variable rows with explicit first-valid-bar expectations.
  The sweep fixed `ta.adx(5)` so the interpreter applies the same
  `adxSmoothing=14` default as the compiled path.
- Event and cross helpers accept Pine-style named arguments for covered
  `condition`/`source` parameters and cross helper `source1`/`source2`
  parameters.
- `ta.highest`, `ta.lowest`, `ta.highestbars`, and `ta.lowestbars` support the
  one-argument default-source forms, including compiled coverage for the
  extrema helpers and offset helpers. Compiled `ta.highest()`/`ta.lowest()`
  skip early `na` source values like the interpreter.
- Common windowed helpers now track derived source expressions such as
  `ta.sma(close - open, length)` using call-local history instead of falling
  back to chart `close`.
- Compiled indexed TA call results such as `ta.sma(source, length)[1]` keep
  call-site history and match interpreter output inside UDF chains.
- Stateful `ta.*` calls nested through UDF helper graphs keep call-chain-local
  history in both interpreter and compiled execution.
- The compiled runtime binds mixed `source=..., length` calls for common
  source/length helpers through the same ordered argument rule as the
  interpreter.
- `ta.stdev` and `ta.variance` support the `biased` parameter.
- `ta.ema` and `ta.rma` use stable call-site state for recursive smoothing.
- `ta.dmi`, `ta.sar`, `ta.pivothigh`, `ta.pivotlow`, and `ta.linreg`
  accept Pine-style named arguments; pivot helpers also support default-source
  two-argument forms.
- `ta.vwap()` covers default-source, source, anchored, and `stdev_mult` band
  tuple forms; a source-linked public anchored VWAP band checkpoint locks the
  common channel-overlay idiom in the offline corpus.
- A source-linked public Supertrend signal checkpoint locks the common
  `ta.supertrend()` direction-routing idiom over deterministic bars.
- A source-linked public ADX/DMI trend-strength checkpoint locks the common
  `ta.dmi()` directional-line and ADX-threshold routing idiom over deterministic
  bars.
- A source-linked public Parabolic SAR reversal checkpoint locks the common
  `ta.sar()` acceleration-input and reversal-state routing idiom over
  deterministic bars.
- A source-linked public linear-regression channel checkpoint locks the common
  `ta.linreg()` basis/deviation-band and slope-routing idiom over deterministic
  bars.
- A source-linked public Keltner Channel signal checkpoint locks the common
  `ta.kc()`/`ta.kcw()` basis/band/width and channel-regime routing idiom over
  deterministic OHLC bars.
- A source-linked public Donchian Channel signal checkpoint locks common
  `ta.highest()`/`ta.lowest()` bands plus `ta.highestbars()`/`ta.lowestbars()`
  offset-state routing over deterministic OHLC bars.
- A source-linked public range trend-filter checkpoint locks common
  `ta.range()`, `ta.rising()`, and `ta.falling()` breakout-filter routing over
  deterministic close-series bars.
- A source-linked public event-memory signal checkpoint locks common
  `ta.barssince()`/`ta.valuewhen()` trigger-memory routing over deterministic
  close-series bars.
- A source-linked public moving-average ribbon checkpoint locks common
  `ta.vwma()`, `ta.wma()`, `ta.alma()`, and `ta.hma()` overlay/ribbon routing
  over deterministic OHLCV bars.
- The compiled runtime accepts `ta.hma()` with static length arguments and has
  interpreter-parity coverage for the TA class and full compiled execution path.
- The compiled runtime parity sweep includes active `ta.atr()` coverage against
  the interpreter, with matching TA-class coverage for first-bar true range and
  RMA seeding behavior.
- The compiled runtime accepts `ta.swma()` and `ta.alma()` with static
  constructor arguments and has interpreter-parity coverage for both TA classes
  and full compiled execution output.
- The compiled runtime accepts `ta.cci()`, `ta.cmo()`, and `ta.wpr()` with
  static and default length arguments and has interpreter-parity coverage for
  the TA classes plus positional, mixed, and default full compiled execution
  output.
- The compiled runtime accepts `ta.smma()` and `ta.vwma()` with static length
  arguments and has interpreter-parity coverage for the reused RMA state, VWMA
  class, and full compiled execution output.
- The compiled runtime accepts `ta.cross()` and has interpreter-parity coverage
  for either-direction threshold crossing behavior in the TA class and full
  compiled execution output.
- The compiled runtime accepts `ta.range()`, `ta.rising()`, and `ta.falling()`
  with static length arguments and has interpreter-parity coverage for the TA
  classes and full compiled execution output.
- The compiled runtime accepts `ta.highestbars()` and `ta.lowestbars()` with
  static length arguments, including Pine shorthand defaults to high/low, and
  has interpreter-parity coverage for the TA classes and full compiled
  execution output.
- The compiled runtime accepts `ta.highest()` and `ta.lowest()` with explicit
  sources, default high/low sources, named length, mixed named-source static
  length forms, and interpreter-matching early `na` handling.
- The compiled runtime accepts element-wise `ta.max()` and `ta.min()` calls with
  interpreter-parity coverage for positional, named, and mixed source arguments.
- The compiled runtime accepts `ta.variance()` and `ta.dev()` with static
  length arguments, including static `biased=false` variance, and has
  interpreter-parity coverage for the TA classes and full compiled execution
  output.
- The compiled runtime accepts `ta.covariance()` and `ta.correlation()` with
  static length arguments and has interpreter-parity coverage for paired source
  windows, including flat-correlation `na` output.
- The compiled runtime accepts `ta.cog()` with static length arguments and has
  interpreter-parity coverage for source and derived-source compiled execution
  output.
- The compiled runtime accepts `ta.median()` and `ta.mode()` with static length
  arguments and has interpreter-parity coverage for odd/even median windows,
  derived-source median, and mode tie behavior.
- The compiled runtime accepts `ta.percentile_nearest_rank()`,
  `ta.percentile_linear_interpolation()`, and `ta.percentrank()` with static
  arguments and has interpreter-parity coverage for the TA classes and full
  compiled execution output.
- The compiled runtime accepts `ta.linreg()` with static length/offset
  arguments and has interpreter-parity coverage for offset and derived-source
  regression through the TA class and full compiled execution output.
- The compiled runtime accepts `ta.tr()` with static `handle_na` arguments and
  has interpreter-parity coverage for handle-na and strict prior-close behavior.
- The compiled runtime accepts `ta.mfi()` with static length arguments and has
  interpreter-parity coverage for positional, named, mixed, and derived-source
  money-flow calls.
- The compiled runtime accepts `ta.tsi()` with static short/long length
  arguments and has interpreter-parity coverage for positional, named, mixed,
  and derived-source double-smoothing calls.
- The compiled runtime accepts `ta.barssince()` and `ta.valuewhen()` with static
  occurrence arguments and has interpreter-parity coverage for positional,
  named, and mixed event-memory calls.
- The compiled runtime accepts `ta.bbw()` with static length/multiplier
  arguments and has interpreter-parity coverage for positional, named, and mixed
  Bollinger Band width calls.
- The compiled runtime accepts `ta.kc()` and `ta.kcw()` with static
  length/multiplier/useTrueRange arguments and has interpreter-parity coverage
  for tuple destructuring, width output, named calls, and mixed calls.
- The compiled runtime accepts `ta.dmi()` and `ta.adx()` with static
  diLength/adxSmoothing arguments and has interpreter-parity coverage for tuple
  destructuring, scalar ADX output, named calls, mixed calls, and ADX's
  one-argument smoothing default.
- The compiled runtime accepts `ta.supertrend()` with static factor/atrPeriod
  arguments and has interpreter-parity coverage for tuple destructuring,
  positional calls, named calls, and mixed calls.
- The compiled runtime accepts `ta.sar()` with static start/inc/max arguments
  and has interpreter-parity coverage for positional, named, and mixed calls.
- The compiled runtime accepts `ta.kst()` with static ROC, smoothing, and signal
  lengths and has interpreter-parity coverage for tuple destructuring,
  positional calls, named calls, mixed calls, and default length arguments.
- The compiled runtime accepts `ta.vwap()` scalar and `stdev_mult` band tuple
  overloads with interpreter-parity coverage for default source, explicit
  source, anchored resets, named calls, and mixed calls.
- The compiled runtime accepts `ta.rci()` with static length arguments and has
  interpreter-parity coverage for positional, named, mixed, and derived-source
  rank-correlation calls.
- The compiled runtime accepts `ta.pivothigh()` and `ta.pivotlow()` with static
  left/right arguments and has interpreter-parity coverage for explicit,
  default-source, named, and mixed source calls.
- The compiled runtime accepts default-length and mixed named-source
  `ta.mom()` / `ta.roc()` calls and has interpreter-parity coverage for those
  call forms.
- A source-linked public percentile-rank signal checkpoint locks common
  `ta.percentile_nearest_rank()`, `ta.percentile_linear_interpolation()`, and
  `ta.percentrank()` regime routing over deterministic close-series bars.
- A source-linked public stochastic signal checkpoint locks the common
  `ta.stoch()` K/D smoothing and overbought/oversold signal-routing idiom over
  deterministic bars.
- A source-linked public MFI signal checkpoint locks the common `ta.mfi()`
  threshold-routing idiom over deterministic volume bars.
- A source-linked public CCI signal checkpoint locks the common `ta.cci()`
  threshold-routing idiom over deterministic typical-price bars.
- A source-linked public CMO signal checkpoint locks the common `ta.cmo()`
  threshold-routing idiom over deterministic close-series bars.
- A source-linked public TSI signal checkpoint locks the common `ta.tsi()`
  signal-line routing idiom over deterministic close-series bars.
- A source-linked public ROC signal checkpoint locks the common `ta.roc()`
  threshold-routing idiom over deterministic close-series bars.
- A source-linked public Momentum signal checkpoint locks the common `ta.mom()`
  threshold-routing idiom over deterministic close-series bars.
- A source-linked public Williams %R signal checkpoint locks the common
  `ta.wpr()` threshold-routing idiom over deterministic OHLC bars.
- A source-linked public OBV signal checkpoint locks the common `ta.obv`
  cumulative-volume momentum idiom with EMA signal line and rising/falling
  routing over deterministic close/volume bars.
- Tuple-returning TA functions (`ta.bb`, `ta.macd`, `ta.dmi`, `ta.supertrend`,
  `ta.kc`, `ta.vwap` with stdev_mult) now support named member access:
  `bb = ta.bb(close, 20, 2); plot(bb.upper)` is equivalent to tuple
  destructuring. Supported field names: `basis`/`middle`, `upper`, `lower`
  (bb/kc/vwap); `macd`, `signal`, `hist` (macd); `plus`, `minus`, `adx` (dmi);
  `supertrend`, `direction` (supertrend).

Current `str.*` progress:

- `str.tonumber()` uses strict decimal/scientific parsing so JavaScript-only
  forms such as hexadecimal and infinity return `na`.
- Formatting helpers accept Pine-style named arguments for covered conversion
  and time-formatting parameters. `str.format()` supports Pine-style numeric
  placeholder modifiers for decimal masks, integer, currency, and percent
  output.
- Covered string search, substring, split, case, trim, replacement, and repeat
  helpers accept Pine-style named arguments while preserving positional calls.
- `str.format_time()` uses the Pine v6 ISO-style default format and supports
  quoted literals, single date/time tokens, year `y`/`yy`/`yyyy` tokens,
  month-name `MMM`/`MMMM` tokens, weekday-name `E`/`EEEE` tokens, day-of-year
  `D`/`DD`/`DDD` tokens, week-of-year `w`/`ww` and week-of-month `W` tokens,
  fractional-second `S`/`SS`/`SSS` tokens, 12-hour `h`/`hh` and AM/PM `a`
  tokens, timezone-name `z`/`zzzz` tokens, and numeric timezone offsets.

Current `color.*` progress:

- Covered color constructors and channel helpers accept Pine-style named
  arguments.
- Pine v6 named color constants infer as `const color`, and `color.none` maps to
  the runtime's existing invisible/`na` plot color representation.
- Literal `color.new()` and `color.rgb()` transparency values outside Pine's
  0-100 range are diagnosed before runtime, while dynamic values are clamped by
  the runtime color formatter.
- Gradient helpers support named value, bound, and color parameters for common
  public-script idioms.

Current global-helper progress:

- `nz`, `fixnan`, `na`, and primitive casts accept Pine-style named arguments
  for covered parameters.
- v6 bool rejection for `nz` and `fixnan` now applies to named arguments as
  well as positional arguments.

Current `input.*` progress:

- Generic and typed input helpers accept Pine-style `defval=` and `title=`
  named arguments while preserving existing input IDs and metadata.
- Typed input helpers preserve common positional and named metadata, including
  range bounds, steps, options, confirm, display, active, group, inline, and
  tooltip. Invalid typed defaults now fail early.
- `input.source()` registers source metadata and returns host-provided overrides
  when present.
- `indicator(..., shorttitle=...)` is exposed on execution results as
  `indicatorShortTitle` for chart/settings consumers.
- `indicator(..., overlay=..., precision=...)` is exposed on execution results
  as `indicatorOverlay` and `indicatorPrecision`.
- `indicator(..., format=..., scale=...)` is exposed on execution results as
  `indicatorFormat` and `indicatorScale`.
- Advanced `indicator()` declaration settings for timeframe, gap handling,
  object limits, explicit plot z-order, behind-chart mode, calc bars count, and
  dynamic request mode are exposed on execution results.
- Request-family built-ins are inventoried under Epic 8; interpreter and
  compiled execution support direct source-parameter and captured
  computed-expression request wrappers, including root-scope regular values
  referenced by compiled request subprograms.
- Host-provided Pine library imports are not a built-in namespace, but compiled
  execution now supports exported constants, expression/block-bodied pure
  functions, methods, UDT constructors/fields, enum members and `.title()`, and imported
  helpers inside compiled request expression subprograms.
- Ticker-family request IDs are inventoried under Epic 9; in-memory fixtures
  derive Heikin-Ashi bars from the nearest available host context and classify
  other synthetic chart bars as provider-gated unless the host supplies that
  exact request context.

Current `runtime.*` / `log.*` progress:

- `runtime.error()` halts execution with a stable structured `runtime.error`
  payload in interpreter and compiled results, including named
  `message=` calls.
- Compiled logical `and`/`or` short-circuit unreachable `runtime.error()`
  operands with interpreter parity.
- `log.info()`, `log.warning()`, and `log.error()` emit level/bar/message
  outputs without halting execution; compiled formatting matches interpreter
  numeric placeholders such as `{0:#.0}`.
- `tests/compat/pine-external-corpus-classifier.test.ts` measures reduced
  public-style runtime/log idioms inside the external corpus classifier.

## Out-Of-Scope Namespaces For Epic 5

These namespaces are tracked here because they are built-ins, but their parity
work belongs to later epics:

- Epic 6: `input.*`
- Epic 7: `dayofweek.*`, `session.*`, `timeframe.*`, time globals
- Epic 8: `barmerge.*`, request-related behavior
- Epic 9: `ticker.*`, adjustment constants, non-standard chart data
- Epic 10: plot and visual output functions/constants
- Epic 11: `label.*`, `line.*`, `box.*`, `linefill.*`, `polyline.*`,
  `table.*`, `chart.point.*`
- Epic 12: `array.*`, `map.*`, `matrix.*`
- Epic 13: `alert.*`, `log.*`, runtime/logging integration
- Epic 14: `strategy.*`

## Maintenance Rules

- Update this file when a built-in namespace changes status or ownership.
- Use deterministic local bars for behavior tests.
- Reduce official-doc or public Pine idioms into small fixtures instead of
  depending on TradingView or live scripts at test time.
- Do not treat the local registration count as the official Pine count. It is
  only a TealScript implementation inventory.
